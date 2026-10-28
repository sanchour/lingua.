// The Lingua overlay: two subtitle lines over the page's video, built from the subtitle files inject.js saw.
// Hovering a line pauses; a word opens a small card from the open Lingua tab; ← and → step by line; Save puts the word in Lingua's deck.
(() => {
  const P = LinguaParse;
  const state = { lang: null, gloss: 'en', target: null, native: null, targetKey: '', holding: false, card: null };
  const WORD = /[\p{L}\p{M}][\p{L}\p{M}'’-]*/gu;

  const ask = (request) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'lingua:request', payload: request }, (reply) => resolve(chrome.runtime.lastError ? { ok: false, error: 'no-lingua' } : reply || { ok: false, error: 'no-lingua' }));
      } catch {
        resolve({ ok: false, error: 'no-lingua' });
      }
    });

  // Which language is being learned comes from Lingua itself.
  const hello = () =>
    ask({ type: 'hello' }).then((r) => {
      if (r && r.ok && r.lang) {
        state.lang = r.lang;
        state.gloss = r.gloss || 'en';
      }
    });

  const params = (url) => {
    try {
      return new URL(url, location.href).searchParams;
    } catch {
      return new URLSearchParams();
    }
  };

  /** Files that arrive: the learner's language is the target line; English (or the gloss language) is the other. */
  function onCapture(url, body) {
    const cues = P.parseAny(body);
    if (!cues.length) return;
    const q = params(url);
    const lang = (q.get('tlang') || q.get('lang') || '').toLowerCase().split('-')[0];
    const isGloss = q.get('tlang') ? true : lang === state.gloss;
    if (lang && state.lang && lang === state.lang && !q.get('tlang')) {
      state.target = cues;
      state.targetKey = `${q.get('v') || ''}:${lang}`;
      fetchTranslation(url);
      sendCaptions(cues, lang);
    } else if (isGloss) state.native = cues;
    else if (!state.target) state.target = cues;
    else if (!state.native) state.native = cues;
    ensureOverlay();
  }

  /** YouTube translates its own captions: the same address with tlang gives the other line. */
  function fetchTranslation(url) {
    if (!/youtube\.com\/api\/timedtext/.test(url) || state.gloss === state.lang) return;
    const u = new URL(url, location.href);
    u.searchParams.set('tlang', state.gloss);
    u.searchParams.set('fmt', 'json3');
    fetch(u.href, { credentials: 'include' })
      .then((r) => r.text())
      .then((text) => {
        const cues = P.parseAny(text);
        if (cues.length) state.native = cues;
      })
      .catch(() => {});
  }

  /** On YouTube the captions are also handed to Lingua, which keeps them for that video if it is in Visio. */
  function sendCaptions(cues, lang) {
    const id = new URL(location.href).searchParams.get('v');
    if (id && location.hostname.endsWith('youtube.com')) ask({ type: 'captions', youtubeId: id, lang, cues });
  }

  window.addEventListener('message', (e) => {
    if (e.source === window && e.data && e.data.source === 'lingua-ext-subs') onCapture(e.data.url, e.data.body);
  });

  // ── The overlay ──
  let overlay;
  let video;
  const css = `
    .lingua-sub{position:absolute;left:0;right:0;bottom:11%;z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;font:600 clamp(16px,2.2vw,30px)/1.3 "Plus Jakarta Sans",system-ui,sans-serif}
    .lingua-sub span.line{pointer-events:auto;max-width:80%;padding:4px 12px;border-radius:10px;background:rgba(20,18,16,.78);color:#fbf5ea;text-align:center;text-wrap:balance}
    .lingua-sub span.line.native{font-size:.72em;font-weight:500;color:#e3d6c0}
    .lingua-sub .w{cursor:pointer;border-radius:4px}.lingua-sub .w:hover{background:rgba(212,155,84,.45)}
    .lingua-card{position:absolute;left:50%;bottom:calc(11% + 90px);transform:translateX(-50%);z-index:2147483001;max-width:360px;padding:10px 14px;border-radius:14px;background:#fbf5ea;color:#262220;font:500 15px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4);pointer-events:auto}
    .lingua-card b{display:block;font-size:17px}.lingua-card button{margin-top:6px;margin-right:6px;border:0;border-radius:999px;padding:5px 12px;font:600 13px system-ui;background:#3b302a;color:#f8efe0;cursor:pointer}
  `;

  function ensureOverlay() {
    const v = document.querySelector('video');
    if (!v) return;
    if (video !== v || !overlay || !overlay.isConnected) {
      video = v;
      const host = v.closest('#movie_player, [data-uia="video-canvas"], .watch-video') || v.parentElement;
      if (!host) return;
      if (!document.getElementById('lingua-style')) {
        const style = document.createElement('style');
        style.id = 'lingua-style';
        style.textContent = css;
        document.head.appendChild(style);
      }
      overlay = document.createElement('div');
      overlay.className = 'lingua-sub';
      host.appendChild(overlay);
      overlay.addEventListener('mouseenter', hold);
      overlay.addEventListener('mouseleave', release);
      overlay.addEventListener('click', onClick);
      tick();
    }
  }

  const hold = () => {
    if (video && !video.paused) {
      state.holding = true;
      video.pause();
    }
  };
  const release = () => {
    if (state.holding && video && !state.card) {
      state.holding = false;
      void video.play();
    }
  };

  let shown = '';
  function tick() {
    if (!overlay || !overlay.isConnected) return;
    const ms = video.currentTime * 1000;
    const t = state.target && P.lineAt(state.target, ms);
    const n = state.native && P.lineAt(state.native, ms);
    const key = `${t}|${n}|${state.targetKey}`;
    if (key !== shown) {
      shown = key;
      overlay.replaceChildren();
      if (state.target && t >= 0) overlay.appendChild(lineEl(state.target[t].text, 'target'));
      if (state.native && n >= 0) overlay.appendChild(lineEl(state.native[n].text, 'native'));
    }
    requestAnimationFrame(tick);
  }

  function lineEl(text, role) {
    const el = document.createElement('span');
    el.className = `line ${role}`;
    if (role === 'native') {
      el.textContent = text;
      return el;
    }
    let last = 0;
    for (const m of text.matchAll(WORD)) {
      el.append(text.slice(last, m.index));
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = m[0];
      el.appendChild(w);
      last = m.index + m[0].length;
    }
    el.append(text.slice(last));
    return el;
  }

  async function onClick(e) {
    const w = e.target.closest && e.target.closest('.w');
    if (!w) return closeCard();
    e.stopPropagation();
    const sentence = w.parentElement.textContent;
    const reply = await ask({ type: 'lookup', lang: state.lang, word: w.textContent });
    openCard(w.textContent, sentence, reply);
  }

  function closeCard() {
    if (state.card) state.card.remove();
    state.card = null;
    release();
  }

  function openCard(word, sentence, reply) {
    closeCard();
    const card = document.createElement('div');
    card.className = 'lingua-card';
    const title = document.createElement('b');
    title.textContent = word;
    const body = document.createElement('div');
    body.textContent = reply.ok ? reply.gloss || 'No meaning found yet.' : reply.error === 'no-lingua' ? 'Open Lingua in a tab to look words up.' : 'Lingua didn’t answer.';
    card.append(title, body);
    if (reply.ok) {
      const save = document.createElement('button');
      save.textContent = 'Save to deck';
      save.onclick = async () => {
        const r = await ask({ type: 'save', lang: state.lang, word, sentence, gloss: reply.gloss });
        save.textContent = r.ok ? 'Saved' : 'Couldn’t save';
        save.disabled = true;
      };
      card.appendChild(save);
    }
    const close = document.createElement('button');
    close.textContent = 'Close';
    close.onclick = closeCard;
    card.appendChild(close);
    overlay.parentElement.appendChild(card);
    state.card = card;
  }

  // ← and → step by line while there are lines (they would otherwise skip five seconds).
  window.addEventListener(
    'keydown',
    (e) => {
      if (!state.target || !video || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      const to = P.stepTo(state.target, video.currentTime * 1000, e.key === 'ArrowRight' ? 1 : -1);
      if (to === null) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      video.currentTime = to / 1000;
    },
    true,
  );

  void hello();
  new MutationObserver(() => {
    if (state.target && (!overlay || !overlay.isConnected)) ensureOverlay();
  }).observe(document, { childList: true, subtree: true });
})();
