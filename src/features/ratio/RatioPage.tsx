import { CalendarDays, Gauge, Sprout, Target } from 'lucide-react';
import { ComingSoon } from '@/app/ComingSoon';
import { PageHeader } from '@/app/PageHeader';

export default function RatioPage() {
  return (
    <>
      <PageHeader title="Ratio" />
      <ComingSoon
        phase={5}
        title="Your ledger"
        body="Quiet, honest numbers about your progress. Lingua starts recording activity in Phase 2, so the charts will have history by the time they arrive."
        features={[
          { icon: Sprout, text: 'Known words over time, by word form and word family' },
          { icon: Target, text: 'Coverage: how much of the top 2,000 words you know' },
          { icon: Gauge, text: 'Reading speed and listening time' },
          { icon: CalendarDays, text: 'Retention heatmap and upcoming reviews' },
        ]}
      />
    </>
  );
}
