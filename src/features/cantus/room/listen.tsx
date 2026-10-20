// Sonus+'s Podcasts tab: the ones you follow, and finding more. An episode opens over the room.
// Audiobooks and Radio are Sonus's own tabs.
import { useApp } from '@/app/context';
import { useFeeds } from '@/data/media';
import { Discover } from '@/features/sonus/library/Discover';
import { PodcastGrid } from '@/features/sonus/library/PodcastGrid';
import { RoomTitle } from './rails';

export function PodcastsTab() {
  const lang = useApp().language.id;
  const feeds = useFeeds(lang);
  return (
    <>
      <RoomTitle>Podcasts</RoomTitle>
      {feeds && feeds.length > 0 && (
        <section aria-label="Your podcasts" className="room-section">
          <h2 className="room-head">Your podcasts</h2>
          <PodcastGrid feeds={feeds} />
        </section>
      )}
      <section aria-label="Find podcasts" className="room-section">
        <h2 className="room-head">Find podcasts</h2>
        <Discover lang={lang} feeds={feeds ?? []} />
      </section>
    </>
  );
}

