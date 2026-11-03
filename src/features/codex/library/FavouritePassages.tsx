import { Link } from 'react-router';
import type { Text } from '@/data/types';
import { UiText } from '@/design/i18n/UiText';

export function FavouritePassages({ texts }: { texts: Text[] }) {
  const favourites = texts.filter((t) => !t.deletedAt).flatMap((text) => (text.readingMarks ?? []).filter((m) => m.favourite).map((mark) => ({ text, mark })));
  return <section className="space-y-4 border-t border-line pt-6"><h2 className="font-serif text-2xl font-semibold"><UiText source="Favourite passages" /></h2>
    {!favourites.length && <p className="text-sm text-ink-soft"><UiText source="Mark a highlight as a favourite in Study tools to keep its quote and source here." /></p>}
    <div className="grid grid-cols-2 gap-4">{favourites.map(({ text, mark }) => <article key={`${text.id}:${mark.id}`} className="rounded-xl border border-line bg-raised p-5">
      <blockquote lang={text.lang} dir="auto" className="font-serif text-xl leading-relaxed">{mark.quote}</blockquote><p className="my-3 whitespace-pre-wrap text-sm text-ink-soft">{mark.note}</p>
      <Link to={`/codex/read/${text.id}?chapter=${mark.chapterIndex}&block=${mark.blockIndex}`} className="text-sm font-semibold text-accent-text">{text.title} · {text.author} · {mark.chapterIndex + 1}</Link>
    </article>)}</div>
  </section>;
}
