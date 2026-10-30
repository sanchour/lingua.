import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mic, Square } from 'lucide-react';
import { useApp } from '@/app/context';
import { patchSetting } from '@/data/settings';
import { Button } from '@/design/primitives';
import { canRecord, useRecorder } from '@/features/speech/useRecorder';
import { dictate } from '@/services/transcribe/dictate';
import { DEVICE_MODELS } from '@/services/transcribe/device';
import { clipBlocker, TranscribeError } from '@/services/transcribe/groq';
import { toast } from '@/state/ui';

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Speak your journal (Cursus, part 5): the microphone records, Whisper writes it out (on this device
 * or on Groq with a key, as Settings › Listening says), and it is added to the entry to read back and
 * correct. Nothing is kept of the recording.
 */
export function DictateButton({ lang, onSpoken }: { lang: string; onSpoken: (text: string, ms: number) => void }) {
  const translateUi = useUi();
  const { settings } = useApp();
  const navigate = useNavigate();
  const rec = useRecorder();
  const [writing, setWriting] = useState<string | null>(null);
  const toSettings = { label: 'Open Settings', onClick: () => navigate('/settings/listening') };

  const toggle = async () => {
    if (rec.status === 'recording') {
      const ms = rec.elapsed;
      const recording = await rec.stop();
      if (!recording) return;
      setWriting('Writing it out…');
      try {
        const spoken = await dictate(recording, lang, (p) => setWriting(p.phase === 'model' ? `Getting Whisper ready · ${Math.round(p.pct * 100)}%` : 'Writing it out…'));
        if (spoken) onSpoken(spoken, ms);
        else toast('Nothing was heard. Try again, a little closer to the microphone.');
      } catch (error) {
        const settingsFix = error instanceof TranscribeError && (error.kind === 'no-key' || error.kind === 'no-plan' || error.kind === 'auth');
        toast(error instanceof Error ? error.message : 'It couldn’t be written out this time.', { tone: 'error', action: settingsFix ? toSettings : undefined });
      } finally {
        setWriting(null);
      }
      return;
    }
    // No Groq key (or no Max): one click puts Whisper on this device instead, free and offline once downloaded.
    const blocker = await clipBlocker();
    if (blocker) {
      const size = DEVICE_MODELS[settings.audio.deviceModel].size;
      const useDevice = async () => {
        await patchSetting('audio', { transcriber: 'device' });
        toast(`Whisper now runs on this device. It downloads once (${size}) the first time you speak; Settings › Listening can change it.`, { tone: 'success' });
      };
      return void toast(blocker, { action: { label: 'Use Whisper on this device', onClick: () => void useDevice() } });
    }
    try {
      await rec.start();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The microphone didn’t start.', { tone: 'error' });
    }
  };

  if (!canRecord()) return null;
  const recording = rec.status === 'recording';
  return (
    <Button
      variant={recording ? 'primary' : 'ghost'}
      icon={recording ? Square : Mic}
      loading={writing !== null || rec.status === 'starting'}
      onClick={() => void toggle()}
      aria-label={recording ? translateUi('Stop, and write out what you said') : translateUi('Speak your entry')}
      title={recording ? undefined : translateUi('Speak, and Whisper writes it out here')}
    >
      {writing ?? (recording ? <span className="tabular-nums"><UiText source={'Stop · {0}'} values={[clock(rec.elapsed)]} /></span> : 'Speak')}
    </Button>
  );
}
