import { GraduationCap, Volume2 } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { Button, Select, Slider, ToggleRow } from '@/design/primitives';
import { speak, useVoices } from '@/services/speech/tts';
import { SettingsSection } from '../SettingsSection';
import { useDraft } from '../useDraft';

const AUTO = '__auto';

export function StudySection({ study, speech, lang }: { study: Settings['study']; speech: Settings['speech']; lang: string }) {
  const [newPerDay, setNewPerDay] = useDraft(study.newPerDay, (v) => void patchSetting('study', { newPerDay: v }));
  const [retention, setRetention] = useDraft(Math.round(study.desiredRetention * 100), (v) => void patchSetting('study', { desiredRetention: v / 100 }));
  const [rate, setRate] = useDraft(speech.rate, (v) => void patchSetting('speech', { rate: v }));
  const voices = useVoices(lang);
  const language = getLanguage(lang);
  const sample = language?.sample.split(/(?<=[.!?…])\s/)[0] ?? '';

  return (
    <SettingsSection id="study" icon={GraduationCap} title="Study" description="How flashcards and Ludus behave. Each deck can change its own pace in its settings.">
      <Slider label="New cards a day, for new decks" value={newPerDay} min={0} max={60} onChange={setNewPerDay} />
      <Slider label="Remember, for new decks" value={retention} min={80} max={97} onChange={setRetention} format={(v) => `${v}%`} />
      <div className="divide-y divide-line">
        <ToggleRow
          title="Ludus counts as review"
          description="Answers on due cards move them along the schedule. Extra practice never does."
          checked={study.ludusAffectsSchedule}
          onChange={(v) => void patchSetting('study', { ludusAffectsSchedule: v })}
        />
        <ToggleRow
          title="Settled cards become Known"
          description="When a card’s interval reaches three weeks, its word stops being highlighted in your books."
          checked={study.autoPromoteMature}
          onChange={(v) => void patchSetting('study', { autoPromoteMature: v })}
        />
      </div>

      <h3 className="mt-6 mb-1 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Voice</h3>
      {voices.length ? (
        <>
          <p className="mb-3 text-[13px] text-ink-soft">Words are read aloud by this device’s own {language?.name} voices, offline. Listening exercises use them too.</p>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Select
                label={`${language?.name} voice`}
                hideLabel
                value={speech.voices[lang] ?? AUTO}
                onChange={(v) => void patchSetting('speech', { voices: { ...speech.voices, [lang]: v === AUTO ? '' : v } })}
                options={[{ value: AUTO, label: `Best available (${voices[0].name})` }, ...voices.map((v) => ({ value: v.voiceURI, label: `${v.name} · ${v.lang}` }))]}
              />
            </div>
            <Button variant="secondary" icon={Volume2} onClick={() => void speak(sample, lang, { rate, voiceUri: speech.voices[lang] || undefined })}>
              Listen
            </Button>
          </div>
          <Slider label="Speed" value={rate} min={0.6} max={1.3} step={0.05} onChange={setRate} format={(v) => `${v.toFixed(2)}×`} />
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-ink-soft">
          This device has no {language?.name} voice yet, so listening exercises are left out. On iPhone, add one in Settings › Accessibility › Spoken Content › Voices; on Windows, in Settings › Time &amp; language › Speech.
        </p>
      )}
    </SettingsSection>
  );
}
