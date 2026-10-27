// sandesigning.js: one script tag (or a bookmark) adds Sandesigning to any web app. A small button in a corner opens
// the canvas; its camera captures the page first. Alt Shift D does the same as the button. Options on the tag:
//   data-position="bottom-left"   which corner (default bottom-right)
//   data-launcher="off"           no button: only the keys and window.sandesigning
import { close, isOpen, open } from './index';
import type { OpenOptions } from './index';

const script = document.currentScript as HTMLScriptElement | null;
const base = script?.src ? script.src.replace(/[^/]*$/, '') : './';

declare global {
  interface Window {
    sandesigning?: { open: (o?: OpenOptions) => Promise<unknown>; capture: () => Promise<unknown>; close: () => void; version: string };
  }
}

const start = (capture = false) => open({ base, capture });

if (!window.sandesigning) {
  window.sandesigning = { open: (o) => open({ base, ...o }), capture: () => start(true), close, version: '1' };

  window.addEventListener(
    'keydown',
    (e) => {
      if (!(e.altKey && e.shiftKey && e.code === 'KeyD')) return;
      e.preventDefault();
      if (isOpen()) close();
      else void start();
    },
    true,
  );

  if (script?.dataset.launcher !== 'off') {
    const host = document.createElement('div');
    host.setAttribute('data-sandesigning', 'launcher');
    const corner = script?.dataset.position === 'bottom-left' ? 'left:14px' : 'right:14px';
    host.style.cssText = `position:fixed;bottom:14px;${corner};z-index:2147482999;`;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host { all: initial; }
      .l { display: flex; gap: 2px; padding: 3px; border-radius: 99px; background: #18181b; box-shadow: 0 6px 20px rgba(0,0,0,.25); opacity: .55; transition: opacity .15s; font: 600 12px system-ui, sans-serif; }
      .l:hover, .l:focus-within { opacity: 1; }
      button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 99px; color: #fafafa; }
      button:hover { background: #3f3f46; }
      button:focus-visible { outline: 2px solid #818cf8; }
      b { width: 16px; height: 16px; border-radius: 5px; background: linear-gradient(135deg,#6366f1,#ec4899 60%,#f59e0b); display: grid; place-items: center; font-size: 10px; }
      svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    </style><div class="l"><button class="o" title="Open Sandesigning (Alt Shift D)"><b>S</b>Design</button><button class="c" title="Capture this page and draw on it" aria-label="Capture this page"><svg viewBox="0 0 24 24"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/></svg></button></div>`;
    root.querySelector('.o')!.addEventListener('click', () => void start());
    root.querySelector('.c')!.addEventListener('click', () => void start(true));
    const add = () => document.body.appendChild(host);
    if (document.body) add();
    else addEventListener('DOMContentLoaded', add);
  }
  // Loaded from a bookmark: open straight away.
  if (script?.dataset.open !== undefined) void start();
}
