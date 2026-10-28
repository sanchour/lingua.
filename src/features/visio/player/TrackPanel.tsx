import { useNavigate } from 'react-router';
import { Captions, Clock, Ellipsis, FileText, KeyRound, Languages, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage, GLOSS_LANG } from '@/core/lang/languages';
import type { Media, Transcript } from '@/data/types';
import { removeTrack, saveTrack, shiftTrack } from '@/data/video';
import type { TrackRole, Tracks } from '@/data/video';
import { Button, Card, MenuItem, Popover } from '@/design/primitives';
import { pickFile } from '@/services/files/files';
import { startGeminiTranscript, startTranscription, startTranslation, startYouTubeCaptions, useJobs } from '@/services/sonus/jobs';
import { readSubtitleFile, SUBTITLE_ACCEPT } from '@/services/visio/files';
import { aiBlock, aiKeys } from '@/data/plan';
import { toast, useUI } from '@/state/ui';

const SOURCE: Record<Transcript['source'], string> = {
  'whisper-groq': 'Whisper',
  'whisper-local': 'Whisper on this device',
  srt: 'Subtitle file',
  vtt: 'Subtitle file',
  text: 'Text',
  machine: 'AI translation',
  book: 'The book’s text',
  gemini: 'Gemini',
  youtube: 'YouTube captions',
};

async function addFile(media: Media, role: TrackRole) {
  const file = await pickFile(SUBTITLE_ACCEPT);
  if (!file) return;
  const lang = role === 'target' ? media.lang : GLOSS_LANG;
  try {
    const { cues, source } = await readSubtitleFile(file, lang);
    await saveTrack(media.id, lang, role, cues, source);
    toast(`Subtitles added: ${cues.length} lines.`, { tone: 'success' });
  } catch (e) {
    toast(e instanceof Error ? e.message : 'That file couldn’t be read.', { tone: 'error' });
  }
}

/** The video's two subtitle tracks: where they came from, and how to make, add, sync or remove them. */
export function TrackPanel({ media, tracks }: { media: Media; tracks: Tracks }) {
  const { settings } = useApp();
  const navigate = useNavigate();
  const transcribing = useJobs((s) => s.transcribing[media.id]);
  const note = useJobs((s) => s.notes[media.id]);
  const translating = useJobs((s) => s.translating[media.id]);
  const hasSound = !media.youtubeId && Boolean(media.blobId || media.remoteUrl);
  const canTranscribe = settings.audio.transcriber === 'device' || Boolean(aiKeys(settings).groq);
  const needsMax = aiBlock(settings, settings.llm.provider) === 'max';
  const hasAi = Boolean(aiKeys(settings)[settings.llm.provider] && settings.llm.model);
  const geminiBlock = aiBlock(settings, 'gemini');
  const openPlans = useUI((s) => s.openPlans);
  const name = getLanguage(media.lang)?.name ?? media.lang;

  const row = (role: TrackRole) => {
    const track = tracks[role];
    const label = role === 'target' ? name : 'English';
    const busy = role === 'target' && transcribing !== undefined ? (note ?? 'Whisper is listening…') : role === 'native' && translating !== undefined ? `Translating… ${Math.round(translating * 100)}%` : null;
    const progress = role === 'target' ? transcribing : translating;
    return (
      <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sunken text-[11px] font-bold tracking-wide text-ink-soft">{(role === 'target' ? media.lang : GLOSS_LANG).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold">{label}</p>
          {busy ? (
            <>
              <p className="text-[12.5px] font-semibold text-accent-text">{busy}</p>
              <div className="mt-1.5 h-1 w-40 overflow-hidden rounded-full bg-sunken">
                <div className="h-full origin-left rounded-full bg-accent transition-transform duration-500" style={{ transform: `scaleX(${Math.max(0.05, progress ?? 0)})` }} />
              </div>
            </>
          ) : (
            <p className="text-[12.5px] text-ink-soft">{track ? `${SOURCE[track.source] ?? 'Subtitles'} · ${track.cues.length} lines` : 'None yet'}</p>
          )}
        </div>
        {!busy &&
          (track ? (
            <TrackMenu media={media} role={role} />
          ) : (
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {role === 'target' && hasSound && (
                <Button size="sm" variant="secondary" icon={canTranscribe ? Sparkles : KeyRound} onClick={() => (canTranscribe ? void startTranscription(media) : needsMax ? openPlans('ai') : navigate('/settings/listening'))}>
                  {canTranscribe ? 'Make' : 'Set up Whisper'}
                </Button>
              )}
              {role === 'target' && media.youtubeId && (
                <>
                  <Button size="sm" variant="secondary" icon={geminiBlock ? KeyRound : Sparkles} onClick={() => (geminiBlock === null ? void startGeminiTranscript(media) : geminiBlock === 'max' ? openPlans('ai') : navigate('/settings/ai'))}>
                    {geminiBlock === null ? 'Gemini' : geminiBlock === 'max' ? 'Lingua+ Max' : 'Add Gemini key'}
                  </Button>
                  <Button size="sm" variant="ghost" icon={Captions} onClick={() => void startYouTubeCaptions(media)}>
                    Captions
                  </Button>
                </>
              )}
              {role === 'native' && tracks.target && (
                <Button size="sm" variant="secondary" icon={hasAi ? Languages : KeyRound} onClick={() => (hasAi ? void startTranslation(media, tracks.target!.cues) : needsMax ? openPlans('ai') : navigate('/settings/ai'))}>
                  {hasAi ? 'Translate' : needsMax ? 'Lingua+ Max' : 'Add AI key'}
                </Button>
              )}
              <Button size="sm" variant="ghost" icon={FileText} onClick={() => void addFile(media, role)}>
                File
              </Button>
            </div>
          ))}
      </div>
    );
  };

  return (
    <Card className="divide-y divide-line">
      <div className="pb-3">
        <p className="text-[12.5px] font-bold tracking-wide text-ink-soft uppercase">Subtitles</p>
      </div>
      {row('target')}
      {row('native')}
    </Card>
  );
}

function TrackMenu({ media, role }: { media: Media; role: TrackRole }) {
  const shift = async (ms: number) => {
    await shiftTrack(media.id, role, ms);
    toast(`Subtitles moved ${ms > 0 ? 'later' : 'earlier'} by ${Math.abs(ms) / 1000} s.`);
  };
  return (
    <Popover
      label="Subtitle options"
      placement="bottom-end"
      className="w-64"
      trigger={(props) => (
        <button {...props} type="button" aria-label="Subtitle options" className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink">
          <Ellipsis size={17} aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-0.5">
          <MenuItem icon={Clock} label="Earlier by 0.5 s" detail="When the text comes after the voice" onClick={() => void shift(-500)} />
          <MenuItem icon={Clock} label="Later by 0.5 s" detail="When the text comes before the voice" onClick={() => void shift(500)} />
          <MenuItem icon={FileText} label="Replace with a file" onClick={() => (close(), void addFile(media, role))} />
          <MenuItem
            icon={Trash2}
            label="Remove these subtitles"
            danger
            onClick={() => {
              close();
              void removeTrack(media.id, role);
            }}
          />
        </div>
      )}
    </Popover>
  );
}
