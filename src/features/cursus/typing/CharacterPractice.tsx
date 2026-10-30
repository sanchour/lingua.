import { UiText, useUi } from '@/design/i18n/UiText';
// Mandarin's practice input method (5.1-4a): a common word in characters; type each character's
// pinyin (no tones, ü as v), then pick it from the candidates with 1–5, or Space for the first, as
// on a real pinyin keyboard.
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { candidates } from '@/core/typing/lesson';
import type { TypingData } from '@/core/typing/types';
import { recordTyping } from '@/data/typing';
import { Card } from '@/design/primitives';
import { cx } from '@/lib/cx';

const pickWord = (data: TypingData) => {
  const words = data.charWords ?? [];
  return words[Math.floor(Math.pow(Math.random(), 2) * Math.min(words.length, 600))] ?? ['你好', 'ni hao'];
};

export function CharacterPractice({ data, lang }: { data: TypingData; lang: string }) {
  const translateUi = useUi();
  const [word, setWord] = useState(() => pickWord(data));
  const [at, setAt] = useState(0);
  const [buffer, setBuffer] = useState('');
  const [hint, setHint] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const started = useRef({ at: Date.now(), active: 0, last: 0 });
  const state = useRef({ word, at, buffer });
  state.current = { word, at, buffer };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const { word: [chars], at: i, buffer: buf } = state.current;
      const now = performance.now();
      if (started.current.last) started.current.active += Math.min(now - started.current.last, 3000);
      started.current.last = now;
      if (/^[a-z]$/i.test(e.key)) {
        e.preventDefault();
        setBuffer((b) => (b + e.key.toLowerCase()).slice(0, 8));
        setWrong(null);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setBuffer((b) => b.slice(0, -1));
        return;
      }
      const options = candidates(data, buf);
      const n = e.key === ' ' ? 0 : /^[1-5]$/.test(e.key) ? Number(e.key) - 1 : -1;
      if (n < 0 || !buf) return;
      e.preventDefault();
      const picked = options[n];
      if (!picked) return;
      if (picked !== chars[i]) {
        setWrong(picked);
        setBuffer('');
        return;
      }
      setBuffer('');
      setWrong(null);
      if (i + 1 < [...chars].length) setAt(i + 1);
      else {
        setDone((d) => d + 1);
        void recordTyping(lang, started.current.at, started.current.active);
        started.current = { at: Date.now(), active: 0, last: 0 };
        setWord(pickWord(data));
        setAt(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, lang]);

  const [chars, plain] = word;
  const options = buffer ? candidates(data, buffer) : [];
  return (
    <Card className="px-6 py-7">
      <div className="flex items-start gap-4">
        <p lang={lang} className="flex-1 font-serif text-[52px] leading-none">
          {[...chars].map((c, i) => (
            <span key={i} className={cx('rounded-lg px-1', i < at ? 'text-ink-faint' : i === at ? 'bg-accent-soft text-ink' : 'text-ink')}>
              {c}
            </span>
          ))}
        </p>
        <button type="button" onClick={() => setHint((h) => !h)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
          {hint ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />} {hint ? translateUi('Hide pinyin') : translateUi('Show pinyin')}
        </button>
      </div>
      {hint && <p className="mt-2 text-[16px] text-ink-soft">{plain.replace(/v/g, 'ü')}</p>}
      <div className="mt-6 flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-2.5">
        <span className="min-w-16 font-mono text-[18px] text-ink">{buffer || <span className="text-ink-faint"><UiText source={'type pinyin…'} /></span>}</span>
        <span className="flex flex-wrap gap-2" lang={lang}>
          {options.map((c, i) => (
            <span key={c} className={cx('rounded-lg px-2 py-0.5 text-[20px]', i === 0 ? 'bg-accent-soft' : 'bg-sunken')}>
              <span className="mr-1 text-[12px] font-semibold text-ink-faint">{i + 1}</span>
              {c}
            </span>
          ))}
          {buffer && !options.length && <span className="text-[13px] text-ink-faint">No character for “{buffer}” yet: keep typing, or Backspace.</span>}
        </span>
      </div>
      <p className="mt-4 text-[13px] text-ink-faint">
        {wrong ? translateUi('{0} isn’t it: try again.', [wrong]) : translateUi('Type the pinyin without tones (ü is v), then 1–5 to pick, or Space for the first.')}
        {done ? translateUi(' · {0} {1} so far', [done, done === 1 ? 'word' : 'words']) : ''}
      </p>
    </Card>
  );
}
