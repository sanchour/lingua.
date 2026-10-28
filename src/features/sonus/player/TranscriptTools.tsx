import { useNavigate } from 'react-router';
import { BookOpenText, Captions, Clock, Ellipsis, FileText, KeyRound, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '@/app/context';
import { deleteTranscript, saveTranscript, shiftTranscript, transcriptText } from '@/data/media';
import type { Media, Transcript } from '@/data/types';
import { Button, buttonClasses, Card, MenuItem, Popover } from '@/design/primitives';
import { setCues } from '@/services/audio/engine';
import { pickFile } from '@/services/files/files';
import { TRANSCRIPT_ACCEPT, readTranscriptFile } from '@/services/sonus/files';
import { startTranscription, useJobs } from '@/services/sonus/jobs';
import { aiBlock } from '@/data/plan';
import { MaxLink } from '@/features/plans/Locked';
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
    toast(`Transcript added: ${cues.length} sentences.`, { tone: 'success' });
  } catch (e) {
    toast(e instanceof Error ? e.message : 'That file couldn’t be read.', { tone: 'error' });
  }
}

/**
 * The desktop player without a transcript (5.2-3): "Read along as you listen" as a small button under
 * the controls, its options in a popover, so the player itself can sit centred.
 */
export function ReadAlongButton({ media }: { media: Media }) {
  const progress = useJobs((s) => s.transcribing[media.id]);
  return (
    <Popover
      label="Read along as you listen"
      placement="top"
      className="w-[380px]"
      trigger={(props) => (
        <button {...props} type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink">
          <Captions size={15} aria-hidden /> {progress !== undefined ? `Writing the transcript… ${Math.round(progress * 100)}%` : 'Read along as you listen'}
        </button>
      )}
    >
      {() => <NoTranscript media={media} bare />}
    </Popover>
  );
}

/** When there's no transcript yet: make one with Whisper, or add a file. */
export function NoTranscript({ media, bare = false }: { media: Media; bare?: boolean }) {
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
          <p className="font-serif text-xl font-semibold">Listening closely…</p>
          <p className="mt-1.5 max-w-sm text-[14.5px] text-ink-soft">{note ?? 'Whisper is writing down every word with its timing.'} You can keep listening meanwhile.</p>
          <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-sunken">
            <div className="h-full origin-left rounded-full bg-sage transition-transform duration-500" style={{ transform: `scaleX(${Math.max(0.06, progress)})` }} />
          </div>
        </>
      ) : (
        <>
          <p className="font-serif text-xl font-semibold">Read along as you listen</p>
          <p className="mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
            {spotify
              ? 'Spotify’s audio can’t be transcribed here, but a subtitle or text file you add will follow the playback.'
              : 'A transcript lights up sentence by sentence, and every word can be looked up and marked, just like in Codex.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {!spotify &&
              (hasKey ? (
                <Button icon={Sparkles} onClick={() => void startTranscription(media)}>
                  Make a transcript
                </Button>
              ) : block === 'max' ? (
                <MaxLink className={buttonClasses('primary', 'md')}>Transcripts with Lingua+ Max</MaxLink>
              ) : (
                <Button icon={KeyRound} onClick={() => navigate('/settings/ai')}>
                  Add a free Groq key
                </Button>
              ))}
            <Button variant="secondary" icon={FileText} onClick={() => void addFile(media)}>
              Add a file
            </Button>
          </div>
          {!spotify && !hasKey && (
            <p className="mt-3 max-w-xs text-[12.5px] text-ink-faint">
              Transcripts use Whisper on Groq with your own free key{block === 'max' ? ' (Lingua+ Max)' : ''}, or Whisper on this device (Settings › Listening). SRT, VTT and plain text files work without either.
            </p>
          )}
          {!spotify && onDevice && <p className="mt-3 max-w-xs text-[12.5px] text-ink-faint">Made on this device: private and free, slower than Groq.</p>}
        </>
      )}
    </Box>
  );
}

/** The transcript's heading line: where it came from, and its tools. */
export function TranscriptBar({ media, transcript }: { media: Media; transcript: Transcript }) {
  const navigate = useNavigate();
  const transcribing = useJobs((s) => s.transcribing[media.id] !== undefined);
  const shift = async (ms: number) => {
    await shiftTranscript(media.id, ms);
    toast(`Transcript moved ${ms > 0 ? 'later' : 'earlier'} by ${Math.abs(ms) / 1000} s.`);
  };

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-xl font-semibold">Transcript</h2>
        <p className="text-[12.5px] text-ink-faint">
          {transcribing ? 'Making a new transcript…' : `${SOURCE[transcript.source]} · ${transcript.cues.length} sentences`}
        </p>
      </div>
      <Popover
        label="Transcript options"
        placement="bottom-end"
        className="w-64"
        trigger={(props) => (
          <button {...props} type="button" aria-label="Transcript options" className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface hover:text-ink">
            <Ellipsis size={18} aria-hidden />
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-0.5">
            <MenuItem
              icon={BookOpenText}
              label="Open in Codex"
              detail="Read it like a book"
              onClick={async () => {
                close();
                const id = await transcriptText(media);
                if (id) navigate(`/codex/read/${id}`);
              }}
            />
            <MenuItem icon={Clock} label="Text runs late" detail="Move everything 0.5 s earlier" onClick={() => void shift(-500)} />
            <MenuItem icon={Clock} label="Text runs early" detail="Move everything 0.5 s later" onClick={() => void shift(500)} />
            {media.kind !== 'spotify' && (
              <MenuItem
                icon={Sparkles}
                label="Transcribe again"
                detail="Whisper on Groq"
                onClick={() => {
                  close();
                  void startTranscription(media);
                }}
              />
            )}
            <MenuItem
              icon={FileText}
              label="Replace with a file"
              detail="SRT, VTT or plain text"
              onClick={() => {
                close();
                void addFile(media);
              }}
            />
            <MenuItem
              icon={Trash2}
              label="Remove transcript"
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
