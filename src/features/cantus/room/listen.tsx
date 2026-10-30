import { UiText, useUi } from '@/design/i18n/UiText';
// Sonus+'s Podcasts tab: the ones you follow, and finding more. An episode opens over the room.
// Audiobooks and Radio are Sonus's own tabs.
import { useApp } from '@/app/context';
import { useFeeds } from '@/data/media';
import { Discover } from '@/features/sonus/library/Discover';
import { PodcastGrid } from '@/features/sonus/library/PodcastGrid';
import { RoomTitle } from './rails';

export function PodcastsTab() {
  const translateUi = useUi();
  const lang = useApp().language.id;
  const feeds = useFeeds(lang);
  return (
    <>
      <RoomTitle><UiText source={'Podcasts'} /></RoomTitle>
      {feeds && feeds.length > 0 && (
        <section aria-label={translateUi('Your podcasts')} className="room-section">
          <h2 className="room-head"><UiText source={'Your podcasts'} /></h2>
          <PodcastGrid feeds={feeds} />
        </section>
      )}
      <section aria-label={translateUi('Find podcasts')} className="room-section">
        <h2 className="room-head"><UiText source={'Find podcasts'} /></h2>
        <Discover lang={lang} feeds={feeds ?? []} />
      </section>
    </>
  );
}

