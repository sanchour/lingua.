import { Link } from 'react-router';
import { ArrowRight, Compass as CompassIcon } from 'lucide-react';
import { LANE_NAME } from '@/core/mundus/guide';
import { Card } from '@/design/primitives';
import { Art } from '@/features/mundus/Art';
import { pickImageQuery } from '@/services/mundus/images';
import { MUNDUS, LANE_HUE, LANE_ICON } from './Compass';
import { useGuide } from './useGuide';

/** Mundus on Home: its note on the week and the first next step, with a way into the guide. */
export function MundusHomeCard() {
  const guide = useGuide();
  const step = guide?.steps[0];
  if (!guide || !step) return null;
  const lane = step.type === 'pick' || step.type === 'room' ? step.lane : guide.steer.lane;
  const Icon = LANE_ICON[lane];
  const title = step.type === 'pick' ? step.pick.title : step.type === 'tip' ? step.tip.title : step.title;
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] uppercase" style={{ color: MUNDUS }}>
          <CompassIcon size={14} aria-hidden /> Mundus suggests
        </p>
        <Link to="/mentis" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline">
          Your guide <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <Link to="/mentis" className="group -m-2 flex items-start gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
        <span className={step.type === 'pick' ? 'aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-xl shadow-elev-1' : 'size-11 shrink-0 overflow-hidden rounded-2xl'} aria-hidden>
          <Art
            query={step.type === 'pick' ? pickImageQuery(step.pick, step.group, guide.lang) : null}
            fallback={
              <span className="grid size-full place-items-center" style={{ background: `color-mix(in oklab, ${LANE_HUE[lane]} 20%, var(--color-surface))`, color: LANE_HUE[lane] }}>
                <Icon size={20} />
              </span>
            }
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-semibold text-ink-faint">{LANE_NAME[lane]}</span>
          <span lang={step.type === 'pick' ? guide.lang : undefined} className="block font-serif text-[17px] leading-snug font-semibold">
            {title}
          </span>
          <span className="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-ink-soft">{step.reason}</span>
        </span>
      </Link>
    </Card>
  );
}
