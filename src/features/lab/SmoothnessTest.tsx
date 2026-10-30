import { useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { Gauge } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import { Badge, Button, ToggleRow } from '@/design/primitives';
import { measureFrames } from '@/services/perf/frames';
import type { FrameStats } from '@/services/perf/frames';
import { Facts, LabCard } from './LabCard';
import { useLabReport } from './report';

const CARDS = Array.from({ length: 24 }, (_, i) => i);

/** Runs a 5-second animation workload typical of Lingua (springs, transforms, opacity) and measures it. */
export function SmoothnessTest({ perfHud }: { perfHud: boolean }) {
  const translateUi = useUi();
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const record = useLabReport((s) => s.record);

  const run = async () => {
    setRunning(true);
    setStats(null);
    // Let the animation start before measuring.
    await new Promise((r) => setTimeout(r, 300));
    const result = await measureFrames(5000);
    setRunning(false);
    setStats(result);
    record('smoothness', { fps: +result.fps.toFixed(1), p95Ms: +result.p95.toFixed(1), worstMs: +result.worst.toFixed(1), dropped: result.dropped, refreshHz: result.refreshHz });
  };

  const pass = stats && stats.fps >= Math.min(58, stats.refreshHz * 0.95);

  return (
    <LabCard icon={Gauge} title={translateUi('Smoothness')} description={translateUi('A 5-second animation benchmark. Goal: 60 fps or the screen’s full rate.')}>
      {/* The benchmark is started on purpose, so it animates even with Reduced Motion on. */}
      <MotionConfig reducedMotion="never">
        <div className="relative h-36 overflow-hidden rounded-2xl border border-line bg-bg">
          <div className="absolute inset-0 grid grid-cols-8 place-items-center gap-2 p-3">
            {CARDS.map((i) => (
              <motion.div
                key={i}
                className="size-9 rounded-xl bg-surface shadow-elev-2"
                animate={running ? { y: [0, -16, 0], rotate: [0, i % 2 ? 8 : -8, 0], scale: [1, 1.08, 1], opacity: [1, 0.7, 1] } : { y: 0, rotate: 0, scale: 1, opacity: 1 }}
                transition={running ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: (i % 8) * 0.06 } : { duration: 0.2 }}
              />
            ))}
          </div>
        </div>
      </MotionConfig>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void run()} loading={running}>
          {running ? translateUi('Measuring…') : translateUi('Run benchmark')}
        </Button>
        {stats && <Badge tone={pass ? 'sage' : 'accent'}>{pass ? translateUi('Smooth') : translateUi('Below target')}</Badge>}
      </div>
      {stats && (
        <div className="mt-4">
          <Facts
            rows={[
              ['Average', `${stats.fps.toFixed(1)} fps`],
              ['95% of frames under', `${stats.p95.toFixed(1)} ms`],
              ['Slowest frame', `${stats.worst.toFixed(1)} ms`],
              ['Dropped frames', `${stats.dropped} of ${stats.frames}`],
              ['Display', `~${stats.refreshHz} Hz${stats.refreshHz <= 32 ? ' (Low Power Mode)' : ''}`],
            ]}
          />
          {stats.refreshHz <= 32 && (
            <p className="mt-2 text-[12px] text-ink-soft">
              macOS Low Power Mode caps display refresh to 30 Hz. Turn off in System Settings › Battery to unlock 60 fps or 120 fps ProMotion.
            </p>
          )}
        </div>
      )}
      <div className="mt-3 border-t border-line">
        <ToggleRow title={translateUi('FPS monitor')} description={translateUi('Keep a live readout on screen while using the app.')} checked={perfHud} onChange={(on) => void patchSetting('ui', { perfHud: on })} />
      </div>
    </LabCard>
  );
}
