import { UiText } from '@/design/i18n/UiText';
import { Link } from 'react-router';
import type { Feed } from '@/data/types';
import { Artwork } from './Artwork';
import { sonusBase } from '@/features/sonus/paths';

const dateFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

/** Followed podcasts as a shelf of square covers. */
export function PodcastGrid({ feeds }: { feeds: Feed[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {feeds.map((f) => {
        const latest = f.episodes[0]?.publishedAt;
        return (
          <Link key={f.id} to={`${sonusBase()}/podcast/${f.id}`} className="group block">
            <span className="block transition-transform duration-200 ease-out group-hover:-translate-y-1 group-active:scale-[0.98]">
              <Artwork title={f.title} coverUrl={f.imageUrl} className="w-full" rounded="rounded-2xl" />
            </span>
            <p className="mt-2.5 line-clamp-2 text-[14px] leading-snug font-semibold">{f.title}</p>
            <p className="truncate text-[12.5px] text-ink-soft">{f.author}</p>
            <p className="mt-0.5 text-[11.5px] font-semibold text-ink-faint"><UiText source={'{0} episodes{1}'} values={[f.episodes.length, latest ? ` · ${dateFmt.format(latest)}` : '']} /></p>
          </Link>
        );
      })}
    </div>
  );
}
