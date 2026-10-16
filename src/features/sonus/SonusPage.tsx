import { Bike, Captions, Lock, Mic } from 'lucide-react';
import { ComingSoon } from '@/app/ComingSoon';
import { PageHeader } from '@/app/PageHeader';

export default function SonusPage() {
  return (
    <>
      <PageHeader title="Sonus" />
      <ComingSoon
        phase={4}
        title="Your listening room"
        body="Podcasts and audio lessons with transcripts that light up as they play, ready for the commute even with the screen locked."
        features={[
          { icon: Captions, text: 'Karaoke-style transcripts you can tap like the reader' },
          { icon: Mic, text: 'Automatic transcription with word timings' },
          { icon: Lock, text: 'Offline playback with lock-screen controls' },
          { icon: Bike, text: 'Hands-free commute mode with sentence repeats' },
        ]}
      />
    </>
  );
}
