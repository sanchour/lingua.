import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronDown, ExternalLink, Loader2, Volume2 } from 'lucide-react';
import { SOUNDS_LANGS } from '@/core/audio/recordings';
import { getLanguage } from '@/core/lang/languages';
import { accentName, otherLocales, voiceLocale } from '@/core/lang/voiceLocale';
import { aiBlock, aiKeys } from '@/data/plan';
import { setSetting, useSettings } from '@/data/settings';
import type { LanguageProfile } from '@/data/types';
import { Button, Switch } from '@/design/primitives';
import { useSpeaker } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';
import { listVoices } from '@/services/speech/gemini';
import { heardRecordings } from '@/services/speech/recordings';
import type { GeminiVoice } from '@/services/speech/gemini';
import { listDeviceVoices, resetSpeakers, sayOnDevice, sayWith, speak, voiceQuality } from '@/services/speech/voice';
import type { VoiceQuality } from '@/services/speech/voice';
import { toast } from '@/state/ui';

const fail = (e: unknown) => toast(e instanceof Error ? e.message : 'Couldn’t speak that.', { tone: 'error' });

const QUALITY: Record<VoiceQuality, string> = { natural: 'Natural', good: 'Good', robotic: 'Robotic' };

/** How to get a natural voice when the device only has the old robotic one. */
const BETTER_VOICE =
  typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)
    ? 'For a natural one, download a Premium or Enhanced voice in System Settings › Accessibility › Spoken Content › System voice › Manage Voices, then come back here.'
    : 'For a natural one, open Lingua in Microsoft Edge: it has online natural voices for this language on every Windows computer (Chrome only has the system’s voices).';

/** Settings › Languages › Voice: who reads the language aloud, in which accent, and another voice to pick. */
export function VoicePanel({ active }: { active: LanguageProfile }) {
  const settings = useSettings();
  const { speaker } = useSpeaker(active.id);
  const [voices, setVoices] = useState<GeminiVoice[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [trying, setTrying] = useState<string | null>(null);
  const [onDevice, setOnDevice] = useState<SpeechSynthesisVoice[] | null>(null);
  const info = getLanguage(active.id);
  const locale = voiceLocale(active.id, active.flag);
  const name = info?.name ?? active.id;
  const voice = settings?.voice ?? { off: false, chosen: {} };
  const key = settings ? aiKeys(settings).gemini.trim() : '';
  const addKey = settings && aiBlock(settings, 'gemini') === 'max' ? ' Gemini’s natural voices come with Lingua+ Max.' : ' Add a free Gemini key in AI and translation for Gemini’s natural voices.';
  const sample = info?.sample ?? '';
  const recorded = SOUNDS_LANGS.includes(active.id) && !voice.off && speaker?.kind !== 'gemini';
  const people = recorded ? ` Common words are said by real people: Lingua Libre and Wiktionary speakers on Wikimedia Commons.` : '';

  const status = !speaker
    ? 'Finding a voice…'
    : speaker.kind === 'gemini'
      ? `Gemini’s voice ${speaker.voice.name}, ${accentName(speaker.locale)}. Each word is made once and kept on this device.`
      : speaker.kind === 'device'
        ? `This device’s voice ${speaker.voice.name} (${accentName(speaker.locale)}).${people}${key ? '' : addKey}`
        : speaker.why === 'off'
          ? 'Reading aloud is off.'
          : speaker.why === 'no-locale'
            ? `${name} has no natural voice anywhere, so nothing is read aloud.`
            : recorded
              ? `No natural voice for ${accentName(speaker.locale ?? '')} on this device${key ? ', and Gemini has none for it yet' : ''}, so only common words can be heard, said by real people (Lingua Libre and Wiktionary speakers on Wikimedia Commons).${key ? '' : addKey}`
              : `No natural voice for ${accentName(speaker.locale ?? '')} on this device${key ? ', and Gemini has none for it yet' : ''}, so there are no speaker buttons.${key ? '' : addKey}`;

  const findVoices = async () => {
    if (!locale) return;
    setLoading(true);
    try {
      const lists = await Promise.all([locale, ...otherLocales(active.id, active.flag)].map((l) => listVoices(key, l).catch(() => [] as GeminiVoice[])));
      setVoices(lists.flat());
    } finally {
      setLoading(false);
    }
  };

  const choose = async (v: GeminiVoice) => {
    if (!locale) return;
    await setSetting('voice', { ...voice, chosen: { ...voice.chosen, [locale]: { id: v.id, name: v.name } } });
    resetSpeakers();
    toast(`${v.name} now reads ${name}.`);
  };

  const findDeviceVoices = async () => {
    if (locale) setOnDevice(await listDeviceVoices(locale));
  };

  const chooseOnDevice = async (v: SpeechSynthesisVoice) => {
    if (!locale) return;
    await setSetting('voice', { ...voice, device: { ...voice.device, [locale]: v.voiceURI } });
    resetSpeakers();
    toast(`${v.name} now reads ${name}.`);
  };

  const tryOnDevice = (v: SpeechSynthesisVoice) => {
    setTrying(v.voiceURI);
    sayOnDevice(v, sample)
      .catch(fail)
      .finally(() => setTrying(null));
  };

  const tryVoice = (v: GeminiVoice) => {
    setTrying(v.id);
    sayWith(v.id, active.id, sample)
      .catch(fail)
      .finally(() => setTrying(null));
  };

  return (
    <div className="mt-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Voice</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{status}</p>
          {speaker?.kind === 'device' && speaker.quality === 'robotic' && <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">It sounds robotic: it’s the only voice for {accentName(speaker.locale)} this device has. {BETTER_VOICE}</p>}
        </div>
        <Switch
          label="Read aloud"
          checked={!voice.off}
          onChange={(on: boolean) => {
            void setSetting('voice', { ...voice, off: !on });
            resetSpeakers();
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {speaker && speaker.kind !== 'none' && sample && (
          <Button variant="secondary" size="sm" icon={Volume2} onClick={() => void speak(active.id, sample, { flag: active.flag }).catch(fail)}>
            Hear a sample
          </Button>
        )}
        {key && locale && !voice.off && (
          <Button variant="ghost" size="sm" onClick={() => void findVoices()} disabled={loading}>
            {loading ? 'Looking for voices…' : voices ? 'Look again' : 'Choose another voice'}
          </Button>
        )}
        {speaker?.kind === 'device' && (
          <Button variant="ghost" size="sm" onClick={() => void findDeviceVoices()}>
            {onDevice ? 'Look again' : 'Voices on this device'}
          </Button>
        )}
      </div>
      {onDevice && speaker?.kind === 'device' && (
        <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-raised">
          {onDevice.map((v) => {
            const current = speaker.voice.voiceURI === v.voiceURI;
            return (
              <li key={v.voiceURI} className="flex items-center gap-3 px-4 py-2.5">
                <button type="button" onClick={() => tryOnDevice(v)} aria-label={`Hear ${v.name}`} className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-soft hover:text-ink">
                  {trying === v.voiceURI ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Volume2 size={16} aria-hidden />}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{v.name}</span>
                  <span className="block truncate text-[12.5px] text-ink-soft">{[QUALITY[voiceQuality(v)], v.localService ? 'on this device' : 'online'].join(' · ')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void chooseOnDevice(v)}
                  className={cx('inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-semibold', current ? 'bg-accent-soft text-accent-text' : 'border border-line hover:bg-sunken')}
                >
                  {current ? (
                    <>
                      <Check size={14} aria-hidden /> In use
                    </>
                  ) : (
                    'Use'
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {recorded && <HeardRecordings lang={active.id} />}
      {voices && (
        <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-raised">
          {!voices.length && <li className="px-4 py-3 text-[13px] text-ink-soft">Gemini lists no voices for {name} in these accents yet.</li>}
          {voices.map((v) => {
            const current = speaker?.kind === 'gemini' && speaker.voice.id === v.id;
            return (
              <li key={`${v.locale}-${v.id}`} className="flex items-center gap-3 px-4 py-2.5">
                <button type="button" onClick={() => tryVoice(v)} aria-label={`Hear ${v.name}`} className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-soft hover:text-ink">
                  {trying === v.id ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Volume2 size={16} aria-hidden />}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{v.name}</span>
                  <span className="block truncate text-[12.5px] text-ink-soft">{[accentName(v.locale), v.gender, v.description].filter(Boolean).join(' · ')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void choose(v)}
                  className={cx('inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-semibold', current ? 'bg-accent-soft text-accent-text' : 'border border-line hover:bg-sunken')}
                >
                  {current ? (
                    <>
                      <Check size={14} aria-hidden /> In use
                    </>
                  ) : (
                    'Use'
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The recordings heard in this language, with who said them and their licence (they ask to be credited). */
function HeardRecordings({ lang }: { lang: string }) {
  const rows = useLiveQuery(() => heardRecordings(lang), [lang]);
  if (!rows?.length) return null;
  return (
    <details className="group mt-3 rounded-2xl border border-line bg-raised">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
        Recordings heard on this device ({rows.length})
        <ChevronDown size={14} className="ml-auto transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="max-h-72 divide-y divide-line overflow-y-auto border-t border-line">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2 text-[13px]">
            <span lang={lang} className="min-w-0 flex-1 truncate font-semibold">
              {r.text}
            </span>
            <span className="truncate text-ink-soft">{[r.credit?.speaker, r.credit?.licence].filter(Boolean).join(' · ')}</span>
            {r.credit?.page && (
              <a href={r.credit.page} target="_blank" rel="noreferrer" aria-label={`The recording of ${r.text} on Wikimedia Commons`} className="shrink-0 text-ink-soft hover:text-ink">
                <ExternalLink size={14} aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
