import { useState } from 'react';
import { Check, Loader2, Volume2 } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { accentName, otherLocales, voiceLocale } from '@/core/lang/voiceLocale';
import { setSetting, useSettings } from '@/data/settings';
import type { LanguageProfile } from '@/data/types';
import { Button, Switch } from '@/design/primitives';
import { useSpeaker } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';
import { listVoices } from '@/services/speech/gemini';
import type { GeminiVoice } from '@/services/speech/gemini';
import { resetSpeakers, sayWith, speak } from '@/services/speech/voice';
import { toast } from '@/state/ui';

const fail = (e: unknown) => toast(e instanceof Error ? e.message : 'Couldn’t speak that.', { tone: 'error' });

/** Ordo › Languages › Voice: who reads the language aloud, in which accent, and another voice to pick. */
export function VoicePanel({ active }: { active: LanguageProfile }) {
  const settings = useSettings();
  const { speaker } = useSpeaker(active.id);
  const [voices, setVoices] = useState<GeminiVoice[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [trying, setTrying] = useState<string | null>(null);
  const info = getLanguage(active.id);
  const locale = voiceLocale(active.id, active.flag);
  const name = info?.name ?? active.id;
  const voice = settings?.voice ?? { off: false, chosen: {} };
  const key = settings?.apiKeys.gemini.trim() ?? '';
  const sample = info?.sample ?? '';

  const status = !speaker
    ? 'Finding a voice…'
    : speaker.kind === 'gemini'
      ? `Gemini’s voice ${speaker.voice.name}, ${accentName(speaker.locale)}. Each word is made once and kept on this device.`
      : speaker.kind === 'device'
        ? `This device’s voice ${speaker.voice.name} (${accentName(speaker.locale)}).${key ? '' : ' Add a free Gemini key in AI and translation for Gemini’s natural voices.'}`
        : speaker.why === 'off'
          ? 'Reading aloud is off.'
          : speaker.why === 'no-locale'
            ? `${name} has no natural voice anywhere, so nothing is read aloud.`
            : `No natural voice for ${accentName(speaker.locale ?? '')} on this device${key ? ', and Gemini has none for it yet' : ''}, so there are no speaker buttons.${key ? '' : ' Add a free Gemini key in AI and translation for Gemini’s voices.'}`;

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
      </div>
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
