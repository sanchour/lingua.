// Device-to-device sync over WebRTC. PeerJS's public broker only introduces the two devices (each
// registers at a meeting place only the pairing's secret can name); the data goes directly between
// them, encrypted by WebRTC, or through PeerJS's relay when a network blocks direct links (still
// encrypted, never stored). No accounts, and nothing kept on a server.
import type { DataConnection, Peer } from 'peerjs';
import { create } from 'zustand';
import { exportBackup, readBackup, restoreBackup } from '@/data/backup';
import { getSettings, patchSetting } from '@/data/settings';
import type { PairedDevice } from '@/data/settings';
import { meetingId, newSecret, readCode, runSession, SyncError } from './protocol';
import type { Channel, SessionSide, SyncMessage, SyncOutcome } from './protocol';

export type PairState = { status: 'waiting' | 'syncing' | 'synced' | 'offline' | 'error'; message?: string };

interface SyncStore {
  /** Per pairing (by its secret). */
  pairs: Record<string, PairState>;
  /** This device showing a code for another to join. */
  showing: { secret: string; status: 'starting' | 'waiting' | 'syncing' | 'done' | 'error'; message?: string; partner?: string } | null;
  /** This device joining another's code. */
  joining: { status: 'connecting' | 'syncing' | 'done' | 'error'; message?: string; partner?: string } | null;
}

export const useSyncStore = create<SyncStore>(() => ({ pairs: {}, showing: null, joining: null }));

const setPair = (secret: string, state: PairState) => useSyncStore.setState((s) => ({ pairs: { ...s.pairs, [secret]: state } }));

/** What this device is called on the other one. */
export function deviceName(): string {
  if (typeof navigator === 'undefined') return 'This device';
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/CrOS/.test(ua)) return 'Chromebook';
  return 'Computer';
}

async function localSide(secret: string): Promise<SessionSide> {
  const settings = await getSettings();
  return {
    secret,
    device: settings.meta.deviceId,
    name: deviceName(),
    makeBackup: async () => (await exportBackup({ includeMedia: false, includeApiKeys: settings.sync.includeApiKeys, markBackup: false })).arrayBuffer(),
    applyBackup: async (zip) => {
      const summary = await restoreBackup(await readBackup(new Blob([zip])), 'merge');
      return { added: summary.added, updated: summary.updated };
    },
  };
}

/** A PeerJS connection as a channel; messages that arrive before anyone listens are kept. */
function channelOf(conn: DataConnection): Channel {
  const early: SyncMessage[] = [];
  let listener: ((m: SyncMessage) => void) | null = null;
  conn.on('data', (data) => (listener ? listener(data as SyncMessage) : early.push(data as SyncMessage)));
  return {
    send: (m) => void conn.send(m),
    onMessage: (l) => {
      listener = l;
      early.splice(0).forEach(l);
    },
    close: () => conn.close(),
  };
}

type PeerError = Error & { type?: string };

/** Registers this device at a meeting place on the broker. */
async function openPeer(id: string): Promise<Peer> {
  const { Peer } = await import('peerjs');
  return new Promise((resolve, reject) => {
    const peer = new Peer(id, { debug: 0 });
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new SyncError('Couldn’t reach the sync service. Check the connection.'));
    }, 15_000);
    peer.once('open', () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.once('error', (e: PeerError) => {
      clearTimeout(timer);
      peer.destroy();
      reject(
        new SyncError(
          e.type === 'unavailable-id' ? 'This pairing is already open in another tab or window of Lingua.' : e.type === 'browser-incompatible' ? 'This browser can’t sync devices.' : 'Couldn’t reach the sync service. Check the connection.',
        ),
      );
    });
  });
}

/** Opens a connection to the other device's meeting place; fails quickly when it isn't there. */
function connectTo(peer: Peer, id: string): Promise<DataConnection> {
  return new Promise((resolve, reject) => {
    const conn = peer.connect(id, { reliable: true, serialization: 'binary' });
    const done = (error?: Error) => {
      clearTimeout(timer);
      peer.off('error', onError);
      if (error) {
        conn.close();
        reject(error);
      } else resolve(conn);
    };
    const onError = (e: PeerError) => e.type === 'peer-unavailable' && done(new SyncError('The other device isn’t open right now.'));
    const timer = setTimeout(() => done(new SyncError('The other device didn’t answer. Both need to be online.')), 20_000);
    peer.on('error', onError);
    conn.once('open', () => done());
    conn.once('error', () => done(new SyncError('The connection to the other device failed.')));
  });
}

async function session(conn: DataConnection, secret: string): Promise<SyncOutcome> {
  const channel = channelOf(conn);
  try {
    return await runSession(channel, await localSide(secret));
  } finally {
    setTimeout(() => channel.close(), 500);
  }
}

// ── Paired devices: each listens at its own meeting place and calls the other's ─────────────────

const live = new Map<string, { peer: Peer; busy: boolean }>();

async function updateDevice(secret: string, patch: Partial<PairedDevice>) {
  const { sync } = await getSettings();
  await patchSetting('sync', { devices: sync.devices.map((d) => (d.secret === secret ? { ...d, ...patch } : d)) });
}

async function addDevice(device: PairedDevice) {
  const { sync } = await getSettings();
  // Paired again with the same device: the new pairing replaces the old one.
  await patchSetting('sync', { devices: [...sync.devices.filter((d) => d.id !== device.id), device] });
}

async function syncOver(conn: DataConnection, secret: string): Promise<SyncOutcome | null> {
  const entry = live.get(secret);
  if (entry?.busy) {
    conn.close();
    return null;
  }
  if (entry) entry.busy = true;
  setPair(secret, { status: 'syncing' });
  try {
    const outcome = await session(conn, secret);
    await updateDevice(secret, { lastSyncAt: Date.now(), name: outcome.partner.name });
    setPair(secret, { status: 'synced' });
    return outcome;
  } catch (e) {
    setPair(secret, { status: 'error', message: e instanceof Error ? e.message : 'The sync failed.' });
    return null;
  } finally {
    if (entry) entry.busy = false;
  }
}

const whenOpen = (conn: DataConnection, go: () => void) => (conn.open ? go() : void conn.once('open', go));

/** Answers the other device of a pairing whenever it calls this meeting place. */
function attach(peer: Peer, secret: string) {
  peer.on('connection', (conn) => whenOpen(conn, () => void syncOver(conn, secret)));
  peer.on('disconnected', () => setPair(secret, { status: 'offline' }));
}

/** Keeps this device reachable for one pairing, answering the other device when it calls. */
async function listen(device: PairedDevice): Promise<Peer> {
  const existing = live.get(device.secret);
  if (existing && !existing.peer.destroyed) {
    if (existing.peer.disconnected) existing.peer.reconnect();
    return existing.peer;
  }
  const peer = await openPeer(await meetingId(device.secret, device.role));
  live.set(device.secret, { peer, busy: false });
  attach(peer, device.secret);
  setPair(device.secret, { status: 'waiting' });
  return peer;
}

/** Syncs with one paired device now, if it's open. */
export async function syncWith(device: PairedDevice): Promise<SyncOutcome | null> {
  try {
    const peer = await listen(device);
    if (live.get(device.secret)?.busy) return null;
    const conn = await connectTo(peer, await meetingId(device.secret, device.role === 'a' ? 'b' : 'a'));
    return await syncOver(conn, device.secret);
  } catch (e) {
    setPair(device.secret, { status: e instanceof SyncError && /isn’t open|didn’t answer/.test(e.message) ? 'waiting' : 'error', message: e instanceof Error ? e.message : undefined });
    return null;
  }
}

/** Syncs with every paired device that's open; how many it reached. */
export async function syncAll(): Promise<number> {
  const { sync } = await getSettings();
  const outcomes = await Promise.all(sync.devices.map(syncWith));
  return outcomes.filter(Boolean).length;
}

/** Forgets a paired device (the other keeps its side until it's forgotten there too). */
export async function forgetDevice(secret: string) {
  live.get(secret)?.peer.destroy();
  live.delete(secret);
  const { sync } = await getSettings();
  await patchSetting('sync', { devices: sync.devices.filter((d) => d.secret !== secret) });
  useSyncStore.setState((s) => {
    const pairs = { ...s.pairs };
    delete pairs[secret];
    return { pairs };
  });
}

let started = false;

/** Called once the app is open: syncs now, every ten minutes while open, and on coming back to it. */
export function startAutoSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const run = () => void getSettings().then((s) => s.sync.devices.length && syncAll());
  run();
  setInterval(() => document.visibilityState === 'visible' && run(), 10 * 60_000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && run());
}

// ── Pairing ──────────────────────────────────────────────────────────────────────────────────────

let showingPeer: Peer | null = null;

/** Shows a new code on this device and waits for another device to join it. */
export async function showCode(): Promise<void> {
  cancelPairing();
  const secret = newSecret();
  useSyncStore.setState({ showing: { secret, status: 'starting' } });
  try {
    const peer = await openPeer(await meetingId(secret, 'a'));
    if (useSyncStore.getState().showing?.secret !== secret) return void peer.destroy();
    showingPeer = peer;
    useSyncStore.setState({ showing: { secret, status: 'waiting' } });
    peer.on('connection', (conn) => {
      // Once paired, later calls are syncs (answered by attach()).
      if (live.has(secret)) return;
      const go = async () => {
        useSyncStore.setState({ showing: { secret, status: 'syncing' } });
        try {
          const outcome = await session(conn, secret);
          await addDevice({ id: outcome.partner.id, name: outcome.partner.name, secret, role: 'a', pairedAt: Date.now(), lastSyncAt: Date.now() });
          // This meeting place now belongs to the pairing.
          showingPeer = null;
          live.set(secret, { peer, busy: false });
          attach(peer, secret);
          setPair(secret, { status: 'synced' });
          useSyncStore.setState({ showing: { secret, status: 'done', partner: outcome.partner.name } });
        } catch (e) {
          useSyncStore.setState({ showing: { secret, status: 'error', message: e instanceof Error ? e.message : 'Pairing failed.' } });
        }
      };
      whenOpen(conn, () => void go());
    });
  } catch (e) {
    useSyncStore.setState({ showing: { secret, status: 'error', message: e instanceof Error ? e.message : 'Pairing failed.' } });
  }
}

/** Joins the code another device is showing; pairs and syncs. */
export async function joinCode(input: string): Promise<boolean> {
  const secret = readCode(input);
  if (!secret) {
    useSyncStore.setState({ joining: { status: 'error', message: 'That isn’t a pairing code. It has 16 letters and numbers.' } });
    return false;
  }
  useSyncStore.setState({ joining: { status: 'connecting' } });
  let peer: Peer | null = null;
  try {
    peer = await openPeer(await meetingId(secret, 'b'));
    const conn = await connectTo(peer, await meetingId(secret, 'a')).catch(() => {
      throw new SyncError('No device is showing that code right now. Keep the code open on the other device and try again.');
    });
    useSyncStore.setState({ joining: { status: 'syncing' } });
    const outcome = await session(conn, secret);
    await addDevice({ id: outcome.partner.id, name: outcome.partner.name, secret, role: 'b', pairedAt: Date.now(), lastSyncAt: Date.now() });
    live.set(secret, { peer, busy: false });
    attach(peer, secret);
    setPair(secret, { status: 'synced' });
    useSyncStore.setState({ joining: { status: 'done', partner: outcome.partner.name } });
    return true;
  } catch (e) {
    peer?.destroy();
    useSyncStore.setState({ joining: { status: 'error', message: e instanceof Error ? e.message : 'Pairing failed.' } });
    return false;
  }
}

/** Stops showing a code (and forgets a finished pairing screen). */
export function cancelPairing() {
  showingPeer?.destroy();
  showingPeer = null;
  useSyncStore.setState({ showing: null, joining: null });
}
