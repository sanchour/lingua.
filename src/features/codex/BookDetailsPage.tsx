import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { BookOpen } from 'lucide-react';
import { removeCoverImage, setCoverImage, updateText, useText } from '@/data/library';
import type { CoverDesign, Text } from '@/data/types';
import { Button, Card, Segmented } from '@/design/primitives';
import { useDraft } from '@/features/ordo/useDraft';
import { formatDuration } from '@/core/audio/cues';
import { coverOf } from './library/covers';
import { CoverDesigner } from './library/CoverDesigner';

type Shelf = NonNullable<Text['shelf']>;

/** A book's own page: title, author, cover and shelf. New imports land here first. */
export default function BookDetailsPage() {
  const { textId } = useParams();
  const [params] = useSearchParams();
  const text = useText(textId);
  if (text === null || text?.deletedAt) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-xl">This book isn’t in your library.</p>
        <Link to="/codex" className="mt-4 inline-block font-semibold text-accent-text">
          Back to Codex
        </Link>
      </div>
    );
  }
  if (!text) return null;
  return <Details key={text.id} text={text} fresh={params.has('new')} />;
}

function Details({ text, fresh }: { text: Text; fresh: boolean }) {
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
      <BackLink to="/codex">Codex</BackLink>
      <header className="mb-7">
        <p className="mb-1.5 text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">{fresh ? 'On your shelf' : 'Book details'}</p>
        <h1 lang={text.lang} className="font-serif text-[32px] leading-tight font-semibold tracking-tight sm:text-[38px]">
          {text.title}
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {text.wordCount.toLocaleString()} words · {text.chapterCount} {text.chapterCount === 1 ? 'part' : 'parts'} · about {formatDuration(minutes * 60_000)} of reading
          {text.stats && ` · ${Math.round(text.stats.knownShare * 100)}% of words known`}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} lang={text.lang} className="h-12 w-full rounded-xl border border-line bg-raised px-4 font-serif text-[19px] font-semibold transition-colors focus:border-accent" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">Author</span>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Unknown" className="h-11 w-full rounded-xl border border-line bg-raised px-4 text-[15px] transition-colors focus:border-accent" />
          </label>
          <div>
            <span className="mb-1.5 block text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">Shelf</span>
            <Segmented<Shelf>
              label="Shelf"
              value={shelf}
              onChange={(next) => void updateText(text.id, next === 'read' ? { shelf: 'read', finishedAt: Date.now() } : { shelf: next, finishedAt: undefined })}
              options={[
                { value: 'reading', label: 'Reading' },
                { value: 'to-read', label: 'To read' },
                { value: 'read', label: 'Finished' },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="lg" icon={BookOpen} onClick={() => navigate(`/codex/read/${text.id}`)}>
              {fresh ? 'Start reading' : 'Read'}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate('/codex')}>
              Back to the shelves
            </Button>
          </div>
        </div>

        <Card>
          <p className="mb-4 font-serif text-lg font-semibold">Cover</p>
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
