import { UiText, useUi } from '@/design/i18n/UiText';
import { useNavigate } from 'react-router';
import { BookOpenText, Captions, Clock, Ellipsis, FileText, KeyRound, Sparkles, Trash2, Users } from 'lucide-react';
import { useApp } from '@/app/context';
import { deleteTranscript, saveSpeakers, saveTranscript, shiftTranscript, transcriptText } from '@/data/media';
import type { Media, Transcript } from '@/data/types';
import { Button, buttonClasses, Card, MenuItem, Popover } from '@/design/primitives';
import { setCues } from '@/services/audio/engine';
import { pickFile } from '@/services/files/files';
import { TRANSCRIPT_ACCEPT, readTranscriptFile } from '@/services/sonus/files';
import { startTranscription, useJobs } from '@/services/sonus/jobs';
import { aiBlock } from '@/data/plan';
import { MaxLink } from '@/features/plans/Locked';
import { labelSpeakers } from '@/services/llm/speakers';
import { toast } from '@/state/ui';

const SOURCE: Record<Transcript['source'], string> = {
  'whisper-groq': 'Whisper · word timings',
  'whisper-local': 'Whisper on this device',
  srt: 'Subtitle file',
  vtt: 'Subtitle file',
  text: 'Text file · approximate timing',
  machine: 'Machine transcript',
  book: 'The book’s own text · timed by Whisper',
  gemini: 'Gemini',
  youtube: 'YouTube captions',
};

async function addFile(media: Media) {
  const file = await pickFile(TRANSCRIPT_ACCEPT);
  if (!file) return;
  try {
    const { cues, source } = await readTranscriptFile(file, media.lang, media.durationMs);
    await saveTranscript(media.id, media.lang, cues, source);
    setCues(media.id, cues);
    toast({ source: 'Transcript added: {0} sentences.', values: [String(cues.length)] }, { tone: 'success' });
  } catch (e) {
    toast(e instanceof Error ? e.message : 'That file couldn’t be read.', { tone: 'error' });
  }
}

/**
 * The desktop player without a transcript (5.2-3): "Read along as you listen" as a small button under
 * the controls, its options in a popover, so the player itself can sit centred.
 */
export function ReadAlongButton({ media }: { media: Media }) {
  const translateUi = useUi();
  const progress = useJobs((s) => s.transcribing[media.id]);
  return (
    <Popover
      label={translateUi('Read along as you listen')}
      placement="top"
      className="w-[380px]"
      trigger={(props) => (
        <button {...props} type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink">
          <Captions size={15} aria-hidden /> {progress !== undefined ? translateUi('Writing the transcript… {0}%', [Math.round(progress * 100)]) : translateUi('Read along as you listen')}
        </button>
      )}
    >
      {() => <NoTranscript media={media} bare />}
    </Popover>
  );
}

/** When there's no transcript yet: make one with Whisper, or add a file. */
export function NoTranscript({ media, bare = false }: { media: Media; bare?: boolean }) {
  const translateUi = useUi();
  const { settings } = useApp();
  const navigate = useNavigate();
  const progress = useJobs((s) => s.transcribing[media.id]);
  const note = useJobs((s) => s.notes[media.id]);
  const onDevice = settings.audio.transcriber === 'device';
  const block = onDevice ? null : aiBlock(settings, 'groq');
  const hasKey = !block;
  const spotify = media.kind === 'spotify';

  const Box = bare ? 'div' : Card;
  return (
    <Box className={bare ? 'flex flex-col items-center px-2 py-3 text-center' : 'flex flex-col items-center px-6 py-10 text-center'}>
      {!bare && (
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sage-soft text-sage-text">
          <Captions size={24} aria-hidden />
        </span>
      )}
      {progress !== undefined ? (
        <>
          <p className="font-serif text-xl font-semibold"><UiText source={'Listening closely…'} /></p>
          <p className="mt-1.5 max-w-sm text-[14.5px] text-ink-soft"><UiText source={'{0} You can keep listening meanwhile.'} values={[note ?? 'Whisper is writing down every word with its timing.']} /></p>
          <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-sunken">
            <div className="h-full origin-left rounded-full bg-sage transition-transform duration-500" style={{ transform: `scaleX(${Math.max(0.06, progress)})` }} />
          </div>
        </>
      ) : (
        <>
          <p className="font-serif text-xl font-semibold"><UiText source={'Read along as you listen'} /></p>
          <p className="mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
            {spotify
              ? translateUi('Spotify’s audio can’t be transcribed here, but a subtitle or text file you add will follow the playback.')
              : translateUi('A transcript lights up sentence by sentence, and every word can be looked up and marked, just like in Codex.')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {!spotify &&
              (hasKey ? (
                <Button icon={Sparkles} onClick={() => void startTranscription(media)}><UiText source={'Make a transcript'} /></Button>
              ) : block === 'max' ? (
                <MaxLink className={buttonClasses('primary', 'md')}><UiText source={'Transcripts with Lingua+ Max'} /></MaxLink>
              ) : (
                <Button icon={KeyRound} onClick={() => navigate('/settings/ai')}><UiText source={'Add a free Groq key'} /></Button>
              ))}
            <Button variant="secondary" icon={FileText} onClick={() => void addFile(media)}><UiText source={'Add a file'} /></Button>
          </div>
          {!spotify && !hasKey && (
            <p className="mt-3 max-w-xs text-[12.5px] text-ink-faint"><UiText source={'Transcripts use Whisper on Groq with your own free key{0}, or Whisper on this device (Settings › Listening). SRT, VTT and plain text files work without either.'} values={[block === 'max' ? ' (Lingua+ Max)' : '']} /></p>
          )}
          {!spotify && onDevice && <p className="mt-3 max-w-xs text-[12.5px] text-ink-faint"><UiText source={'Made on this device: private and free, slower than Groq.'} /></p>}
        </>
      )}
    </Box>
  );
}

/** The transcript's heading line: where it came from, and its tools. */
export function TranscriptBar({ media, transcript }: { media: Media; transcript: Transcript }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const transcribing = useJobs((s) => s.transcribing[media.id] !== undefined);
  const shift = async (ms: number) => {
    await shiftTranscript(media.id, ms);
    toast({ source: 'Transcript moved {0} by {1} s.', values: [ms > 0 ? { source: 'later' } : { source: 'earlier' }, String(Math.abs(ms) / 1000)] });
  };

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-xl font-semibold"><UiText source={'Transcript'} /></h2>
        <p className="text-[12.5px] text-ink-faint">
          {transcribing ? translateUi('Making a new transcript…') : translateUi('{0} · {1} sentences', [SOURCE[transcript.source], transcript.cues.length])}
        </p>
      </div>
      <Popover
        label={translateUi('Transcript options')}
        placement="bottom-end"
        className="w-64"
        trigger={(props) => (
          <button {...props} type="button" aria-label={translateUi('Transcript options')} className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface hover:text-ink">
            <Ellipsis size={18} aria-hidden />
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-0.5">
            <MenuItem
              icon={BookOpenText}
              label={translateUi('Open in Codex')}
              detail={translateUi('Read it like a book')}
              onClick={async () => {
                close();
                const id = await transcriptText(media);
                if (id) navigate(`/codex/read/${id}`);
              }}
            />
            <MenuItem icon={Clock} label={translateUi('Text runs late')} detail={translateUi('Move everything 0.5 s earlier')} onClick={() => void shift(-500)} />
            <MenuItem icon={Clock} label={translateUi('Text runs early')} detail={translateUi('Move everything 0.5 s later')} onClick={() => void shift(500)} />
            {media.kind !== 'spotify' && (
              <MenuItem
                icon={Sparkles}
                label={translateUi('Transcribe again')}
                detail={translateUi('Whisper on Groq')}
                onClick={() => {
                  close();
                  void startTranscription(media);
                }}
              />
            )}
            <MenuItem
              icon={Users}
              label={translateUi('Label the speakers')}
              detail={translateUi('Max: a guess from the words')}
              onClick={async () => {
                close();
                try {
                  const cues = await labelSpeakers(transcript.cues);
                  await saveSpeakers(media.id, cues);
                  setCues(media.id, cues);
                  toast('Speakers labelled: a guess from the words, not from the voices.', { tone: 'success' });
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'That did not work.', { tone: 'error' });
                }
              }}
            />
            <MenuItem
              icon={FileText}
              label={translateUi('Replace with a file')}
              detail={translateUi('SRT, VTT or plain text')}
              onClick={() => {
                close();
                void addFile(media);
              }}
            />
            <MenuItem
              icon={Trash2}
              label={translateUi('Remove transcript')}
              danger
              onClick={async () => {
                close();
                await deleteTranscript(media.id);
                setCues(media.id, null);
              }}
            />
          </div>
        )}
      </Popover>
    </div>
  );
}
