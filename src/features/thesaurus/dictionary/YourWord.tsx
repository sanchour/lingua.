// The learner's half of a word's page (6-1): favourite and important, their own tags and note, and what they have done with
// the word (first met, reviews, how often they recalled it). The language's half is the rest of the page.
import { useEffect, useRef, useState } from 'react';
import { Flag, Plus, Star, X } from 'lucide-react';
import { changeWordTags, MAX_TAGS, setWordFavourite, setWordImportant, setWordNote, useWord, useWordHistory } from '@/data/words';
import { Card, IconButton } from '@/design/primitives';
import { cx } from '@/lib/cx';

const day = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function YourWord({ lang, norm, lemma, gloss }: { lang: string; norm: string; lemma?: string; gloss?: string }) {
  const word = useWord(lang, norm);
  const history = useWordHistory(lang, norm);
  const ctx = { lemma, gloss };
  const tags = word && !word.deletedAt ? (word.tags ?? []) : [];
  const [tag, setTag] = useState('');
  const [note, setNote] = useState('');
  const saved = word && !word.deletedAt ? (word.note ?? '') : '';
  // The note shows what was saved, and what the learner is typing until they leave it.
  useEffect(() => setNote(saved), [saved, lang, norm]);

  // A comma ends a tag, as Enter does; several typed (or pasted) at once each become a tag.
  const addTags = (values: string[]) => {
    const added = values.filter((v) => v.trim());
    if (added.length) void changeWordTags(lang, norm, (list) => [...list, ...added], ctx);
  };
  const type = (value: string) => {
    const parts = value.split(',');
    setTag(parts.pop() ?? '');
    addTags(parts);
  };

  // What was typed in the note is kept when the card goes away (another word, another page), not only when the box is left.
  const latest = useRef({ note, saved, lang, norm, ctx });
  latest.current = { note, saved, lang, norm, ctx };
  useEffect(
    () => () => {
      const l = latest.current;
      if (l.note !== l.saved) void setWordNote(l.lang, l.norm, l.note, l.ctx);
    },
    [],
  );

  const facts = [
    history?.places ? `Met in ${history.places} ${history.places === 1 ? 'place' : 'places'}` : null,
    history?.firstMetAt ? `first on ${day(history.firstMetAt)}` : null,
    history?.reviews ? `reviewed ${history.reviews} ${history.reviews === 1 ? 'time' : 'times'}, last on ${day(history.lastReviewedAt!)}` : null,
    history?.recallRate !== undefined ? `recalled ${Math.round(history.recallRate * 100)}%` : null,
  ].filter(Boolean);

  return (
    <Card className="mt-6 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">You</h3>
        <span className="flex-1" />
        <IconButton icon={Star} label={word?.favourite ? 'Remove from favourites' : 'Favourite'} active={Boolean(word?.favourite)} onClick={() => void setWordFavourite(lang, norm, !word?.favourite, ctx)} />
        <IconButton icon={Flag} label={word?.important ? 'Not important' : 'Important'} active={Boolean(word?.important)} onClick={() => void setWordImportant(lang, norm, !word?.important, ctx)} />
      </div>

      <div className="mt-3 space-y-5">
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink-faint">Tags</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sage-soft py-0.5 pr-1 pl-2.5 text-[13px] font-semibold text-sage-text">
                {t}
                <button
                  type="button"
                  aria-label={`Remove the tag ${t}`}
                  onClick={() => void changeWordTags(lang, norm, (list) => list.filter((x) => x !== t), ctx)}
                  className="grid size-5 place-items-center rounded-full hover:bg-sage/20"
                >
                  <X size={12} aria-hidden />
                </button>
              </span>
            ))}
            {tags.length < MAX_TAGS && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTags([tag]);
                  setTag('');
                }}
                className="flex items-center"
              >
                <input
                  value={tag}
                  onChange={(e) => type(e.target.value)}
                  onBlur={() => {
                    addTags([tag]);
                    setTag('');
                  }}
                  placeholder="Add a tag"
                  aria-label="Add a tag"
                  maxLength={25}
                  className="h-7 w-28 rounded-full border border-dashed border-line bg-transparent px-2.5 text-[13px] outline-none placeholder:text-ink-faint focus:border-ink"
                />
                <Plus size={12} aria-hidden className="-ml-5 text-ink-faint" />
              </form>
            )}
          </div>

          <label className="mt-4 mb-1.5 block text-[12.5px] font-semibold text-ink-faint" htmlFor={`note-${lang}-${norm}`}>
            Your note
          </label>
          <textarea
            id={`note-${lang}-${norm}`}
            value={note}
            rows={3}
            placeholder="A mnemonic, a mix-up to avoid, where you heard it…"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== saved && void setWordNote(lang, norm, note, ctx)}
            className={cx('w-full resize-y rounded-xl border border-line bg-raised px-3 py-2 text-[15px] leading-snug outline-none placeholder:text-ink-faint focus:border-ink')}
          />
        </div>

        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink-faint">What you have done with it</p>
          {facts.length ? (
            <ul className="space-y-1 text-[14.5px] text-ink-soft">
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[14.5px] text-ink-soft">Nothing yet. Mark it Learning, and its reviews show here.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
