import { AR } from './ar';
import { DE } from './de';
import { ES } from './es';
import { FR } from './fr';
import { RU } from './ru';
import type { SoundSystem } from './types';
import { ZH } from './zh';

export * from './types';
export const SOUND_SYSTEMS: Record<string, SoundSystem> = { es: ES, fr: FR, de: DE, ru: RU, ar: AR, zh: ZH };

/** The sounds of a language (the six core languages have them). */
export const soundSystemOf = (lang: string): SoundSystem | undefined => SOUND_SYSTEMS[lang];
