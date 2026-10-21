import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { BookmarkPlus, Check, Copy, X } from 'lucide-react';
import { savePhrase } from '@/data/phrases';
import type { PhraseContext } from '@/data/phrases';
import { usePortalRoot } from '@/design/hooks/usePortalRoot';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { translatePhrase } from '@/services/translate/phrase';
import type { PhraseTranslation } from '@/services/translate/phrase';
import { toast } from '@/state/ui';
import { SpeakButton } from '@/features/speech/SpeakButton';

export interface Phrase {
  text: string;
  /** The last selected word, to place the bubble by. */
  anchor: HTMLElement;
  context: PhraseContext;
}

/** The translation of a selected phrase, with Save as a card and Copy. */
export function PhraseBubble({ phrase, lang, onClose }: { phrase: Phrase; lang: string; onClose: () => void }) {
  const portalRoot = usePortalRoot();
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<PhraseTranslation | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let alive = true;
    setResult(undefined);
    void translatePhrase(lang, phrase.text, phrase.context.sentence).then((r) => alive && setResult(r));
    return () => {
      alive = false;
    };
  }, [lang, phrase]);

  useLayoutEffect(() => {
    const bubble = ref.current;
    if (!bubble) return;
    const r = phrase.anchor.getBoundingClientRect();
    const w = bubble.offsetWidth;
    const h = bubble.offsetHeight;
    const x = Math.min(Math.max(10, r.left + r.width / 2 - w / 2), window.innerWidth - w - 10);
    const below = r.bottom + h + 14 < window.innerHeight;
    setPos({ x, y: below ? r.bottom + 10 : Math.max(10, r.top - h - 10) });
  }, [phrase, result]);

  useEffect(() => {
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [onClose]);

  const action = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-on-inverse/10 disabled:opacity-50';
  return createPortal(
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Translation of the selection"
      className="no-callout fixed top-0 left-0 z-[70] w-[min(380px,calc(100vw-20px))] rounded-2xl bg-inverse p-3.5 text-on-inverse shadow-elev-3"
      style={{ x: pos?.x ?? -9999, y: pos?.y ?? -9999 }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: pos ? 1 : 0, scale: 1 }}
      transition={spring.snappy}
    >
      <div className="flex items-start gap-2">
        <p lang={lang} className="line-clamp-3 min-w-0 flex-1 text-[14px] leading-snug opacity-75">
          {phrase.text}
        </p>
        <button type="button" aria-label="Close" onClick={onClose} className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full hover:bg-on-inverse/10">
          <X size={16} aria-hidden />
        </button>
      </div>
      <p className={cx('mt-2 text-[16.5px] leading-snug font-semibold', result === undefined && 'animate-pulse opacity-60')}>
        {result === undefined ? 'Translating…' : (result?.text ?? 'No translation came back. Check the connection.')}
      </p>
      <div className="mt-3 -mb-1 flex flex-wrap gap-1">
        <button
          type="button"
          disabled={!result || saved}
          className={action}
          onClick={async () => {
            if (!result) return;
            const added = await savePhrase(lang, phrase.text, result.text, phrase.context);
            setSaved(true);
            toast(added ? 'Saved to “From my reading”.' : 'That phrase is already in your deck.', { tone: added ? 'success' : 'default' });
          }}
        >
          {saved ? <Check size={15} aria-hidden /> : <BookmarkPlus size={15} aria-hidden />} {saved ? 'Saved' : 'Save as a card'}
        </button>
        <button
          type="button"
          className={action}
          onClick={() => {
            void navigator.clipboard?.writeText(result ? `${phrase.text}\n${result.text}` : phrase.text).then(() => toast('Copied.'));
          }}
        >
          <Copy size={15} aria-hidden /> Copy
        </button>
        <SpeakButton lang={lang} text={phrase.text} size={15} label="Hear it" className="ml-auto size-8 hover:bg-on-inverse/10" />
      </div>
    </motion.div>,
    portalRoot,
  );
}
