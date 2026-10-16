import { useEffect, useState } from 'react';
import { setDeckDirections, updateDeck } from '@/data/decks';
import type { Card, Deck } from '@/data/types';
import { Button, Drawer, Segmented, Slider } from '@/design/primitives';

type Ways = 'recognition' | 'production' | 'both';
const toWays = (d: Card['direction'][]): Ways => (d.length > 1 ? 'both' : d[0] === 'production' ? 'production' : 'recognition');
const fromWays = (w: Ways): Card['direction'][] => (w === 'both' ? ['recognition', 'production'] : [w]);

/** How a deck is studied: daily pace, how sure you want to be, and in which direction. */
export function DeckSettings({ deck, open, onClose }: { deck: Deck; open: boolean; onClose: () => void }) {
  const [newPerDay, setNewPerDay] = useState(deck.config.newPerDay);
  const [maxReviews, setMaxReviews] = useState(deck.config.maxReviews);
  const [retention, setRetention] = useState(deck.config.desiredRetention);
  const [ways, setWays] = useState<Ways>(toWays(deck.config.directions));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewPerDay(deck.config.newPerDay);
    setMaxReviews(deck.config.maxReviews);
    setRetention(deck.config.desiredRetention);
    setWays(toWays(deck.config.directions));
  }, [open, deck]);

  const save = async () => {
    setBusy(true);
    await updateDeck(deck.id, { config: { ...deck.config, newPerDay, maxReviews, desiredRetention: retention } });
    if (ways !== toWays(deck.config.directions)) await setDeckDirections(deck.id, fromWays(ways));
    setBusy(false);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Deck settings"
      description={deck.name}
      footer={
        <Button block size="lg" loading={busy} onClick={() => void save()}>
          Save
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Study</p>
          <Segmented<Ways>
            label="Study direction"
            block
            value={ways}
            onChange={setWays}
            options={[
              { value: 'recognition', label: 'Word → meaning' },
              { value: 'production', label: 'Meaning → word' },
              { value: 'both', label: 'Both' },
            ]}
          />
          {ways !== toWays(deck.config.directions) && (
            <p className="mt-2 text-[13px] text-ink-soft">
              {ways === 'both' || !deck.config.directions.includes(ways === 'recognition' ? 'recognition' : 'production')
                ? 'New cards are added for the other direction.'
                : 'Cards for the direction you turn off are removed, with their history.'}
            </p>
          )}
        </div>
        <Slider label="New cards a day" value={newPerDay} min={0} max={100} step={1} onChange={setNewPerDay} format={(v) => String(v)} />
        <Slider label="Reviews a day, at most" value={maxReviews} min={20} max={1000} step={10} onChange={setMaxReviews} format={(v) => String(v)} />
        <div>
          <Slider label="Remember" value={Math.round(retention * 100)} min={80} max={97} step={1} onChange={(v) => setRetention(v / 100)} format={(v) => `${v}%`} />
          <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
            How sure you want to be of remembering a card when it comes back. Higher means more reviews; 90% is a calm balance.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
