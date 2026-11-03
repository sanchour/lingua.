import { useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '@/app/context';
import { CEFR_LEVELS } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import { textToChapters } from '@/core/parsers/text';
import { READING_GENRES, READING_GENRE_LABELS } from '@/core/reading/graded';
import type { GeneratedRow } from '@/core/contracts/db';
import type { StoryBody } from '@/core/generate/generate';
import { addText } from '@/data/library';
import { aiBlock } from '@/data/plan';
import { UiText, useUi } from '@/design/i18n/UiText';
import { Button, Select } from '@/design/primitives';
import { GeneratedLabel } from '@/features/generated/GeneratedLabel';
import { generateMaterial } from '@/services/llm/generate';

export function ReadingMaker({ lang }: { lang: string }) {
  const ui = useUi();
  const { settings } = useApp();
  const [genre, setGenre] = useState('story');
  const [level, setLevel] = useState<Cefr>('A1');
  const [topic, setTopic] = useState('');
  const [row, setRow] = useState<GeneratedRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const body = row?.content as StoryBody | undefined;
  const make = async () => {
    setBusy(true); setError(''); setRow(null); setSaved('');
    try { setRow((await generateMaterial({ lang, kind: 'story', level, topic: topic.trim() || undefined, style: `A ${genre} for reading practice. For dialogue, use speaker labels; for message, letter or post use that format. Label all people and events as fictional; never impersonate a real author or present invented history, scholarship, spiritual doctrine or recipes as authoritative.` })).row); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not make the text.'); }
    finally { setBusy(false); }
  };
  const keep = async () => {
    if (!body || !row) return;
    setBusy(true); setError('');
    try { setSaved(await addText({ lang, kind: 'article', source: 'paste', title: body.title, level, chapters: textToChapters(body.text, body.title), readingGenre: genre, readingTopic: topic.trim(), generatedId: row.id })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save the text.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 border-t border-line pt-6"><h2 className="font-serif text-2xl font-semibold"><UiText source="Made by Max" /></h2>
    <p className="max-w-3xl text-sm text-ink-soft"><UiText source="Max writes fiction in your chosen kind and level. Only your request is sent. Generated content is not an authentic source." /></p>
    <fieldset disabled={busy} className="flex items-end gap-4"><Select label={ui('Kind')} value={genre} onChange={(v) => { setGenre(v); setRow(null); }} options={READING_GENRES.map((v) => ({ value: v, label: ui(READING_GENRE_LABELS[v as keyof typeof READING_GENRE_LABELS] ?? v) }))} /><Select label={ui('Target level')} value={level} onChange={(v) => { setLevel(v as Cefr); setRow(null); }} options={CEFR_LEVELS.map((v) => ({ value: v, label: v }))} /><label className="flex-1 text-sm"><UiText source="Topic" /><input maxLength={200} value={topic} onChange={(e) => { setTopic(e.target.value); setRow(null); }} className="mt-2 block w-full rounded-xl border border-line bg-raised p-2" /></label><Button disabled={Boolean(aiBlock(settings, settings.llm.provider))} loading={busy} onClick={() => void make()}><UiText source="Make reading text" /></Button></fieldset>
    {aiBlock(settings, settings.llm.provider) && <p className="text-sm text-ink-faint"><UiText source="Needs Max and a key in Settings › AI." /></p>}
    {row && body && <article className="space-y-4 rounded-2xl border border-line bg-raised p-6"><GeneratedLabel row={row} onReported={() => setRow(null)} /><h3 lang={lang} className="font-serif text-2xl">{body.title}</h3><p lang={lang} dir="auto" className="whitespace-pre-wrap font-serif text-xl leading-relaxed">{body.text}</p><details><summary><UiText source="Translation" /></summary><p className="whitespace-pre-wrap">{body.translation}</p></details>{saved ? <Link className="font-semibold text-accent-text" to={`/codex/read/${saved}`}><UiText source="Read" /></Link> : <Button loading={busy} onClick={() => void keep()}><UiText source="Keep in Codex" /></Button>}</article>}
    {error && <p role="alert" className="text-sm text-accent-text"><UiText source={error} /></p>}
  </section>;
}
