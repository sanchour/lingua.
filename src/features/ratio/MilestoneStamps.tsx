// Collectible milestone stamps ("Stamps, not points") and custom self-set learner rewards (6-17, F1167, F1168, F1178).
// Designed in the bookish handbook style: scalloped perforated edges, vintage postmark cancellation marks, and calm celebration.

import { useState } from 'react';
import { Award, BookOpen, Calendar, Check, Clock, Compass, Feather, Flame, Gift, Headphones, Layers, MessageSquare, Mic, Music, PenTool, Plus, Sparkles, Sprout, Sun, Trash2 } from 'lucide-react';
import { checkMilestoneStamps, STAMP_DEFINITIONS } from '@/core/ratio/analytics';
import type { MilestoneStamp } from '@/core/ratio/analytics';
import { patchSetting, useSettings } from '@/data/settings';
import { Button, Drawer } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sprout: Sprout,
  'book-open': BookOpen,
  sparkles: Sparkles,
  compass: Compass,
  feather: Feather,
  layers: Layers,
  'message-square': MessageSquare,
  mic: Mic,
  'pen-tool': PenTool,
  music: Music,
  calendar: Calendar,
  flame: Flame,
  award: Award,
  clock: Clock,
  headphones: Headphones,
  sun: Sun,
};

export function MilestoneStamps({
  knownWords,
  finishedBooks,
  conversations,
  journalEntries,
  songsSung,
  streakDays,
  totalHours,
  unlockedEvents,
}: {
  knownWords: number;
  finishedBooks: number;
  conversations: number;
  journalEntries: number;
  songsSung: number;
  streakDays: number;
  totalHours: number;
  unlockedEvents?: Map<string, number>;
}) {
  const settings = useSettings();
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<MilestoneStamp | null>(null);

  const stamps = checkMilestoneStamps({
    knownWords,
    finishedBooks,
    conversations,
    journalEntries,
    songsSung,
    streakDays,
    totalHours,
    unlockedEvents,
  });

  const unlockedCount = stamps.filter((s) => s.unlockedAt).length;
  const rewards = settings?.habits?.rewards ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-[18px] font-semibold text-ink">Stamps, not points</h3>
          <p className="text-[13px] text-ink-soft">
            Milestones collected as postage marks on your journey ({unlockedCount} of {stamps.length} earned).
          </p>
        </div>
        <Button variant="ghost" icon={Gift} onClick={() => setRewardsOpen(true)}>
          Self-set rewards ({rewards.length})
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        {stamps.map((stamp) => {
          const Icon = ICON_MAP[stamp.iconName] ?? Award;
          const isUnlocked = Boolean(stamp.unlockedAt);
          const reward = rewards.find((r) => r.milestone === stamp.id);

          return (
            <button
              key={stamp.id}
              type="button"
              onClick={() => setSelectedStamp(stamp)}
              className={cx(
                'group relative flex flex-col items-center justify-between rounded-xl border p-3.5 text-center transition-all',
                isUnlocked
                  ? 'border-line-strong bg-surface shadow-xs hover:border-ink hover:shadow-sm'
                  : 'border-dashed border-line bg-surface/40 opacity-55 hover:opacity-75',
              )}
            >
              {/* Scalloped edge visual header */}
              <div className="flex w-full items-center justify-between text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                <span>{stamp.category}</span>
                {isUnlocked ? <Check size={12} className="text-sage" /> : <span>○</span>}
              </div>

              {/* Stamp emblem */}
              <div className="my-2 flex size-14 items-center justify-center rounded-full border border-dashed p-2 transition-transform group-hover:scale-105"
                style={{
                  borderColor: isUnlocked ? 'var(--ink)' : 'var(--line-strong)',
                  background: isUnlocked ? 'color-mix(in oklab, var(--sage) 12%, var(--surface))' : 'transparent',
                }}
              >
                <Icon size={24} className={isUnlocked ? 'text-ink' : 'text-ink-faint'} />
              </div>

              {/* Title & subtitle */}
              <div>
                <p className="font-serif text-[14px] leading-tight font-semibold text-ink">{stamp.title}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-soft">{stamp.subtitle}</p>
              </div>

              {/* Date postmark or lock hint */}
              <div className="mt-2 text-[11px] text-ink-faint">
                {stamp.unlockedAt ? (
                  <span className="font-mono text-[10.5px]">
                    {new Date(stamp.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                ) : (
                  <span>{stamp.criteria}</span>
                )}
              </div>

              {/* Associated learner reward badge */}
              {reward && (
                <div className="mt-1.5 flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent-text">
                  <Gift size={10} aria-hidden /> {reward.reward}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Stamp Detail Drawer */}
      {selectedStamp && (
        <Drawer
          open={Boolean(selectedStamp)}
          onClose={() => setSelectedStamp(null)}
          title={selectedStamp.title}
          description={selectedStamp.subtitle}
        >
          <div className="space-y-5 text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full border-2 border-dashed border-ink bg-surface p-4">
              {(() => {
                const Icon = ICON_MAP[selectedStamp.iconName] ?? Award;
                return <Icon size={36} className="text-ink" />;
              })()}
            </div>
            <div>
              <p className="text-[14px] text-ink-soft">{selectedStamp.criteria}</p>
              {selectedStamp.unlockedAt && (
                <p className="mt-1 text-[13px] font-semibold text-sage">
                  Stamped on {new Date(selectedStamp.unlockedAt).toLocaleDateString(undefined, { dateStyle: 'full' })}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-line bg-raised p-4 text-left">
              <p className="text-[12px] font-bold tracking-wider text-ink-faint uppercase">Self-Set Reward</p>
              {(() => {
                const existing = rewards.find((r) => r.milestone === selectedStamp.id);
                if (existing) {
                  return (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-ink">{existing.reward}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={async () => {
                          const updated = rewards.filter((r) => r.id !== existing.id);
                          await patchSetting('habits', { rewards: updated });
                          toast('Reward removed.');
                        }}
                      />
                    </div>
                  );
                }
                return (
                  <div className="mt-2">
                    <p className="text-[13px] text-ink-soft">No personal reward set for this milestone yet.</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      icon={Plus}
                      onClick={() => {
                        setSelectedStamp(null);
                        setRewardsOpen(true);
                      }}
                    >
                      Set a personal reward
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
        </Drawer>
      )}

      {/* Rewards Manager Drawer */}
      <RewardsDrawer open={rewardsOpen} onClose={() => setRewardsOpen(false)} />
    </div>
  );
}

function RewardsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings();
  const rewards = settings?.habits?.rewards ?? [];
  const [milestoneId, setMilestoneId] = useState(STAMP_DEFINITIONS[0].id);
  const [rewardText, setRewardText] = useState('');

  const addReward = async () => {
    if (!rewardText.trim()) return;
    const newReward = {
      id: crypto.randomUUID(),
      milestone: milestoneId,
      reward: rewardText.trim(),
    };
    await patchSetting('habits', { rewards: [...rewards, newReward] });
    setRewardText('');
    toast('Custom learner reward saved!', { tone: 'success' });
  };

  const removeReward = async (id: string) => {
    await patchSetting('habits', { rewards: rewards.filter((r) => r.id !== id) });
    toast('Reward removed.');
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Self-set learner rewards"
      description="Celebrate meaningful progress on your own terms. Connect a real-world treat to a study milestone."
    >
      <div className="space-y-6">
        <div className="space-y-3 rounded-2xl border border-line bg-raised p-4">
          <p className="text-[13px] font-semibold text-ink">Set a new reward</p>
          <div className="space-y-2">
            <label className="block text-[12px] font-bold text-ink-faint uppercase">When I reach milestone</label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-[14px] outline-none"
            >
              {STAMP_DEFINITIONS.map((def) => (
                <option key={def.id} value={def.id}>
                  {def.title} ({def.criteria})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[12px] font-bold text-ink-faint uppercase">My reward will be</label>
            <input
              type="text"
              placeholder="e.g. Order a novel in Spanish, visit an authentic bistro, buy coffee"
              value={rewardText}
              onChange={(e) => setRewardText(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-[14px] outline-none"
            />
          </div>
          <Button block variant="secondary" icon={Plus} onClick={() => void addReward()} disabled={!rewardText.trim()}>
            Save reward
          </Button>
        </div>

        <div>
          <p className="mb-2 text-[12px] font-bold tracking-wider text-ink-faint uppercase">Your promised rewards</p>
          {rewards.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">No custom rewards set yet. What would delight you upon reaching 1,000 words or finishing a book?</p>
          ) : (
            <ul className="space-y-2">
              {rewards.map((r) => {
                const stamp = STAMP_DEFINITIONS.find((s) => s.id === r.milestone);
                return (
                  <li key={r.id} className="flex items-center justify-between rounded-xl border border-line bg-surface p-3">
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{r.reward}</p>
                      <p className="text-[12px] text-ink-soft">Upon reaching: {stamp?.title ?? r.milestone}</p>
                    </div>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => void removeReward(r.id)} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}
