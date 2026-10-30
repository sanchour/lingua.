import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Captions, Download, Ellipsis, FileVideo, HardDriveDownload, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { deleteMedia, updateMedia } from '@/data/media';
import type { Media } from '@/data/types';
import { attachVideoFile, keepSubtitlesOnly, useTracks } from '@/data/video';
import { Button, Dialog, MenuItem, Popover } from '@/design/primitives';
import { formatBytes } from '@/lib/format';
import { downloadFile, pickFile } from '@/services/files/files';
import { startTranscription, useJobs } from '@/services/sonus/jobs';
import { VIDEO_ACCEPT } from '@/services/visio/files';
import { toSrt } from '@/services/visio/subtitles';
import { toast } from '@/state/ui';

/** The ⋯ menu for a video: rename, its file, subtitles, removal. */
export function VideoOptions({ media, className, onRemoved }: { media: Media; className?: string; onRemoved?: () => void }) {
  const translateUi = useUi();
  const tracks = useTracks(media.id);
  const transcribing = useJobs((s) => s.transcribing[media.id]);
  const [dialog, setDialog] = useState<'rename' | 'remove' | 'slim' | null>(null);
  const [title, setTitle] = useState(media.title);
  const hasSound = Boolean(media.blobId || media.remoteUrl);

  const exportTrack = (role: 'target' | 'native') => {
    const track = tracks?.[role];
    if (!track) return;
    const name = `${media.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'subtitles'}.${track.lang}.srt`;
    downloadFile(new File([toSrt(track.cues)], name, { type: 'application/x-subrip' }));
  };

  return (
    <>
      <Popover
        label={translateUi('Video options')}
        placement="bottom-end"
        className="w-72"
        trigger={(props) => (
          <button
            {...props}
            type="button"
            aria-label={translateUi('{0} options', [media.title])}
            className={className ?? 'grid size-9 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink pointer-coarse:size-10'}
          >
            <Ellipsis size={17} aria-hidden />
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-0.5">
            <MenuItem
              icon={Pencil}
              label={translateUi('Rename')}
              onClick={() => {
                close();
                setTitle(media.title);
                setDialog('rename');
              }}
            />
            {hasSound && (
              <MenuItem
                icon={Sparkles}
                label={transcribing !== undefined ? translateUi('Making subtitles…') : tracks?.target ? translateUi('Make subtitles again') : translateUi('Make subtitles')}
                detail="Whisper listens and writes every line"
                onClick={() => {
                  close();
                  void startTranscription(media);
                }}
              />
            )}
            {tracks?.target && <MenuItem icon={Download} label={translateUi('Export subtitles')} detail="As an .srt file" onClick={() => (close(), exportTrack('target'))} />}
            {tracks?.native && <MenuItem icon={Captions} label={translateUi('Export English subtitles')} onClick={() => (close(), exportTrack('native'))} />}
            <MenuItem
              icon={FileVideo}
              label={media.blobId ? translateUi('Replace the video file') : translateUi('Attach the video file')}
              detail={media.blobId ? undefined : 'Watch here with your subtitles'}
              onClick={async () => {
                close();
                const file = await pickFile(VIDEO_ACCEPT);
                if (!file) return;
                await attachVideoFile(media.id, file);
                toast('The video is on this device now.', { tone: 'success' });
              }}
            />
            {media.blobId && (
              <MenuItem
                icon={HardDriveDownload}
                label={translateUi('Keep subtitles only')}
                detail={media.sizeBytes ? `Frees ${formatBytes(media.sizeBytes)}` : 'Frees the space of the video'}
                onClick={() => {
                  close();
                  setDialog('slim');
                }}
              />
            )}
            <MenuItem icon={Trash2} label={translateUi('Remove')} danger onClick={() => (close(), setDialog('remove'))} />
          </div>
        )}
      </Popover>

      <Dialog
        open={dialog === 'rename'}
        onClose={() => setDialog(null)}
        title={translateUi('Rename')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}><UiText source={'Cancel'} /></Button>
            <Button
              disabled={!title.trim()}
              onClick={async () => {
                setDialog(null);
                await updateMedia(media.id, { title: title.trim() });
              }}
            ><UiText source={'Save'} /></Button>
          </>
        }
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label={translateUi('Title')}
          data-autofocus
          className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] text-ink"
        />
      </Dialog>

      <Dialog
        open={dialog === 'slim'}
        onClose={() => setDialog(null)}
        title={translateUi('Keep subtitles only?')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}><UiText source={'Cancel'} /></Button>
            <Button
              onClick={async () => {
                setDialog(null);
                await keepSubtitlesOnly(media.id);
                toast('The video file is gone; its subtitles and cards stay.');
              }}
            ><UiText source={'Free the space'} /></Button>
          </>
        }
      ><UiText source={'The video file leaves this device. Its subtitles, the words you marked and the lines you saved all stay, and you can attach the file again any time.'} /></Dialog>

      <Dialog
        open={dialog === 'remove'}
        onClose={() => setDialog(null)}
        title={translateUi('Remove this video?')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}><UiText source={'Keep'} /></Button>
            <Button
              variant="danger"
              onClick={async () => {
                setDialog(null);
                await deleteMedia(media.id);
                toast('Removed from Visio.');
                onRemoved?.();
              }}
            ><UiText source={'Remove'} /></Button>
          </>
        }
      ><UiText source={'“{0}”, its file and subtitles will be removed. Words you marked and lines you saved stay in Thesaurus.'} values={[media.title]} /></Dialog>
    </>
  );
}
