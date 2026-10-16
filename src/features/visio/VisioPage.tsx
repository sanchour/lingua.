import { Captions, Pickaxe, Subtitles, Timer } from 'lucide-react';
import { ComingSoon } from '@/app/ComingSoon';
import { PageHeader } from '@/app/PageHeader';

export default function VisioPage() {
  return (
    <>
      <PageHeader title="Visio" />
      <ComingSoon
        phase={5}
        title="Your screening room"
        body="Shows and films with two subtitle tracks, where any line can become a flashcard that remembers exactly where it came from."
        features={[
          { icon: Subtitles, text: 'Dual subtitles: your target language and your own' },
          { icon: Pickaxe, text: 'Mine words or whole lines straight into Thesaurus' },
          { icon: Timer, text: 'Cards replay the original clip from its timestamp' },
          { icon: Captions, text: 'Subtitle-only mode to save space on your phone' },
        ]}
      />
    </>
  );
}
