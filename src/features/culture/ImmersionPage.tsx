import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '@/app/context';
import { CEFR_LEVELS } from '@/core/lang/levels';
import { immersionPrompts, MEDIA_KINDS } from '@/core/culture/immersion';
import type { ImmersionMediaKind } from '@/core/culture/immersion';
import { youtubeId } from '@/services/cantus/youtube';
import { addVideoLink } from '@/services/visio/files';
import { createEntry } from '@/data/journal';
import { immersionList, updateImmersion } from '@/data/immersion';
import type { ImmersionAction } from '@/data/immersion';
import { useMediaList } from '@/data/media';
import { Button, Select } from '@/design/primitives';
import { toast } from '@/state/ui';
import { ReferenceButton } from './ReferenceHelp';
const LABELS: Record<ImmersionMediaKind, string> = { short: 'Short video', speech: 'Public speech', live: 'Live stream', other: 'Other video' };

export function ImmersionPage() {
  const translateUi = useUi();
  const { language } = useApp();
  const lang = language.id;
  const navigate = useNavigate();
  const data = useLiveQuery(async () => {
    try { return { list: await immersionList(lang), error: '' }; }
    catch (e) { return { list: { shopping: [], media: [] }, error: e instanceof Error ? e.message : 'Could not read the list.' }; }
  }, [lang]);
  const videos = useMediaList(lang, 'watch');
  const [item, setItem] = useState('');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [level, setLevel] = useState('A1');
  const [kind, setKind] = useState<ImmersionMediaKind>('short');
  const run = async (job: () => Promise<void>) => { setBusy(true); try { await job(); } catch (e) { toast(e instanceof Error ? e.message : 'Could not save this change.', { tone: 'error' }); } finally { setBusy(false); } };
  const change = (action: ImmersionAction) => updateImmersion(lang, action);
  const write = (prompt: { text: string; english: string; taskId?: string }) => void run(async () => { const id = await createEntry(lang, { text: prompt.text, en: prompt.english, taskId: prompt.taskId }); navigate(`/mentis/diarium/${id}`); });
  return <section aria-label={translateUi('Daily immersion')} className="space-y-7">
    <header><h2 className="font-serif text-2xl font-semibold"><UiText source={'A little language, every day'} /></h2><p className="mt-2 text-sm text-ink-soft"><UiText source={'Write what you see, talk through your day, use a list and watch something small. Your writing and lists stay in Lingua.'} /></p></header>
    <div className="grid grid-cols-2 gap-5">{immersionPrompts(lang).map((prompt) => <section key={prompt.taskId} className="space-y-3 rounded-2xl border border-line bg-raised p-5"><h3 className="font-semibold"><UiText source={prompt.title} /></h3><p lang={lang} dir={lang === 'ar' ? 'rtl' : undefined} className="font-serif text-lg">{prompt.text}</p><p className="text-sm text-ink-soft">{prompt.english}</p><div className="flex flex-wrap items-center gap-4"><Button size="sm" loading={busy} onClick={() => write(prompt)}><UiText source={'Start in Diarium'} /></Button><Link className="text-sm underline" to={`/mentis/sermo?topic=${encodeURIComponent(prompt.text)}`}><UiText source={'Talk it through in Sermo'} /></Link></div></section>)}</div>
    {data?.error && <p role="alert" className="text-sm text-accent-text">{data.error}</p>}
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-6">
      <section className="space-y-4 rounded-2xl border border-line bg-raised p-5" aria-label={translateUi('Shopping list')}><h3 className="font-serif text-xl font-semibold"><UiText source={'A shopping list in the language'} /></h3><p className="text-sm text-ink-soft"><UiText source={'Write your own words, then tick what you have bought. Lists are separate for each language.'} /></p>
        <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await change({ type: 'add', text: item }); setItem(''); }); }} className="flex gap-2"><label className="min-w-0 flex-1 text-xs"><UiText source={'Shopping item{0}'} values={[<input lang={lang} maxLength={200} disabled={busy || !data || Boolean(data.error)} value={item} onChange={(e) => setItem(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg p-2 text-sm" />]} /></label><Button type="submit" size="sm" disabled={busy || !data || Boolean(data.error) || !item.trim()}><UiText source={'Add item'} /></Button></form>
        <ul className="space-y-2">{data?.list.shopping.map((x) => <li key={x.id} className="flex items-center gap-3 rounded-lg bg-surface p-2"><label className="flex min-w-0 flex-1 items-center gap-3 text-sm"><input type="checkbox" checked={x.done} disabled={busy} onChange={() => void run(() => change({ type: 'toggle', id: x.id }))} /><span lang={lang} className={`min-w-0 break-words ${x.done ? 'line-through opacity-60' : ''}`}>{x.text}</span></label><Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(async () => { await change({ type: 'remove', id: x.id }); toast('Item removed.', { action: { label: 'Undo', onClick: () => void run(() => change({ type: 'restore', item: x })) } }); })}><UiText source={'Remove'} /></Button></li>)}</ul>
        {data && !data.list.shopping.length && !data.error && <p className="text-xs text-ink-faint"><UiText source={'No items yet.'} /></p>}
      </section>
      <section className="space-y-4 rounded-2xl border border-line bg-raised p-5"><h3 className="font-serif text-xl font-semibold"><UiText source={'Read a sign, advert or menu'} /></h3><p className="text-sm text-ink-soft"><UiText source={'Open Codex’s book import and choose page photos, or drop a picture there. OCR runs on this device. Read the result with the existing word tools, then describe what the sign is asking you to do.'} /></p><Link to="/codex/new?way=book" className="inline-block text-sm font-semibold underline"><UiText source={'Open photo import in Codex'} /></Link><ReferenceButton /></section>
    </div>
    <section className="space-y-4 rounded-2xl border border-line bg-raised p-5" aria-label={translateUi('Media playlists by level')}><h3 className="font-serif text-xl font-semibold"><UiText source={'Media playlists by level'} /></h3><p className="text-sm text-ink-soft"><UiText source={'Choose your own YouTube short, speech or live link, or a video already in Visio. Levels and kinds are your labels. Each opens Visio’s player, with its transcript tools where captions are available. Live captions and embedding depend on the source.'} /></p>
      <fieldset disabled={busy || !data || Boolean(data.error)} className="grid min-w-0 grid-cols-4 items-end gap-3"><Select label={translateUi('Your level label')} value={level} onChange={setLevel} options={CEFR_LEVELS.map((v) => ({ value: v, label: v }))} /><Select label={translateUi('Video kind')} value={kind} onChange={(v) => setKind(v as ImmersionMediaKind)} options={MEDIA_KINDS.map((v) => ({ value: v, label: translateUi(LABELS[v]) }))} /><Select label={translateUi('From your Visio library')} value={videoId} onChange={setVideoId} options={[{ value: '', label: translateUi('Choose a video') }, ...(videos ?? []).map((v) => ({ value: v.id, label: v.title }))]} /><Button variant="secondary" size="sm" disabled={!videoId} onClick={() => void run(() => change({ type: 'media-add', item: { mediaId: videoId, level, kind } }))}><UiText source={'Add existing video'} /></Button></fieldset>
      <form onSubmit={(e) => { e.preventDefault(); void run(async () => { if (!youtubeId(url)) throw new Error('Paste a YouTube watch, shorts or live link.'); const id = await addVideoLink(lang, url, ''); await change({ type: 'media-add', item: { mediaId: id, level, kind } }); setUrl(''); }); }} className="flex items-end gap-3"><label className="min-w-0 flex-1 text-sm"><UiText source={'YouTube video link{0}'} values={[<input value={url} maxLength={2000} disabled={busy || !data || Boolean(data.error)} onChange={(e) => setUrl(e.target.value)} placeholder={translateUi('https://www.youtube.com/shorts/…')} className="mt-1 w-full rounded-lg border border-line bg-bg p-2" />]} /></label><Button type="submit" size="sm" disabled={busy || !data || Boolean(data.error) || !url.trim()}><UiText source={'Add YouTube link'} /></Button></form>
      {CEFR_LEVELS.map((band) => { const entries = data?.list.media.filter((x) => x.level === band) ?? []; return entries.length ? <section key={band} className="space-y-2 border-t border-line pt-4"><h4 className="font-semibold"><UiText source={'{0} playlist'} values={[band]} /></h4>{entries.map((entry) => { const video = videos?.find((v) => v.id === entry.mediaId); return <div key={entry.mediaId} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3"><div className="min-w-0 flex-1"><p className="text-xs text-ink-faint"><UiText source={LABELS[entry.kind]} /></p>{video ? <Link className="break-words font-semibold underline" to={`/visio/watch/${video.id}`}>{video.title}</Link> : <p className="text-sm"><UiText source={'Video no longer in this library'} /></p>}</div>{video && <Button variant="secondary" size="sm" disabled={busy} onClick={() => write({ text: `Watch “${video.title}”. Summarise its main point and two details in the language you are learning. Note one phrase to reuse.`, english: 'Watch, then explain in your own words.' })}><UiText source={'Write what you understood'} /></Button>}<Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(async () => { await change({ type: 'media-remove', mediaId: entry.mediaId }); toast('Removed from this playlist; the video stays in Visio.', { action: { label: 'Undo', onClick: () => void run(() => change({ type: 'media-restore', item: entry })) } }); })}><UiText source={'Remove from playlist'} /></Button></div>; })}</section> : null; })}
    </section>
  </section>;
}
