import { UiText, useUi } from '@/design/i18n/UiText';
// Cursus › Sounds (6-10): the sound system of the language on a chart, each sound with real words to hear, and the rules of stress,
// spelling and connected speech. Charts are drawn from the data (core/sounds), in the handbook's fine line.
import { useState } from 'react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { guidance, voicingPartner } from '@/core/sounds/articulation';
import { MANNERS, PLACES, soundSystemOf } from '@/core/sounds';
import type { Consonant, Sound, Tone, Vowel } from '@/core/sounds';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';
import { Drills } from './Drills';
import { Intonation } from './Intonation';
import { MinimalPairs, pairsWith } from './MinimalPairs';
import { MouthDiagram } from './MouthDiagram';
import { PronunciationDiary } from './PronunciationDiary';
import { RecordCompare } from './RecordCompare';
import type { EndExpect } from './RecordCompare';
import { StressDrill } from './StressDrill';

const key = (s: Sound) => `${s.kind}:${s.ipa}`;

function VowelChart({ vowels, chosen, onChoose }: { vowels: Vowel[]; chosen?: string; onChoose: (s: Sound) => void }) {
  const translateUi = useUi();
  // The trapezoid of the mouth: front at the left, close at the top; the back slants in.
  const W = 360;
  const H = 230;
  const y = (v: Vowel) => 30 + (v.height * (H - 60)) / 3;
  // The left edge slants in as the mouth opens, so front vowels follow it.
  const x = (v: Vowel) => {
    const front = 24 + (127 * (y(v) - 18)) / (H - 36) + 20;
    const back = W - 44;
    return front + (v.frontness * (back - front)) / 2;
  };
  // Several vowels can sit at one place (a rounded one beside an unrounded one, a nasal one beside its oral one): spread them a little.
  const seen = new Map<string, number>();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={translateUi('Vowel chart')} className="w-full max-w-md">
      <path d={`M24 18 L${W - 24} 18 L${W - 24} ${H - 18} L${W * 0.42} ${H - 18} Z`} fill="none" stroke="var(--line-strong)" strokeWidth="1.2" />
      <path d={`M${W / 2} 18 L${W * 0.72} ${H - 18}`} fill="none" stroke="var(--line)" strokeDasharray="3 4" />
      {vowels.map((v) => {
        const spot = `${v.frontness}:${v.height}`;
        const n = seen.get(spot) ?? 0;
        seen.set(spot, n + 1);
        const cx0 = x(v) + n * 30 - (vowels.filter((o) => o.frontness === v.frontness && o.height === v.height).length - 1) * 15;
        const on = chosen === key(v);
        return (
          <g key={key(v)} transform={`translate(${cx0} ${y(v)})`} onClick={() => onChoose(v)} className="cursor-pointer" role="button" tabIndex={0} aria-label={translateUi('Vowel {0}', [v.ipa])} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChoose(v)}>
            <circle r="15" fill={on ? 'var(--accent-soft)' : 'var(--surface)'} stroke={on ? 'var(--accent)' : 'var(--line-strong)'} strokeWidth={v.rounded ? 2.4 : 1.2} strokeDasharray={v.nasal ? '3 2' : undefined} />
            <text textAnchor="middle" dominantBaseline="central" fontSize="15" fill="var(--ink)" style={{ fontFamily: 'var(--font-serif)' }}>
              {v.ipa}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ConsonantTable({ consonants, chosen, onChoose }: { consonants: Consonant[]; chosen?: string; onChoose: (s: Sound) => void }) {
  const places = PLACES.filter((p) => consonants.some((c) => c.place === p));
  const manners = MANNERS.filter((m) => consonants.some((c) => c.manner === m));
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-left text-[13px]">
        <thead>
          <tr>
            <th className="p-1.5" />
            {places.map((p) => (
              <th key={p} className="p-1.5 text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {manners.map((m) => (
            <tr key={m} className="border-t border-line/60">
              <th className="p-1.5 pr-3 text-[12px] font-semibold text-ink-faint">{m}</th>
              {places.map((p) => (
                <td key={p} className="p-1 align-middle">
                  <span className="flex flex-wrap gap-1">
                    {consonants
                      .filter((c) => c.place === p && c.manner === m)
                      .sort((a, b) => Number(a.voiced) - Number(b.voiced))
                      .map((c) => (
                        <button
                          key={key(c)}
                          type="button"
                          onClick={() => onChoose(c)}
                          aria-pressed={chosen === key(c)}
                          title={`${c.voiced ? 'voiced' : 'unvoiced'}${c.feature ? ` · ${c.feature}` : ''}`}
                          className={cx('h-8 min-w-8 rounded-lg border px-1.5 font-serif text-[16px] transition-colors', chosen === key(c) ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-sunken', c.voiced && 'font-semibold')}
                        >
                          {c.ipa}
                        </button>
                      ))}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-ink-faint"><UiText source={'Bold: voiced (the throat hums). Plain: unvoiced.'} /></p>
    </div>
  );
}

function ToneCard({ tone, chosen, onChoose }: { tone: Tone; chosen?: string; onChoose: (s: Sound) => void }) {
  const n = tone.contour.length;
  const points = tone.contour.map((level, i) => `${(i * 56) / Math.max(1, n - 1) + 8},${48 - (level - 1) * 10}`).join(' ');
  return (
    <button type="button" onClick={() => onChoose(tone)} aria-pressed={chosen === key(tone)} className={cx('flex w-24 flex-col items-center rounded-2xl border p-2 transition-colors', chosen === key(tone) ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-sunken')}>
      <svg viewBox="0 0 72 56" className="h-12 w-full" aria-hidden>
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-serif text-[22px]">{tone.ipa}</span>
    </button>
  );
}

function Detail({ sound, lang, all, onChoose, onPairs }: { sound: Sound; lang: string; all: Sound[]; onChoose: (s: Sound) => void; onPairs: (ipa: string) => void }) {
  const translateUi = useUi();
  const partner = sound.kind === 'consonant' ? voicingPartner(sound, all) : undefined;
  return (
    <aside aria-label={translateUi('About this sound')} className="rounded-3xl border border-line bg-raised p-5 lg:sticky lg:top-4">
      <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">
        {sound.kind === 'vowel' ? translateUi('{0} vowel{1}{2}{3}', [['front', 'central', 'back'][sound.frontness], sound.rounded ? ', rounded' : '', sound.nasal ? ', nasal' : '', sound.long ? ', long' : '']) : sound.kind === 'tone' ? translateUi('Tone') : `${sound.voiced ? 'voiced' : 'unvoiced'} ${sound.place} ${sound.manner}${sound.feature ? ` · ${sound.feature}` : ''}`}
      </p>
      <p className="mt-1 font-serif text-5xl" lang={lang}>
        {sound.ipa}
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{sound.note}</p>
      <div className="mt-4 flex items-start gap-3">
        <MouthDiagram sound={sound} />
      </div>
      <p className="mt-2 text-[14px] leading-relaxed">{guidance(sound)}</p>
      <p className="mt-1 text-[11.5px] text-ink-faint"><UiText source={'A sketch to think with, not a scan: the real mouth varies from person to person.'} /></p>
      {pairsWith(lang, [sound.ipa]).length > 0 && (
        <button type="button" onClick={() => onPairs(sound.ipa)} className="mt-3 h-10 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface"><UiText source={'Practise pairs with this sound'} /></button>
      )}
      {partner && (
        <p className="mt-3 rounded-xl bg-surface p-3 text-[14px] text-ink-soft"><UiText source={'Same place and manner, other voicing:{0}{1}. Say one, then the other with a hand on your throat: only the {2} hums.'} values={[' ', <button type="button" onClick={() => onChoose(partner)} className="font-serif text-[17px] font-semibold text-ink underline decoration-line-strong underline-offset-4">
            {partner.ipa}
          </button>, sound.kind === 'consonant' && sound.voiced ? 'first' : 'second']} /></p>
      )}
      <ul className="mt-4 divide-y divide-line/60">
        {sound.words.map(([word, meaning]) => (
          <li key={word} className="flex items-center gap-3 py-2">
            <SpeakButton lang={lang} text={word.split(' ')[0]} label={`Hear ${word}`} />
            <span lang={lang} className="font-serif text-[19px] font-semibold">
              {word}
            </span>
            <span className="text-[14px] text-ink-faint">{meaning}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function SoundsTab() {
  const { language } = useApp();
  const lang = language.id;
  const system = soundSystemOf(lang);
  const [chosen, setChosen] = useState<Sound | null>(null);
  const [focus, setFocus] = useState<string[] | null>(null);
  const [practice, setPractice] = useState<string[] | null>(null);
  const [expect, setExpect] = useState<EndExpect | undefined>();
  if (!system) return <p className="text-ink-soft"><UiText source={'Sounds are written for the six core languages.'} /></p>;
  const vowels = system.sounds.filter((s): s is Vowel => s.kind === 'vowel');
  const consonants = system.sounds.filter((s): s is Consonant => s.kind === 'consonant');
  const tones = system.sounds.filter((s): s is Tone => s.kind === 'tone');
  const selected = chosen && system.sounds.some((s) => key(s) === key(chosen)) ? chosen : (tones[0] ?? vowels[0] ?? consonants[0]);
  const name = getLanguage(lang)?.name ?? lang;
  const sayThese = (words: string[], ends?: EndExpect) => (setPractice(words), setExpect(ends), window.setTimeout(() => document.getElementById('say-it')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-10">
        <p className="max-w-2xl text-[15px] leading-relaxed text-ink-soft"><UiText source={'The sounds of {0}, and the rules that decide which one a letter makes. Choose a sound to read about it and hear words with it. What matters first is being understood, not losing your accent.'} values={[name]} /></p>
        {tones.length > 0 && (
          <section aria-labelledby="tones-h">
            <h2 id="tones-h" className="mb-3 font-serif text-2xl font-semibold"><UiText source={'Tones'} /></h2>
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <ToneCard key={key(t)} tone={t} chosen={key(selected)} onChoose={setChosen} />
              ))}
            </div>
          </section>
        )}
        {vowels.length > 0 && (
          <section aria-labelledby="vowels-h">
            <h2 id="vowels-h" className="mb-3 font-serif text-2xl font-semibold"><UiText source={'Vowels'} /></h2>
            <VowelChart vowels={vowels} chosen={key(selected)} onChoose={setChosen} />
            <p className="mt-1 text-[12px] text-ink-faint"><UiText source={'Left to right: front to back. Top to bottom: close to open. A thick ring: lips rounded. Dashed: through the nose.'} /></p>
          </section>
        )}
        {consonants.length > 0 && (
          <section aria-labelledby="consonants-h">
            <h2 id="consonants-h" className="mb-3 font-serif text-2xl font-semibold"><UiText source={'Consonants'} /></h2>
            <ConsonantTable consonants={consonants} chosen={key(selected)} onChoose={setChosen} />
          </section>
        )}
        <section aria-labelledby="rules-h">
          <h2 id="rules-h" className="mb-3 font-serif text-2xl font-semibold"><UiText source={'Stress, spelling and speech'} /></h2>
          <dl className="space-y-4">
            {system.rules.map((r) => (
              <div key={r.title}>
                <dt className="text-[14px] font-bold">{r.title}</dt>
                <dd className="mt-0.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{r.text}</dd>
              </div>
            ))}
          </dl>
        </section>
        <MinimalPairs key={focus?.join() ?? 'all'} lang={lang} focus={focus} onFocus={setFocus} onSay={sayThese} />
        <Drills lang={lang} onSay={sayThese} />
        <Intonation lang={lang} onSay={sayThese} />
        <StressDrill lang={lang} />
        <PronunciationDiary lang={lang} />
        <div id="say-it">
          <RecordCompare key={practice?.join() ?? 'words'} lang={lang} expect={expect} words={practice ?? system.sounds.flatMap((s) => s.words.map(([w]) => w)).filter((w) => /^[\p{L}\p{M}]+$/u.test(w)).slice(0, 12)} />
        </div>
      </div>
      {selected && <Detail key={key(selected)} sound={selected} lang={lang} all={system.sounds} onChoose={setChosen} onPairs={(ipa) => (setFocus([ipa]), document.getElementById('pairs-h')?.scrollIntoView({ block: 'center' }))} />}
    </div>
  );
}
