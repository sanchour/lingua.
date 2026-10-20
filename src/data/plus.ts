// Lingua+ (Lingua 4.0-1): a one-time purchase that unlocks everything; the free edition has Codex
// and Thesaurus. A PLACEHOLDER for now: the button charges nothing and nothing is locked. What it
// stores is one number on this device, when "bought", which Ordo can take away again.
import { patchSetting } from './settings';
import type { Settings } from './settings';

/** The price, in the shop's currency (to be set when real purchases come). */
export const PLUS_PRICE = '29.99';

/** What the free edition has, and what Lingua+ adds. */
export const FREE_ROOMS = ['Codex', 'Thesaurus'];
export const PLUS_ROOMS = ['Sonus', 'Visio', 'Mundus', 'Grammatica', 'Colloquium', 'Ratio'];

export const hasPlus = (meta: Settings['meta']): boolean => typeof meta.plusAt === 'number';

/** "Buys" Lingua+. Nothing is charged: this is the placeholder. */
export const getPlus = () => patchSetting('meta', { plusAt: Date.now() });

/** Takes Lingua+ away again (Ordo › Lingua+ › Reset). */
export const resetPlus = () => patchSetting('meta', { plusAt: null });
