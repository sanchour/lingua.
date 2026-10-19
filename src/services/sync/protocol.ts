// Syncing two paired devices over any two-way channel (WebRTC in the app, a pair of queues in the
// tests). Each first proves it knows the pairing's secret; only then does each send the other a
// backup and merge what it receives. Nothing is sent or accepted before the proof.

export type SyncMessage =
  | { t: 'hello'; v: 1; device: string; name: string; nonce: string }
  | { t: 'proof'; mac: string }
  | { t: 'backup'; zip: ArrayBuffer }
  | { t: 'merged'; added: number; updated: number }
  | { t: 'bye'; reason: string };

export interface Channel {
  send(message: SyncMessage): void;
  onMessage(listener: (message: SyncMessage) => void): void;
  close(): void;
}

export interface SessionSide {
  secret: string;
  /** This device's id and name. */
  device: string;
  name: string;
  makeBackup(): Promise<ArrayBuffer>;
  applyBackup(zip: ArrayBuffer): Promise<{ added: number; updated: number }>;
}

export interface SyncOutcome {
  partner: { id: string; name: string };
  /** What this device took in from the other. */
  received: { added: number; updated: number };
  /** What the other device took in from this one. */
  sent: { added: number; updated: number };
}

export class SyncError extends Error {}

/** Characters of a pairing code: no I, L, O or U, so it reads aloud and types without mix-ups. */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 16;

/** A new pairing secret: 16 characters, 80 random bits. */
export function newSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => CODE_ALPHABET[b % 32]).join('');
}

/** A code as typed ("abcd-efgh ijkl mn0p", O for 0, I or L for 1), or null when it can't be one. */
export function readCode(input: string): string | null {
  const clean = input
    .toUpperCase()
    .replace(/^LINGUA-PAIR:/, '')
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return clean.length === CODE_LENGTH && [...clean].every((c) => CODE_ALPHABET.includes(c)) ? clean : null;
}

/** A code in groups of four, to read and type. */
export const showCode = (secret: string) => secret.match(/.{1,4}/g)!.join('-');

/** What the QR code holds. */
export const qrText = (secret: string) => `LINGUA-PAIR:${secret}`;

const hex = (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Where the two devices of a pairing meet on the broker: only someone with the secret knows. */
export async function meetingId(secret: string, role: 'a' | 'b'): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`lingua-sync:${secret}:${role}`));
  return `lingua-${hex(digest).slice(0, 32)}`;
}

async function mac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

/**
 * One sync between two devices: hello (with a fresh challenge) → proof (the challenge signed with
 * the secret) → each side's backup → each says what it merged. Resolves when both are merged.
 */
export function runSession(channel: Channel, side: SessionSide, timeoutMs = 180_000): Promise<SyncOutcome> {
  return new Promise((resolve, reject) => {
    const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
    let partner: { id: string; name: string } | null = null;
    let trusted = false;
    let received: SyncOutcome['received'] | null = null;
    let sent: SyncOutcome['sent'] | null = null;
    let over = false;

    const finish = (error?: Error) => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve({ partner: partner!, received: received!, sent: sent! });
    };
    const fail = (reason: string) => {
      try {
        channel.send({ t: 'bye', reason });
      } catch {
        // The channel is already gone.
      }
      finish(new SyncError(reason));
    };
    const timer = setTimeout(() => fail('The other device stopped answering.'), timeoutMs);
    const check = () => received && sent && finish();

    channel.onMessage((message) => {
      void (async () => {
        if (over) return;
        switch (message.t) {
          case 'hello':
            if (message.v !== 1) return fail('The other device has a different version of Lingua. Update both.');
            partner = { id: message.device, name: message.name };
            channel.send({ t: 'proof', mac: await mac(side.secret, `proof|${message.nonce}|${side.device}`) });
            return;
          case 'proof': {
            if (!partner) return fail('The other device skipped its hello.');
            const expected = await mac(side.secret, `proof|${nonce}|${partner.id}`);
            if (message.mac !== expected) return fail('That device isn’t paired with this one.');
            trusted = true;
            channel.send({ t: 'backup', zip: await side.makeBackup() });
            return;
          }
          case 'backup':
            if (!trusted) return fail('A backup came before the other device proved who it is.');
            received = await side.applyBackup(message.zip);
            channel.send({ t: 'merged', ...received });
            return check();
          case 'merged':
            sent = { added: message.added, updated: message.updated };
            return check();
          case 'bye':
            return finish(new SyncError(message.reason));
        }
      })().catch((e: unknown) => fail(e instanceof Error ? e.message : 'The sync failed.'));
    });

    channel.send({ t: 'hello', v: 1, device: side.device, name: side.name, nonce });
  });
}
