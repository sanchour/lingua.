import { describe, expect, it } from 'vitest';
import { signLicence, verifyLicence } from '@/services/licence/licence';
import type { LicencePayload } from '@/services/licence/licence';
import { aiBlock, aiKeys, can, FEATURE_PLAN, MAX_GRACE_MS, migratePlan, planOf } from './plan';
import type { Feature, PlanKind } from './plan';
import { DEFAULT_SETTINGS } from './settings';

const meta = DEFAULT_SETTINGS.meta;
const DAY = 86_400_000;

describe('what each plan opens', () => {
  const free: Feature[] = [];
  const plus: Feature[] = ['ludus', 'sonusPlus', 'streaming', 'course', 'grammatica', 'typing', 'sermo'];
  const max: Feature[] = ['ai'];

  it.each<[PlanKind, Feature[]]>([
    ['free', free],
    ['plus', plus],
    ['max', [...plus, ...max]],
  ])('%s opens exactly its features', (plan, opens) => {
    for (const f of Object.keys(FEATURE_PLAN) as Feature[]) expect(can(f, plan), `${plan} / ${f}`).toBe(opens.includes(f));
  });
});

describe('the plan in force', () => {
  const now = 1_800_000_000_000;

  it('is free with nothing bought', () => {
    expect(planOf(meta, now)).toBe('free');
  });

  it('carries Lingua 4.0-1’s placeholder over as Lingua+', () => {
    expect(planOf({ ...meta, plusAt: 5 }, now)).toBe('plus');
    expect(migratePlan({ ...meta, plusAt: 5 })).toEqual({ plus: { since: 5 } });
  });

  it('is Max while paid, through the grace, then Lingua+ if bought, else free', () => {
    const max = (until: number) => ({ ...meta, plan: { max: { since: 0, until } } });
    expect(planOf(max(now + DAY), now)).toBe('max');
    expect(planOf(max(now - DAY), now)).toBe('max');
    expect(planOf(max(now - MAX_GRACE_MS - 1), now)).toBe('free');
    expect(planOf({ ...meta, plan: { plus: { since: 1 }, max: { since: 0, until: now - MAX_GRACE_MS - 1 } } }, now)).toBe('plus');
  });

  it('pretends in test mode', () => {
    expect(planOf({ ...meta, plan: { plus: { since: 1 }, pretend: 'free' } }, now)).toBe('free');
  });

  it('gives the AI keys to Max only', () => {
    const apiKeys = { groq: 'test-not-a-real-key', gemini: 'test-not-a-real-key', tmdb: 't', youtube: 'y' };
    expect(aiKeys({ apiKeys, meta: { ...meta, plan: { plus: { since: 1 } } } })).toEqual({ groq: '', gemini: '', tmdb: 't', youtube: 'y' });
    expect(aiKeys({ apiKeys, meta: { ...meta, plan: { pretend: 'max' } } })).toEqual(apiKeys);
  });

  it('says what stops AI: the plan first, then the key', () => {
    const apiKeys = { groq: 'test-not-a-real-key', gemini: '', tmdb: '', youtube: '' };
    expect(aiBlock({ apiKeys, meta }, 'groq')).toBe('max');
    expect(aiBlock({ apiKeys, meta: { ...meta, plan: { pretend: 'max' } } }, 'groq')).toBeNull();
    expect(aiBlock({ apiKeys, meta: { ...meta, plan: { pretend: 'max' } } }, 'gemini')).toBe('key');
  });
});

describe('licences', () => {
  const keys = async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    return { priv: await crypto.subtle.exportKey('jwk', pair.privateKey), pub: await crypto.subtle.exportKey('jwk', pair.publicKey) };
  };
  const payload: LicencePayload = { v: 1, plan: 'max', email: 'learner@example.com', issued: 1, until: 2, interval: 'month' };

  it('holds when signed by the server’s key', async () => {
    const { priv, pub } = await keys();
    expect(await verifyLicence(await signLicence(payload, priv), pub)).toEqual(payload);
  });

  it('fails when edited, signed by another key, or without a key', async () => {
    const { priv, pub } = await keys();
    const other = await keys();
    const licence = await signLicence(payload, priv);
    const [body, sig] = licence.split('.');
    const edited = btoa(JSON.stringify({ ...payload, until: 9e15 })).replaceAll('=', '');
    expect(await verifyLicence(`${edited}.${sig}`, pub)).toBeNull();
    expect(await verifyLicence(licence, other.pub)).toBeNull();
    expect(await verifyLicence(licence, null)).toBeNull();
    expect(await verifyLicence(`${body}`, pub)).toBeNull();
    expect(await verifyLicence('not a licence', pub)).toBeNull();
  });
});
