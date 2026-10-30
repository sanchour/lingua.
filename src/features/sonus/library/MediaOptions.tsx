import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { BookOpenText, CloudDownload, CloudOff, Ellipsis, Paperclip, Sparkles, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { attachDownload, deleteMedia, removeDownload, transcriptText } from '@/data/media';
import type { Media } from '@/data/types';
import { Button, Dialog, MenuItem, Popover } from '@/design/primitives';
import { closePlayer, usePlayer } from '@/services/audio/engine';
import { pickFile } from '@/services/files/files';
import { AUDIO_ACCEPT } from '@/services/sonus/files';
import { cancelDownload, startDownload, startTranscription, useJobs } from '@/services/sonus/jobs';
import { toast } from '@/state/ui';

/** The ⋯ menu for a listening item: offline copy, transcript, Codex, removal. */
export function MediaOptions({ media, hasTranscript, className }: { media: Media; hasTranscript: boolean; className?: string }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const downloading = useJobs((s) => s.downloads[media.id]);
  const transcribing = useJobs((s) => s.transcribing[media.id]);
  const spotify = media.kind === 'spotify';

  return (
    <>
      <Popover
        label={translateUi('Item options')}
        placement="bottom-end"
        className="w-64"
        trigger={(props) => (
          <button
            {...props}
            type="button"
            aria-label={translateUi('{0} options', [media.title])}
            className={
              className ??
              'grid size-9 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink pointer-coarse:size-10'
            }
          >
            <Ellipsis size={17} aria-hidden />
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-0.5">
            {media.remoteUrl && !media.blobId && (
              <MenuItem
                icon={CloudDownload}
                label={downloading !== undefined ? translateUi('Downloading… {0}%', [Math.round(downloading * 100)]) : translateUi('Save for offline')}
                detail={downloading !== undefined ? 'Tap to cancel' : 'Listen without a connection'}
                onClick={() => {
                  close();
                  if (downloading !== undefined) cancelDownload(media.id);
                  else void startDownload(media);
                }}
              />
            )}
            {media.remoteUrl && !media.blobId && downloading === undefined && (
              <MenuItem
                icon={Paperclip}
                label={translateUi('Attach a downloaded file')}
                detail="For hosts that block app downloads"
                onClick={async () => {
                  close();
                  const file = await pickFile(AUDIO_ACCEPT);
                  if (!file) return;
                  await attachDownload(media.id, file, file.type || 'audio/mpeg');
                  toast(`“${media.title}” is saved for offline listening.`, { tone: 'success' });
                }}
              />
            )}
            {media.remoteUrl && media.blobId && (
              <MenuItem
                icon={CloudOff}
                label={translateUi('Remove download')}
                detail="Keeps streaming from the web"
                onClick={() => {
                  close();
                  void removeDownload(media.id);
                }}
              />
            )}
            {!spotify && (
              <MenuItem
                icon={Sparkles}
                label={transcribing !== undefined ? translateUi('Transcribing…') : hasTranscript ? translateUi('Transcribe again') : translateUi('Make a transcript')}
                detail="Whisper, with word timings"
                onClick={() => {
                  close();
                  void startTranscription(media);
                }}
              />
            )}
            {hasTranscript && (
              <MenuItem
                icon={BookOpenText}
                label={translateUi('Open in Codex')}
                detail="Read the transcript like a book"
                onClick={async () => {
                  close();
                  const id = await transcriptText(media);
                  if (id) navigate(`/codex/read/${id}`);
                }}
              />
            )}
            <MenuItem
              icon={Trash2}
              label={translateUi('Remove')}
              danger
              onClick={() => {
                close();
                setConfirm(true);
              }}
            />
          </div>
        )}
      </Popover>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={translateUi('Remove this item?')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}><UiText source={'Keep'} /></Button>
            <Button
              variant="danger"
              onClick={async () => {
                setConfirm(false);
                if (usePlayer.getState().media?.id === media.id) await closePlayer();
                await deleteMedia(media.id);
                toast('Removed from Sonus.');
              }}
            ><UiText source={'Remove'} /></Button>
          </>
        }
      ><UiText source={'“{0}”, its audio and transcript will be removed. Words you marked stay in your vocabulary.'} values={[media.title]} /></Dialog>
    </>
  );
}
