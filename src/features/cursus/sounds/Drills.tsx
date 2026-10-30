import { UiText, useUi } from '@/design/i18n/UiText';
// Drills (6-10): things to say aloud, by what they train (clusters, hard syllables, letter combinations, tongue twisters, and the
// language's own hard spots). A voice says each; "Say these" sends them to Say it, and see it below. "Test me" draws five at random.
import { useState } from 'react';
import { drillsOf, randomTest } from '@/core/sounds/drills';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';

export function Drills({ lang, onSay }: { lang: string; onSay: (words: string[]) => void }) {
  const translateUi = useUi();
  const groups = drillsOf(lang);
  const [id, setId] = useState(groups[0]?.id);
  const group = groups.find((g) => g.id === id) ?? groups[0];
  if (!group) return null;
  return (
    <section aria-labelledby="drills-h" className="rounded-3xl border border-line bg-raised p-5">
      <h2 id="drills-h" className="font-serif text-2xl font-semibold"><UiText source={'Drills'} /></h2>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={translateUi('Drill')}>
        {groups.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={g.id === group.id} onClick={() => setId(g.id)} className={cx('rounded-full border px-3 py-1 text-[13.5px]', g.id === group.id ? 'border-accent bg-accent-soft font-semibold' : 'border-line hover:bg-surface')}>
            {g.title}
          </button>
        ))}
      </div>
      <p className="mt-3 max-w-2xl text-[14px] text-ink-soft">{group.intro}</p>
      <ul className="mt-3 divide-y divide-line">
        {group.items.map((item) => (
          <li key={item.text} className="flex items-center gap-3 py-2">
            <SpeakButton lang={lang} text={item.text} size={18} label={`Hear ${item.text}`} className="size-9 shrink-0 rounded-full bg-sunken text-ink" />
            <span lang={lang} className="font-serif text-[19px]">
              {item.text}
            </span>
            {item.note && <span className="text-[13px] text-ink-faint">{item.note}</span>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onSay(group.items.map((i) => i.text))} className="h-10 rounded-xl bg-inverse px-4 text-[14px] font-semibold text-on-inverse"><UiText source={'Say these'} /></button>
        <button type="button" onClick={() => onSay(randomTest(lang, 5))} title={translateUi('Five at random from all the drills')} className="h-10 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface"><UiText source={'Test me'} /></button>
      </div>
    </section>
  );
}
