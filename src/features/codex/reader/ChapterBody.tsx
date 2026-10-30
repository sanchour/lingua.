import { UiText } from '@/design/i18n/UiText';
import { memo, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { packId } from '@/core/packs/format';
import { endingStart, markMatches, MARK_COLOURS, POS_COLOURS } from '@/core/reading/aids';
import type { ReadingAids, ReadingMark } from '@/core/reading/aids';
import { READING_LANGS } from '@/core/lang/languages';
import { TRANSLIT_LANGS, translitFor } from '@/core/script/reading';
import { simpleTranslit } from '@/core/script/arabic';
import { blobUrl } from '@/data/library';
import type { ChapterModel } from './model';

/**
 * The chapter as static DOM: one span per word with its form (data-n), offset in the paragraph
 * (data-o) and state (data-s). Rendered once per chapter; after that the word engine updates
 * spans directly, so word clicks never re-render this tree.
 */
export const ChapterBody = memo(function ChapterBody({ model, lang, images = true, aids, marks = [], plainTranslit, onLayout }: { model: ChapterModel; lang: string; images?: boolean; aids?: ReadingAids; marks?: ReadingMark[]; plainTranslit?: boolean; onLayout?: () => void }) {
  const readings = READING_LANGS.has(lang) || TRANSLIT_LANGS.has(lang);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  useEffect(() => setRevealed(new Set()), [model.chapter.id]);
  const categories = useLiveQuery(async () => {
    if (!aids?.pos) return new Map<string, string>();
    const rows = await db.dictEntries.bulkGet(model.norms.map((n) => [packId(lang), model.glosses.get(n)?.lemma ?? n] as [string, string]));
    return new Map(model.norms.map((n, i) => [n, rows[i]?.senses[0]?.pos ?? '']));
  }, [lang, model, aids?.pos]);
  return (
    <>
      {model.blocks.map(({ block, tokens }, b) => {
        // A comic's page is drawn beside its words, not among them.
        if (block.t === 'img') return images ? <ReaderImage key={b} index={b} blobId={block.blobId} alt={block.alt} /> : null;
        const localMarks = marks.filter((m) => m.chapterIndex === model.chapter.index && m.blockIndex === b && markMatches(m, block.text));
        const sentences = new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(block.text);
        const children = <>
          {tokens!.map((t, i) => {
            if (!t.isWord) return t.text;
            const gloss = model.glosses.get(t.norm!);
            const ending = aids?.endings && gloss?.lemma ? endingStart(t.text, gloss.lemma) : undefined;
            const pos = categories?.get(t.norm!) ?? '';
            const mark = localMarks.find((m) => t.start < m.end && t.start + t.text.length > m.start);
            const sentence = `${b}:${sentences.containing(t.start)?.index ?? 0}`;
            return <span key={i} className="w" data-n={t.norm} data-o={t.start} data-s={model.states.get(t.norm!) ?? 0}
              data-r={readings ? readingFor(lang, t.text, gloss?.reading) ?? plain(translitFor(lang, t.text), plainTranslit) : undefined}
              data-gloss={aids?.glosses ? (!aids.hideGlosses || revealed.has(sentence) ? gloss?.text ?? '—' : '…') : undefined}
              title={aids?.pos ? `${pos || 'Category not listed'}${ending !== undefined ? ` · dictionary form: ${gloss?.lemma}` : ''}` : ending !== undefined ? `Dictionary form: ${gloss?.lemma}` : undefined}
              style={{ color: aids?.pos ? POS_COLOURS[pos] : undefined, backgroundColor: mark ? MARK_COLOURS[mark.colour] : undefined, boxShadow: mark ? 'inset 0 -2px currentColor' : undefined }}>
              {ending === undefined ? (lang === 'ar' ? vowelRuns(t.text) : t.text) : <>{t.text.slice(0, ending)}<u className="decoration-dotted decoration-2 underline-offset-4">{t.text.slice(ending)}</u></>}
            </span>;
          })}
          {aids?.glosses && aids.hideGlosses && <span className="mt-2 block text-sm">{[...sentences].map((s, i) => {
            const key = `${b}:${s.index}`;
            return <button key={key} type="button" className="mr-3 rounded-md border border-line bg-raised px-2 py-1 text-xs font-sans text-ink-soft" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setRevealed((old) => { const next = new Set(old); if (next.has(key)) next.delete(key); else next.add(key); return next; }); onLayout?.(); }}><UiText source={'{0} sentence {1}'} values={[revealed.has(key) ? 'Hide' : 'Reveal', i + 1]} /></button>;
          })}</span>}
          {localMarks.filter((m) => m.note).map((m) => <small key={m.id} className="my-2 block border-l-2 border-line pl-3 font-sans text-sm leading-normal text-ink-soft"><UiText source={'Margin note: {0}'} values={[m.note]} /></small>)}
        </>;
        if (block.t === 'h') {
          return (
            <h2 key={b} data-b={b} lang={lang}>
              {children}
            </h2>
          );
        }
        if (block.t === 'quote') {
          return (
            <blockquote key={b} data-b={b} lang={lang}>
              {children}
            </blockquote>
          );
        }
        return (
          <p key={b} data-b={b} lang={lang}>
            {children}
          </p>
        );
      })}
    </>
  );
});

const HAN = /\p{Script=Han}/u;

/**
 * The reading drawn over a word (pinyin, or kana for Japanese words written with kanji); none
 * when it would only repeat the word (kana words, or a reading the dictionary doesn't have).
 */
export function readingFor(lang: string, text: string, reading: string | undefined): string | undefined {
  if (!reading || reading === text) return undefined;
  if (lang === 'ja' && !HAN.test(text)) return undefined;
  return reading;
}

function ReaderImage({ blobId, alt, index }: { blobId: string; alt?: string; index: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void blobUrl(blobId).then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobId]);
  return (
    <figure data-b={index} className="reader-figure">
      {url && <img src={url} alt={alt ?? ''} draggable={false} />}
    </figure>
  );
}

const plain = (s: string | undefined, on?: boolean) => (s && on ? simpleTranslit(s) : s);

/** Arabic text with its short vowel marks in spans of their own, so the reader can fade them as a word is learned (CSS: .hk). */
function vowelRuns(text: string) {
  return text.split(/([\u064B-\u0652\u0670]+)/).map((part, i) => (i % 2 ? <span key={i} className="hk">{part}</span> : part));
}
