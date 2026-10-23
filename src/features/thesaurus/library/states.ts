/** Learning in amber, to review in blue: fixed, unlike the accent, which every palette changes (amber in Charcoal, green in Sage). */
const LEARNING = '#d49b54';
export const REVIEW = '#6a90b4';

/** Today's three kinds of work, in Anki's order, with one colour each in the pills, the Today ring and the card list (5.1-3b). */
export const CARD_STATES = [
  { key: 'new', label: 'new', color: 'var(--sage)', pill: 'bg-sage-soft text-sage-text' },
  { key: 'learning', label: 'learning', color: LEARNING, pill: 'bg-[color-mix(in_oklab,#d49b54_20%,transparent)] text-[color-mix(in_oklab,#d49b54_62%,var(--ink))]' },
  { key: 'due', label: 'to review', color: REVIEW, pill: 'bg-[color-mix(in_oklab,#6a90b4_20%,transparent)] text-[color-mix(in_oklab,#6a90b4_62%,var(--ink))]' },
] as const;

const DAY = 86_400_000;

/** When a deck was last studied, the way a person says it. */
export function studiedAgo(at: number | undefined, now = Date.now()): string {
  if (!at) return 'Not yet';
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (at >= today.getTime()) return 'Today';
  const days = Math.ceil((today.getTime() - at) / DAY);
  if (days <= 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return days < 14 ? 'A week ago' : `${Math.floor(days / 7)} weeks ago`;
  const date = new Date(at);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
