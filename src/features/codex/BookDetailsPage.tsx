import type { ToastMessage } from '@/state/ui';
import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { BackLink } from '@/app/BackLink';
import { BookOpen, FilePlus2, Pencil, Plus, Trash2 } from 'lucide-react';
import { blocksToText, textToBlocks } from '@/core/parsers/text';
import { countWords } from '@/core/text/tokenizer';
import { appendChapters, removeCoverImage, rewriteChapters, setCoverImage, textChapters, updateText, useText } from '@/data/library';
import type { Chapter, CoverDesign, Text } from '@/data/types';
import { Button, Card, Dialog, Drawer, IconButton, Segmented } from '@/design/primitives';
import { useDraft } from '@/features/ordo/useDraft';
import { formatDuration } from '@/core/audio/cues';
import { BOOK_FILE_ACCEPT, readFileChapters } from '@/services/import/importers';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { coverOf } from './library/covers';
import { CoverDesigner } from './library/CoverDesigner';
import { LevelPicker } from './library/LevelPicker';
import { forgetChapterModels } from './reader/model';

type Shelf = NonNullable<Text['shelf']>;

const label = 'mb-1.5 block text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase';

/** Editing a book or text: its details and level, its chapters, more from a file, and the cover. New imports land here first. */
export default function BookDetailsPage() {
  const { textId } = useParams();
  const [params] = useSearchParams();
  const text = useText(textId);
  if (text === null || text?.deletedAt) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-xl"><UiText source={'This book isn’t in your library.'} /></p>
        <Link to="/codex" className="mt-4 inline-block font-semibold text-accent-text"><UiText source={'Back to Codex'} /></Link>
      </div>
    );
  }
  if (!text) return null;
  return <Details key={text.id} text={text} fresh={params.has('new')} />;
}

function Details({ text, fresh }: { text: Text; fresh: boolean }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const [title, setTitle] = useDraft(text.title, (v) => v.trim() && void updateText(text.id, { title: v.trim() }), 400);
  const [author, setAuthor] = useDraft(text.author ?? '', (v) => void updateText(text.id, { author: v.trim() || undefined }), 400);
  const [design, setDesign] = useState<CoverDesign>(() => {
    const { cloth, ornament } = coverOf(text);
    return text.cover ?? { cloth: cloth.id, ornament };
  });
  useEffect(() => setDesign((d) => text.cover ?? d), [text.cover]);
  const shelf: Shelf = text.finishedAt ? 'read' : (text.shelf ?? 'reading');
  // Reading time at an easy learner's pace (about 120 words a minute).
  const minutes = Math.max(1, Math.round(text.wordCount / 120));

  return (
    <>
      <BackLink to="/codex"><UiText source={'Codex'} /></BackLink>
      <header className="mb-7">
        <p className="mb-1.5 text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">{fresh ? translateUi('On your shelf') : translateUi('Edit')}</p>
        <h1 lang={text.lang} className="font-serif text-[32px] leading-tight font-semibold tracking-tight sm:text-[38px]">
          {text.title}
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft"><UiText source={'{0} words · {1} {2} · about {3} of reading{4}{5}'} values={[text.wordCount.toLocaleString(), text.chapterCount, text.kind === 'comic' ? (text.chapterCount === 1 ? <UiText source={'page'} /> : <UiText source={'pages'} />) : text.chapterCount === 1 ? <UiText source={'part'} /> : <UiText source={'parts'} />, formatDuration(minutes * 60_000), text.stats && ` · ${Math.round(text.stats.knownShare * 100)}% of words known`, text.sourceUrl && (
            <>
              {' · '}
              <a href={text.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent-text underline-offset-2 hover:underline">
                {text.kind === 'article' ? translateUi('The original article') : translateUi('Where it came from')}
              </a>
            </>
          )]} /></p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <label className="block">
            <span className={label}><UiText source={'Title'} /></span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} lang={text.lang} className="h-12 w-full rounded-xl border border-line bg-raised px-4 font-serif text-[19px] font-semibold transition-colors focus:border-accent" />
          </label>
          <label className="block">
            <span className={label}><UiText source={'Author'} /></span>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={translateUi('Unknown')} className="h-11 w-full rounded-xl border border-line bg-raised px-4 text-[15px] transition-colors focus:border-accent" />
          </label>
          <div>
            <span className={label}><UiText source={'Reading level'} /></span>
            <LevelPicker value={text.level} guess={text.stats?.level} onChange={(level) => void updateText(text.id, { level })} />
          </div>
          <div>
            <span className={label}><UiText source={'Shelf'} /></span>
            <Segmented<Shelf>
              label={translateUi('Shelf')}
              value={shelf}
              onChange={(next) => void updateText(text.id, next === 'read' ? { shelf: 'read', finishedAt: Date.now() } : { shelf: next, finishedAt: undefined })}
              options={[
                { value: 'reading', label: translateUi('Reading') },
                { value: 'to-read', label: translateUi('To read') },
                { value: 'read', label: translateUi('Finished') },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="lg" icon={BookOpen} onClick={() => navigate(`/codex/read/${text.id}`)}>
              {fresh ? translateUi('Start reading') : translateUi('Read')}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate('/codex')}><UiText source={'Back to the shelves'} /></Button>
          </div>

          <Chapters text={text} />
        </div>

        <Card className="self-start">
          <p className="mb-4 font-serif text-lg font-semibold"><UiText source={'Cover'} /></p>
          <CoverDesigner
            text={{ id: text.id, title: title || text.title, author: author || undefined, lang: text.lang, coverBlobId: text.coverBlobId }}
            design={design}
            onDesign={(d) => {
              setDesign(d);
              void updateText(text.id, { cover: d });
            }}
            image={null}
            onImage={(image) => image && void setCoverImage(text.id, image)}
            hasStoredImage={Boolean(text.coverBlobId)}
            onRemoveStored={() => void removeCoverImage(text.id)}
          />
        </Card>
      </div>
    </>
  );
}

type Editing = { chapter: Chapter | null; title: string; body: string };

/** The text itself: each chapter (or part) can be edited or removed, and more can be added. */
function Chapters({ text }: { text: Text }) {
  const translateUi = useUi();
  const chapters = useLiveQuery(() => textChapters(text.id), [text.id, text.updatedAt]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [removing, setRemoving] = useState<Chapter | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const done = (message: ToastMessage) => {
    forgetChapterModels(text.id);
    toast(message, { tone: 'success' });
  };
  const keep = (list: Chapter[]) => list.map((c) => ({ id: c.id, title: c.title, blocks: c.blocks }));

  const save = async () => {
    if (!editing || !chapters) return;
    const blocks = textToBlocks(editing.body);
    const title = editing.title.trim() || undefined;
    if (!blocks.length) return toast('A chapter needs some text. To take it out, use Remove.', { tone: 'error' });
    setBusy('save');
    try {
      const list = editing.chapter
        ? keep(chapters).map((c) => (c.id === editing.chapter!.id ? { id: c.id, title, blocks } : c))
        : [...keep(chapters), { title, blocks }];
      await rewriteChapters(text.id, list);
      setEditing(null);
      done(editing.chapter ? 'Chapter saved.' : 'Chapter added.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The chapter couldn’t be saved.', { tone: 'error' });
    }
    setBusy(null);
  };

  const remove = async (chapter: Chapter) => {
    setRemoving(null);
    if (!chapters || chapters.length < 2) return;
    await rewriteChapters(text.id, keep(chapters.filter((c) => c.id !== chapter.id)));
    done('Chapter removed.');
  };

  const addFile = async () => {
    const file = await pickFile(BOOK_FILE_ACCEPT);
    if (!file) return;
    setBusy('file');
    try {
      const { chapters: drafts, images } = await readFileChapters(text.lang, file);
      if (!drafts.length) throw new Error('No text was found in that file.');
      await appendChapters(text.id, drafts, images);
      done({ source: 'Added {0} {1} from “{2}”.', values: [String(drafts.length), drafts.length === 1 ? { source: 'chapter' } : { source: 'chapters' }, String(file.name)] });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That file couldn’t be read.', { tone: 'error' });
    }
    setBusy(null);
  };

  if (text.kind === 'shelfItem') return null;
  const words = editing ? countWords(editing.body, text.lang) : 0;

  return (
    <section className="pt-4">
      <h2 className="mb-1 font-serif text-[22px] font-semibold"><UiText source={'Text'} /></h2>
      <p className="mb-3 text-[13.5px] text-ink-soft"><UiText source={'Fix a typo, tidy a chapter, take one out, or add more from a file.'} /></p>
      <ol className="divide-y divide-line rounded-2xl border border-line bg-raised">
        {(chapters ?? []).map((c, i) => {
          const first = c.blocks.find((b) => b.t !== 'img');
          const name = c.title ?? (first && 'text' in first ? first.text.slice(0, 60) : `Part ${i + 1}`);
          return (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <span className="w-6 shrink-0 text-right text-[12.5px] font-bold text-ink-faint tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span lang={text.lang} className="block truncate text-[15px] font-semibold">
                  {name}
                </span>
                <span className="block text-[12.5px] text-ink-faint"><UiText source={'{0}{1} words'} values={[c.part ? `Part ${c.part[0]} of ${c.part[1]} · ` : '', c.wordCount.toLocaleString()]} /></span>
              </span>
              <IconButton icon={Pencil} label={translateUi('Edit this chapter')} size="sm" onClick={() => setEditing({ chapter: c, title: c.title ?? '', body: blocksToText(c.blocks) })} />
              {(chapters?.length ?? 0) > 1 && <IconButton icon={Trash2} label={translateUi('Remove this chapter')} size="sm" onClick={() => setRemoving(c)} />}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" icon={Plus} onClick={() => setEditing({ chapter: null, title: '', body: '' })}><UiText source={'Add a chapter'} /></Button>
        <Button variant="secondary" icon={FilePlus2} loading={busy === 'file'} onClick={() => void addFile()}><UiText source={'Add from a file'} /></Button>
      </div>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.chapter ? translateUi('Edit chapter') : translateUi('New chapter')}
        footer={
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[12.5px] font-semibold text-ink-faint tabular-nums"><UiText source={'{0} words'} values={[words.toLocaleString()]} /></span>
            <Button variant="ghost" onClick={() => setEditing(null)}><UiText source={'Cancel'} /></Button>
            <Button onClick={() => void save()} loading={busy === 'save'}><UiText source={'Save'} /></Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-3">
            <input
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              lang={text.lang}
              placeholder="Chapter title (optional)"
              aria-label="Chapter title"
              className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 font-serif text-[17px] font-semibold transition-colors focus:border-accent"
            />
            <textarea
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              lang={text.lang}
              aria-label="Chapter text"
              placeholder="Paragraphs are separated by an empty line."
              className="min-h-[52dvh] w-full resize-y rounded-xl border border-line bg-bg px-4 py-3 font-serif text-[16px] leading-relaxed transition-colors focus:border-accent"
            />
            <p className="text-[12.5px] leading-snug text-ink-faint"><UiText source={'An empty line starts a new paragraph. “# ” makes a heading, “> ” a quotation; lines like ![picture](…) are the chapter’s pictures.'} /></p>
          </div>
        )}
      </Drawer>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={translateUi('Remove this chapter?')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}><UiText source={'Keep'} /></Button>
            <Button variant="danger" onClick={() => removing && void remove(removing)}><UiText source={'Remove'} /></Button>
          </>
        }
      ><UiText source={'Its text leaves the book. Words you marked and cards you made from it stay.'} /></Dialog>
    </section>
  );
}
