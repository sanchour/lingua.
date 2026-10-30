import { UiText, useUi } from '@/design/i18n/UiText';
// Settings panel for 6-15 (The tutor, in context):
// Configures tutor preset (Teacher, Editor, Coach), explanation complexity,
// target language exposure ratio, correction strictness, speech speed, and learner interests.
import { useState } from 'react';
import { Bot, Check, GraduationCap, Heart, PenTool, Volume2 } from 'lucide-react';
import { patchSetting, TUTOR_PRESETS } from '@/data/settings';
import type {
  Settings,
  TutorComplexity,
  TutorCorrection,
  TutorExposure,
  TutorPreset,
  TutorSentenceLength,
  TutorSettings,
  TutorTranslation,
} from '@/data/settings';
import { Badge, Button, Segmented, Select, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';

const COMMON_INTERESTS = [
  'Travel & culture',
  'Literature & poetry',
  'Food & cooking',
  'History & philosophy',
  'Cinema & arts',
  'Music & theatre',
  'Nature & outdoors',
  'Science & tech',
  'Everyday conversation',
];

interface TutorSettingsPanelProps {
  tutor: Settings['tutor'];
}

export function TutorSettingsPanel({ tutor }: TutorSettingsPanelProps) {
  const translateUi = useUi();
  const [customInterest, setCustomInterest] = useState('');

  const update = (patch: Partial<TutorSettings>) => {
    void patchSetting('tutor', patch);
  };

  const applyPreset = (preset: TutorPreset) => {
    const config = TUTOR_PRESETS[preset];
    if (config) {
      update({
        preset,
        ...config.settings,
      });
    }
  };

  const toggleInterest = (interest: string) => {
    const current = tutor.interests ?? [];
    const next = current.includes(interest)
      ? current.filter((i) => i !== interest)
      : [...current, interest];
    update({ interests: next });
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (!trimmed) return;
    const current = tutor.interests ?? [];
    if (!current.includes(trimmed)) {
      update({ interests: [...current, trimmed] });
    }
    setCustomInterest('');
  };

  return (
    <div className="mt-8 rounded-2xl border border-line bg-raised/70 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-accent-text" aria-hidden />
            <h3 className="font-serif text-lg font-semibold text-ink"><UiText source={'The Contextual Tutor'} /></h3>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft"><UiText source={'Customize how your tutor explains nuance, gives hints, and phrases answers across Lingua.'} /></p>
        </div>
        <Badge tone="accent"><UiText source={'Max'} /></Badge>
      </div>

      {/* Persona Presets */}
      <div className="mt-5">
        <label className="mb-2 block text-[12.5px] font-bold tracking-wider text-ink-soft uppercase"><UiText source={'Tutor Preset'} /></label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {(['teacher', 'editor', 'coach'] as TutorPreset[]).map((p) => {
            const presetInfo = TUTOR_PRESETS[p];
            const isSelected = tutor.preset === p;
            const Icon = p === 'teacher' ? GraduationCap : p === 'editor' ? PenTool : Bot;
            return (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={cx(
                  'flex flex-col items-start rounded-xl border p-3 text-left transition-all',
                  isSelected
                    ? 'border-accent bg-accent-soft/40 shadow-sm'
                    : 'border-line bg-paper/60 hover:border-line-strong hover:bg-paper',
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                    <Icon size={15} className={isSelected ? 'text-accent-text' : 'text-ink-soft'} />
                    <UiText source={presetInfo.name} />
                  </span>
                  {isSelected && <Check size={14} className="text-accent-text" />}
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
                  <UiText source={presetInfo.description} />
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Language Exposure */}
      <div className="mt-5">
        <Segmented<TutorExposure>
          label={translateUi('Target language exposure')}
          value={tutor.targetExposure}
          onChange={(targetExposure) => update({ targetExposure })}
          options={[
            { value: 'immersion', label: translateUi('Immersion (90%+)') },
            { value: 'mostly', label: translateUi('Mostly (70%)') },
            { value: 'bilingual', label: translateUi('Bilingual (50%)') },
            { value: 'native', label: translateUi('English (25%)') },
          ]}
        />
      </div>

      {/* Complexity and Sentence Length */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select<TutorComplexity>
          label={translateUi('Explanation complexity')}
          value={tutor.complexity}
          onChange={(complexity) => update({ complexity })}
          options={[
            { value: 'simple', label: translateUi('Simple (Plain everyday words)') },
            { value: 'balanced', label: translateUi('Balanced (Standard terms)') },
            { value: 'technical', label: translateUi('Technical (Linguistic precision)') },
          ]}
        />
        <Select<TutorSentenceLength>
          label={translateUi('Sentence length')}
          value={tutor.sentenceLength}
          onChange={(sentenceLength) => update({ sentenceLength })}
          options={[
            { value: 'short', label: translateUi('Short & punchy') },
            { value: 'medium', label: translateUi('Moderate') },
            { value: 'detailed', label: translateUi('Rich & detailed') },
          ]}
        />
      </div>

      {/* Correction Strictness & Translation Amount */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select<TutorCorrection>
          label={translateUi('Correction frequency')}
          value={tutor.correctionFrequency}
          onChange={(correctionFrequency) => update({ correctionFrequency })}
          options={[
            { value: 'gentle', label: translateUi('Gentle (Focus on meaning)') },
            { value: 'balanced', label: translateUi('Balanced (Noticeable slips)') },
            { value: 'strict', label: translateUi('Strict (Every nuance & typo)') },
          ]}
        />
        <Select<TutorTranslation>
          label={translateUi('Translation display')}
          value={tutor.translationAmount}
          onChange={(translationAmount) => update({ translationAmount })}
          options={[
            { value: 'full', label: translateUi('Full translations') },
            { value: 'hover', label: translateUi('Subtle / on-demand') },
            { value: 'minimal', label: translateUi('Minimal (Target focus)') },
          ]}
        />
      </div>

      {/* Audio speech rate */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center justify-between text-[13px] font-semibold text-ink">
          <span className="flex items-center gap-1.5"><UiText source={'{0}Tutor speech speed ({1}x)'} values={[<Volume2 size={15} className="text-ink-soft" aria-hidden />, tutor.speechSpeed.toFixed(2)]} /></span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[12px] text-ink-soft">0.75x</span>
          <input
            type="range"
            min="0.75"
            max="1.25"
            step="0.05"
            value={tutor.speechSpeed}
            onChange={(e) => update({ speechSpeed: parseFloat(e.target.value) })}
            className="h-2 flex-1 cursor-pointer accent-accent"
          />
          <span className="text-[12px] text-ink-soft">1.25x</span>
        </div>
      </div>

      {/* Examples First Toggle */}
      <div className="mt-3 divide-y divide-line border-t border-line">
        <ToggleRow
          title={translateUi('Examples before explanation')}
          description={translateUi('Present illustrative sentences first to build intuition before describing the grammatical rule.')}
          checked={tutor.examplesFirst}
          onChange={(examplesFirst) => update({ examplesFirst })}
        />
      </div>

      {/* Learner Interests for Example Adaptation */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <Heart size={14} className="text-accent-text" aria-hidden />
          <span><UiText source={'Interests & Topics for Examples'} /></span>
        </div>
        <p className="mt-0.5 text-[12px] text-ink-soft"><UiText source={'The tutor tailors sentence examples and context analogies to your chosen subjects.'} /></p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {COMMON_INTERESTS.map((interest) => {
            const active = (tutor.interests ?? []).includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={cx(
                  'rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
                  active
                    ? 'bg-accent text-accent-contrast shadow-sm'
                    : 'bg-paper text-ink-soft hover:bg-raised hover:text-ink',
                )}
              >
                {active && <Check size={11} className="mr-1 inline-block" />}
                <UiText source={interest} />
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex max-w-sm gap-2">
          <input
            type="text"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomInterest();
              }
            }}
            placeholder={translateUi('Add a custom interest (e.g. Sailing)...')}
            className="h-8 flex-1 rounded-lg border border-line bg-paper px-2.5 text-[12.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <Button variant="secondary" size="sm" onClick={addCustomInterest} disabled={!customInterest.trim()}><UiText source={'Add'} /></Button>
        </div>
      </div>
    </div>
  );
}
