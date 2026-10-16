import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { tokenize } from '@/core/text/tokenizer';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import { fetchOnlineGloss, lookupGlosses } from '@/services/translate/gloss';
import type { GlossInfo } from '@/services/translate/gloss';
import type { WordEngine } from './engine';
import { HoverGloss } from './HoverGloss';

/** Just enough of the reader's word engine for translations (no word states here). */
function glossSource(lang: string, glosses: Map<string, GlossInfo>): WordEngine {
  return {
    gloss: (norm: string) => glosses.get(norm),
    state: () => 0,
    ensureGloss: async (norm: string, surface: string) => {
      const known = glosses.get(norm);
      if (known) return known;
      const text = await fetchOnlineGloss(lang, norm, surface);
      if (!text) return null;
      const info: GlossInfo = { text, source: 'online' };
      glosses.set(norm, info);
      return info;
    },
  } as unknown as WordEngine;
}

/**
 * A sentence with the reader's instant translations: hover a word on a computer, tap it on a phone.
 * Used where Ludus shows sentences in the language being learned.
 */
export function GlossText({ text, lang, className }: { text: string; lang: string; className?: string }) {
  const { pointer } = useLayout();
  const rootRef = useRef<HTMLSpanElement>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const tokens = useMemo(() => tokenize(text, lang), [text, lang]);
  const [engine, setEngine] = useState<WordEngine | null>(null);
  const [tapped, setTapped] = useState<{ el: HTMLElement; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const norms = [...new Set(tokens.filter((t) => t.isWord).map((t) => t.norm!))];
    void lookupGlosses(lang, norms).then((map) => alive && setEngine(glossSource(lang, map)));
    return () => {
      alive = false;
    };
  }, [tokens, lang]);

  useEffect(() => {
    if (!tapped) return;
    const timer = window.setTimeout(() => setTapped(null), 2600);
    const away = () => setTapped(null);
    window.addEventListener('scroll', away, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', away);
    };
  }, [tapped]);

  const tap = async (el: HTMLElement) => {
    if (pointer === 'fine' || !engine) return;
    const norm = el.dataset.n!;
    const info = engine.gloss(norm) ?? (await engine.ensureGloss(norm, el.textContent ?? norm));
    setTapped({ el, text: info?.text ?? 'No translation found' });
  };

  const bubble = tapped && (() => {
    const r = tapped.el.getBoundingClientRect();
    return { left: Math.min(Math.max(10, r.left + r.width / 2 - 120), window.innerWidth - 250), top: Math.max(10, r.top - 46) };
  })();

  return (
    <>
      <span ref={rootRef} lang={lang} className={cx('gloss-text', className)}>
        {tokens.map((t, i) =>
          t.isWord ? (
            <span key={i} className="w" data-n={t.norm} onClick={(e) => void tap(e.currentTarget)}>
              {t.text}
            </span>
          ) : (
            t.text
          ),
        )}
      </span>
      {pointer === 'fine' && <HoverGloss rootRef={rootRef} engine={engine} hoveredRef={hoveredRef} />}
      {tapped &&
        bubble &&
        createPortal(
          <div className="reader-tip" data-visible="1" style={{ transform: `translate3d(${Math.round(bubble.left)}px, ${Math.round(bubble.top)}px, 0)`, maxWidth: 240 }}>
            <span className="reader-tip-text">{tapped.text}</span>
          </div>,
          document.body,
        )}
    </>
  );
}
