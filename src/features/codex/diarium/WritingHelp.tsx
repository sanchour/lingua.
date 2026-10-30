import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PHRASE_FUNCTIONS, WRITING_PHRASES } from '@/core/journal/phrases';
import { normalizeWord } from '@/core/text/normalize';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import { useFullEntry } from '@/services/dictionary/fullDict';
import { WordForms } from '../reader/WordForms';

export function WritingHelp({ lang, selected }: { lang: string; selected: string }) {
  const translateUi = useUi();
  const [query, setQuery] = useState('');
  const word = normalizeWord(query.trim() || selected, lang);
  const lemma = useLiveQuery(async () => (await db.dictForms.get([packId(lang), word]))?.lemmas[0] ?? word, [lang, word]);
  const full = useFullEntry(lang, lemma || word);
  const synonyms = [...new Set(full?.entries.flatMap((e) => [...(e.syn ?? []), ...e.senses.flatMap((s) => s.syn ?? [])]) ?? [])].slice(0, 15);
  const phrases = full?.entries.flatMap((e) => e.phrases ?? []).slice(0, 12) ?? [];
  return (
    <aside className="sticky top-6 space-y-5 rounded-xl border border-line bg-surface p-4 text-sm" aria-label={translateUi('Writing help')}>
      <h2 className="font-serif text-xl font-semibold"><UiText source={'While you write'} /></h2>
      <p className="text-xs text-ink-faint"><UiText source={'Select or hover a word in your entry. Or type a word below. Look-ups use only dictionaries already on this device.'} /></p>
      <label className="block font-semibold"><UiText source={'Dictionary word{0}'} values={[<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={selected || translateUi('A word…')} className="mt-2 w-full rounded-xl border border-line bg-raised p-2 font-normal text-ink" />]} /></label>
      {word && <div aria-live="polite" className="space-y-3">
        <h3 lang={lang} className="font-serif text-lg font-semibold">{full?.word || lemma || word}</h3>
        {full === null && <p className="text-xs text-ink-faint"><UiText source={'No full entry on this device. The word may be missing, or its dictionary may need downloading in Thesaurus › Dictionary.'} /></p>}
        {full?.entries.map((e, i) => <p key={i}><span className="text-ink-faint">{e.pos} · </span>{e.senses.slice(0, 2).flatMap((s) => s.g).join('; ')}</p>)}
        <WordForms key={lemma} lang={lang} lemma={lemma || word} seen={word} />
        <h3 className="font-semibold"><UiText source={'Synonyms'} /></h3><p lang={lang}>{synonyms.join(' · ') || 'None listed in this entry.'}</p>
        <h3 className="font-semibold"><UiText source={'Phrases and collocations'} /></h3>
        {phrases.length ? <ul className="space-y-2">{phrases.map(([p, gloss]) => <li key={p}><span lang={lang}>{p}</span>{gloss && <span className="text-ink-faint"> · {gloss}</span>}</li>)}</ul> : <p className="text-ink-faint"><UiText source={'None listed in this entry.'} /></p>}
      </div>}
      <details><summary className="cursor-pointer font-semibold"><UiText source={'Phrase bank'} /></summary>
        {WRITING_PHRASES[lang] ? <dl className="mt-3 space-y-3">{WRITING_PHRASES[lang].map((phrase, i) => <div key={phrase}><dt className="text-xs text-ink-faint">{PHRASE_FUNCTIONS[i]}</dt><dd lang={lang} dir={lang === 'ar' ? 'rtl' : undefined} className="mt-1 font-serif text-base">{phrase}</dd></div>)}</dl> : <p className="mt-3 text-ink-faint"><UiText source={'The phrase bank covers Spanish, French, German, Russian, Arabic and Mandarin.'} /></p>}
      </details>
      <p className="text-xs text-ink-faint"><UiText source={'A dedicated spellchecker has not been added.'} /></p>
    </aside>
  );
}
