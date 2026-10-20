// Sonus's pages also open inside Sonus+ (whose addresses start /cantus): opened from there, their
// links stay in the room, and "back" returns to the room's tab instead of to Sonus.
import { lastRoomPath } from '@/features/cantus/room/nav';

const inRoom = () => typeof window !== 'undefined' && /\/cantus(?:\/|$)/.test(window.location.pathname);

/** Where an episode, a podcast, a book or a station opens: in the room, or in Sonus. */
export const sonusBase = () => (inRoom() ? '/cantus' : '/sonus');

/** Back from one of them: the room's last tab, or Sonus. */
export const sonusHome = () => (inRoom() ? lastRoomPath() : '/sonus');
