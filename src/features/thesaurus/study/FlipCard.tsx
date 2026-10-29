import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Play } from 'lucide-react';
import type { Card, Note } from '@/data/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { cx } from '@/lib/cx';
import { cardLookProps } from '../common/cardLook';
import type { CardLook } from '../common/cardLook';
import { ClipPlayer, useClip } from '../common/Clip';
import { SongClip } from '../common/SongClip';
import { articleFor, genderName, posName, splitAt } from '../common/words';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { cardFaces } from '@/core/srs/templates';
import type { Face } from '@/core/srs/templates';

/** The flip: a soft 3D turn on a spring. Only transform animates (docs/PERFORMANCE.md). */
const FLIP = { type: 'spring', stiffness: 230, damping: 25, mass: 0.9 } as const;

function Face({ back, look, children, onClick }: { back?: boolean; look: CardLook; children: ReactNode; onClick?: () => void }) {
  const props = cardLookProps(look);
  return (
    <div
      onClick={onClick}
      data-look={props['data-look']}
      data-tint={props['data-tint']}
      className={cx(
        'flashcard no-callout flex min-h-[min(48dvh,400px)] flex-col overflow-hidden rounded-[28px] border border-line px-6 py-5 shadow-elev-2 [backface-visibility:hidden] [grid-area:1/1] sm:px-10 sm:py-6',
        onClick && 'cursor-pointer',
      )}
      style={{ ...props.style, transform: back ? 'rotateY(180deg)' : undefined }}
    >
      {children}
    </div>
  );
}

function AudioButton({ blobId }: { blobId: string }) {
  const url = useLiveQuery(async () => {
    const row = await db.blobs.get(blobId);
    return row ? URL.createObjectURL(row.blob) : null;
  }, [blobId]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  if (!url) return null;
  return (
    <button
      type="button"
      aria-label="Play recording"
      onClick={(e) => {
        e.stopPropagation();
        void new Audio(url).play();
      }}
      className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
    >
      <Play size={17} aria-hidden />
    </button>
  );
}

/** A picture stored on this device, as an address the page can show (and let go of). */
export function useBlobUrl(blobId: string | undefined): string | null | undefined {
  const url = useLiveQuery(async () => {
    if (!blobId) return null;
    const row = await db.blobs.get(blobId);
    return row ? URL.createObjectURL(row.blob) : null;
  }, [blobId]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}

/** One face of a card of another kind (6-3b): a question, the word, a line, a list, a picture (with its boxes), a paragraph, or only a button to hear it. */
function FaceBody({ face, note, lang, image, back }: { face: Face; note: Note; lang: string; image: string | null | undefined; back?: boolean }) {
  return (
    <div className={cx('flex flex-col items-center gap-4', back ? 'text-center' : 'text-center')}>
      {face.ask && <p className="text-sm font-semibold text-ink-faint">{face.ask}</p>}
      {face.listen && <SpeakButton lang={lang} text={note.term} label="Hear the word" size={34} className="size-20 rounded-full bg-sunken text-ink" />}
      {face.image && image && (
        <div className="relative inline-block max-w-full">
          <img src={image} alt="" className="max-h-[min(32dvh,280px)] max-w-full rounded-2xl object-contain" />
          {face.image === 'hidden' &&
            note.occlusion?.map((b, i) => <span key={i} aria-hidden className="absolute rounded-md bg-ink" style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} />)}
        </div>
      )}
      {face.paragraph && (
        <p lang={lang} className="text-left text-[calc(clamp(1.1rem,3.2vw,1.4rem)*var(--card-scale,1))] leading-relaxed">
          {face.paragraph[0]}
          <span className="mx-0.5 inline-block rounded-md border-b-2 border-line-strong align-baseline" style={{ width: `${Math.max(3, face.paragraph[1].length) + 1}ch` }}>
            {' '}
          </span>
          {face.paragraph[2]}
        </p>
      )}
      {face.term && <Term note={note} lang={lang} size={face.lines ? 'md' : 'lg'} />}
      {face.text && <p lang={face.listen || face.term || face.paragraph ? undefined : lang} className="text-[calc(clamp(1.25rem,4vw,1.8rem)*var(--card-scale,1))] leading-snug font-semibold text-accent-text">{face.text}</p>}
      {face.lines && (
        <ul className="space-y-1.5 text-[calc(1.15rem*var(--card-scale,1))] leading-snug">
          {face.lines.map((l) => (
            <li key={l} lang={lang}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Term({ note, lang, size }: { note: Note; lang: string; size: 'lg' | 'md' }) {
  const article = articleFor(lang, note.gender, note.term, note.pos);
  // Whole lines and sentences read better a size down.
  const long = note.term.length > 32;
  return (
    <p
      lang={lang}
      className={cx(
        'leading-tight font-semibold break-words',
        size === 'lg' ? (long ? 'text-[calc(clamp(1.5rem,4.5vw,2.1rem)*var(--card-scale,1))] leading-snug' : 'text-[calc(clamp(2.25rem,7vw,3.5rem)*var(--card-scale,1))]') : 'text-[calc(1.5rem*var(--card-scale,1))]',
      )}
    >
      {article && <span className="font-normal text-ink-faint">{article} </span>}
      {note.term}
    </p>
  );
}

function Sentence({ note, lang }: { note: Note; lang: string }) {
  const ex = note.example;
  const sentence = ex?.text ?? (note.context?.sentence !== note.term ? note.context?.sentence : undefined);
  const span = useMemo(() => {
    if (ex?.cloze) return ex.cloze;
    if (!sentence) return undefined;
    const at = sentence.toLocaleLowerCase(lang).indexOf(note.term.toLocaleLowerCase(lang));
    return at >= 0 ? ([at, at + note.term.length] as [number, number]) : undefined;
  }, [ex, sentence, note.term, lang]);
  if (!sentence) return null;
  const parts = splitAt(sentence, span);
  return (
    <div className="mt-6 border-t border-line/70 pt-5 text-left">
      <p lang={lang} className="text-[calc(17px*var(--card-scale,1))] leading-relaxed">
        {parts ? (
          <>
            {parts[0]}
            <mark className="rounded bg-accent-soft px-0.5 text-ink">{parts[1]}</mark>
            {parts[2]}
          </>
        ) : (
          sentence
        )}
      </p>
      {ex?.translation && <p className="mt-1 text-[14px] text-ink-soft italic">{ex.translation}</p>}
      {!ex && note.context && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink-faint">
          <BookOpen size={13} aria-hidden /> {note.source === 'visio' ? 'Heard in Visio' : note.source === 'sonus' ? 'Heard in Sonus' : note.source === 'cantus' ? 'Sung in a song' : 'From your reading'}
        </p>
      )}
    </div>
  );
}

interface FlipCardProps {
  look: CardLook;
  card: Card;
  note: Note;
  lang: string;
  flipped: boolean;
  onFlip: () => void;
  deckName?: string;
  front?: 'word' | 'sentence';
  /** At most this wide, in px (the card width setting). */
  width?: number;
}

/** The card's sentence and where its word stands in it, if it has both. */
function gapOf(note: Note, lang: string): { text: string; span: [number, number]; translation?: string } | null {
  const ex = note.example;
  const text = ex?.text ?? (note.context?.sentence !== note.term ? note.context?.sentence : undefined);
  if (!text) return null;
  if (ex?.cloze) return { text, span: ex.cloze, translation: ex.translation };
  const at = text.toLocaleLowerCase(lang).indexOf(note.term.toLocaleLowerCase(lang));
  return at >= 0 ? { text, span: [at, at + note.term.length], translation: ex?.translation } : null;
}

/** A tactile flashcard: question in front, answer on the back, turned with a spring. */
export function FlipCard({ look, card, note, lang, flipped, onFlip, deckName, front, width = 576 }: FlipCardProps) {
  const production = card.direction === 'production';
  const gap = !production && front === 'sentence' ? gapOf(note, lang) : null;
  const gapParts = gap ? splitAt(gap.text, gap.span) : null;
  const clip = useClip(note);
  const image = useBlobUrl(note.imageBlobId);
  const faces = cardFaces(note, card.direction, Boolean(image));
  const line = note.tags.includes('line');
  const details = [posName(note.pos), note.pos === 'noun' && lang === 'ru' ? genderName(note.gender) : undefined].filter(Boolean).join(' · ');

  const corner = (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-[12px] font-bold tracking-wide text-ink-faint uppercase">{deckName}</span>
      <span className="flex shrink-0 items-center">
        {note.audioBlobId && <AudioButton blobId={note.audioBlobId} />}
        {!note.audioBlobId && !clip && (!production || flipped) && <SpeakButton lang={lang} text={note.term} label="Hear the word" className="size-9 text-ink-soft hover:text-ink" />}
        {clip?.kind === 'audio' && (!production || flipped) && <ClipPlayer clip={clip} />}
      </span>
    </div>
  );

  return (
    <div className="mx-auto w-full [perspective:1600px]" style={{ maxWidth: width }}>
      <motion.div className="grid [transform-style:preserve-3d]" initial={false} animate={{ rotateY: flipped ? 180 : 0 }} transition={FLIP}>
        <Face look={look} onClick={flipped ? undefined : onFlip}>
          {corner}
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
            {faces ? (
              <FaceBody face={faces.front} note={note} lang={lang} image={image} />
            ) : production ? (
              <>
                <p className="text-[calc(clamp(1.75rem,5vw,2.5rem)*var(--card-scale,1))] leading-tight font-semibold">{note.meaning || '—'}</p>
                <p className="mt-3 text-sm text-ink-faint">Say it, then turn the card</p>
              </>
            ) : gapParts ? (
              <>
                <p lang={lang} className="text-[calc(clamp(1.35rem,4vw,1.9rem)*var(--card-scale,1))] leading-relaxed">
                  {gapParts[0]}
                  <span className="mx-0.5 inline-block rounded-md border-b-2 border-line-strong align-baseline" style={{ width: `${Math.max(3, gapParts[1].length) + 1}ch` }}>
                    {' '}
                  </span>
                  {gapParts[2]}
                </p>
                {gap!.translation && <p className="mt-3 text-[15px] text-ink-soft italic">{gap!.translation}</p>}
                <p className="mt-4 text-sm text-ink-faint">Which word is missing?</p>
              </>
            ) : (
              <>
                <Term note={note} lang={lang} size="lg" />
                {details && <p className="mt-2 text-[13px] font-semibold tracking-wide text-ink-faint">{details}</p>}
              </>
            )}
          </div>
          <p className="text-center text-[12px] font-semibold text-ink-faint pointer-coarse:hidden">Space to turn</p>
          <p className="hidden text-center text-[12px] font-semibold text-ink-faint pointer-coarse:block">Tap to turn</p>
        </Face>

        <Face back look={look}>
          {corner}
          <div className="flex flex-1 flex-col justify-center py-4 text-center">
            {faces ? (
              <FaceBody face={faces.back} note={note} lang={lang} image={image} back />
            ) : production ? (
              <>
                <Term note={note} lang={lang} size="lg" />
                <p className="mt-2 text-[15px] text-ink-soft">{note.meaning}</p>
              </>
            ) : (
              <>
                <Term note={note} lang={lang} size="md" />
                <p
                  className={cx(
                    'mt-4 leading-snug font-semibold text-accent-text',
                    (note.meaning ?? '').length > 40 ? 'text-[calc(clamp(1.15rem,3.2vw,1.45rem)*var(--card-scale,1))]' : 'text-[calc(clamp(1.5rem,4.5vw,2.1rem)*var(--card-scale,1))]',
                  )}
                >
                  {note.meaning || '—'}
                </p>
              </>
            )}
            {(note.ipa || details) && (
              <p className="mt-2 text-[13px] text-ink-faint">
                {[note.ipa, details].filter(Boolean).join(' · ')}
              </p>
            )}
            {!faces && image && <img src={image} alt="" className="mx-auto mt-4 max-h-[min(24dvh,200px)] max-w-full rounded-2xl object-contain" />}
            <Sentence note={note} lang={lang} />
            {note.mnemonic && <p className="mx-auto mt-3 max-w-md rounded-xl bg-sage-soft px-3.5 py-2 text-center text-[14px] leading-snug text-sage-text">{note.mnemonic}</p>}
            {note.context?.songId && <SongClip note={note} />}
            {clip?.kind === 'video' && (
              <div className={cx('mx-auto w-full', line ? 'mt-5 max-w-sm' : 'mt-3 max-w-xs')}>
                <ClipPlayer clip={clip} large={line} />
              </div>
            )}
          </div>
        </Face>
      </motion.div>
    </div>
  );
}
