import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Copy,
  Headphones,
  Image as ImageIcon,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import type { Level } from '@/core/lang/levels';
import {
  buildPersonalizedChallenge,
  CATEGORY_LABELS,
  getSoloChallenges,
  type SoloCategory,
  type SoloChallenge,
} from '@/core/colloquium/soloChallenges';
import { Button, Card } from '@/design/primitives';
import { useRecorder } from '@/features/speech/useRecorder';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';

interface SoloSpeakingViewProps {
  lang: string;
  level: Level;
  dueWords?: string[];
  grammarTopic?: string;
  onSendToReview?: (transcript: string) => void;
}

type ChallengePhase = 'choose' | 'prep' | 'speak' | 'review';

// SpeechRecognition type declarations for browsers that support it
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal?: boolean;
    };
    length: number;
  };
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
}

export function SoloSpeakingView({
  lang,
  level,
  dueWords = [],
  grammarTopic,
  onSendToReview,
}: SoloSpeakingViewProps) {
  const [category, setCategory] = useState<SoloCategory | 'all'>('all');
  const [activeChallenge, setActiveChallenge] = useState<SoloChallenge | null>(null);
  const [phase, setPhase] = useState<ChallengePhase>('choose');
  const [prepTimeLeft, setPrepTimeLeft] = useState(15);
  const [speakTime, setSpeakTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const { status: recStatus, start: startRec, stop: stopRec } = useRecorder(10 * 60_000);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prepTimerRef = useRef<number | undefined>(undefined);
  const speakTimerRef = useRef<number | undefined>(undefined);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  // Personalized challenge (F0607)
  const personalized = useMemo(
    () => buildPersonalizedChallenge(lang, level, dueWords, grammarTopic),
    [lang, level, dueWords, grammarTopic],
  );

  const challenges = useMemo(() => {
    if (category === 'personalized') return [personalized];
    const raw = getSoloChallenges(lang, category === 'all' ? undefined : category, level);
    return [personalized, ...raw];
  }, [lang, category, level, personalized]);

  // Clean up audio blob URL on unmount or reset
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      window.clearInterval(prepTimerRef.current);
      window.clearInterval(speakTimerRef.current);
      recognitionRef.current?.stop();
    };
  }, [audioUrl]);

  // Handle prep countdown
  useEffect(() => {
    if (phase !== 'prep') return;
    prepTimerRef.current = window.setInterval(() => {
      setPrepTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(prepTimerRef.current);
          startSpeaking();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(prepTimerRef.current);
  }, [phase]);

  // Start speaking phase: start timer, recorder, and real-time speech recognition (F0584)
  const startSpeaking = async () => {
    setPhase('speak');
    setSpeakTime(0);
    setTranscript('');

    // Start speaking timer
    speakTimerRef.current = window.setInterval(() => {
      setSpeakTime((t) => t + 1);
    }, 1000);

    // Start microphone recording
    try {
      await startRec();
    } catch {
      // Microphone might be unavailable in some browser settings; allow typing / simulation
    }

    // Start speech recognition if supported (F0584)
    try {
      const SpeechClass = (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition; webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).webkitSpeechRecognition;

      if (SpeechClass) {
        const sr = new SpeechClass();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = lang;
        sr.onresult = (e: SpeechRecognitionEvent) => {
          let full = '';
          for (let i = 0; i < e.results.length; i++) {
            full += e.results[i][0].transcript + ' ';
          }
          setTranscript(full.trim());
        };
        sr.onerror = () => {};
        sr.start();
        recognitionRef.current = sr;
      }
    } catch {
      // SpeechRecognition not supported or permission denied
    }
  };

  const finishSpeaking = async () => {
    window.clearInterval(speakTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    try {
      const blob = await stopRec();
      if (blob) {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    } catch {
      // ignore
    }

    setPhase('review');
  };

  const handleSelectChallenge = (c: SoloChallenge) => {
    setActiveChallenge(c);
    setPrepTimeLeft(c.prepSeconds || 15);
    setTranscript('');
    setAudioUrl(null);
    setPhase('prep');
  };

  const handleReset = () => {
    window.clearInterval(prepTimerRef.current);
    window.clearInterval(speakTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    if (recStatus === 'recording') {
      void stopRec();
    }
    setPhase('choose');
    setActiveChallenge(null);
    setTranscript('');
    setAudioUrl(null);
  };

  const playReferenceAudio = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const copyTranscript = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      toast('Transcript copied', { tone: 'success' });
    } catch {
      toast('Failed to copy', { tone: 'error' });
    }
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const targetTime = activeChallenge?.targetSeconds ?? 60;
  const timeProgress = Math.min(100, Math.round((speakTime / targetTime) * 100));

  return (
    <div className="max-w-5xl">
      {/* Stage 1: Choose a challenge */}
      {phase === 'choose' && (
        <section aria-label="Solo speaking challenges">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-[26px] font-semibold">Solo speaking practice</h2>
              <p className="mt-1 text-[14px] text-ink-soft">
                Timed monologues, storytelling, picture description, and rapid prompts to build spoken automaticity.
              </p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={cx(
                'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                category === 'all'
                  ? 'bg-inverse text-on-inverse'
                  : 'bg-surface text-ink-soft hover:bg-sunken hover:text-ink',
              )}
            >
              All challenges
            </button>
            {(Object.keys(CATEGORY_LABELS) as SoloCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cx(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                  category === cat
                    ? 'bg-inverse text-on-inverse'
                    : 'bg-surface text-ink-soft hover:bg-sunken hover:text-ink',
                )}
              >
                {CATEGORY_LABELS[cat].label}
              </button>
            ))}
          </div>

          {/* Challenge Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((c) => (
              <Card
                key={c.id}
                className="flex flex-col justify-between p-5 transition-shadow hover:shadow-elev-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-ink-faint">
                    <span className="uppercase tracking-wider">
                      {CATEGORY_LABELS[c.category]?.label ?? c.category}
                    </span>
                    <span className="flex items-center gap-1 rounded bg-sunken px-2 py-0.5 text-ink-soft">
                      <Clock size={12} aria-hidden />
                      {c.targetSeconds}s
                    </span>
                  </div>

                  <h3 className="mt-2 font-serif text-[18px] font-semibold leading-snug">{c.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft line-clamp-3">
                    {c.prompt}
                  </p>

                  {c.category === 'picture' && c.imageCaption && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent-soft/40 px-3 py-2 text-[12.5px] text-accent-text">
                      <ImageIcon size={15} aria-hidden />
                      <span className="truncate">{c.imageCaption}</span>
                    </div>
                  )}

                  {c.category === 'repeat' && c.audioPhrase && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-sage-soft/40 px-3 py-2 text-[12.5px] text-sage-text">
                      <Headphones size={15} aria-hidden />
                      <span className="truncate italic">“{c.audioPhrase}”</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-[12px] font-bold text-ink-faint">{c.level}</span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleSelectChallenge(c)}
                  >
                    Start practice <ArrowRight size={14} className="ml-1" aria-hidden />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Stage 2: Prep countdown */}
      {phase === 'prep' && activeChallenge && (
        <section aria-label="Preparation time" className="mx-auto max-w-2xl py-8">
          <Card className="p-8 text-center">
            <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-accent-text">
              Preparation · Think about your points
            </span>

            <div className="my-6 grid place-items-center">
              <div className="relative grid size-32 place-items-center rounded-full border-4 border-accent/30 bg-accent-soft/20 text-accent-text">
                <span className="font-serif text-[42px] font-bold tabular-nums">
                  {prepTimeLeft}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint -mt-2">
                  seconds
                </span>
              </div>
            </div>

            <h2 className="font-serif text-[24px] font-semibold">{activeChallenge.title}</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
              {activeChallenge.prompt}
            </p>

            {activeChallenge.category === 'repeat' && activeChallenge.audioPhrase && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Volume2}
                  onClick={() => playReferenceAudio(activeChallenge.audioPhrase!)}
                >
                  Listen to reference sentence
                </Button>
              </div>
            )}

            <div className="mt-6 rounded-2xl bg-sunken p-4 text-left">
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                Helpful hints to cover
              </h4>
              <ul className="mt-2 list-disc list-inside space-y-1 text-[13.5px] text-ink-soft">
                {activeChallenge.hints.map((hint, idx) => (
                  <li key={idx}>{hint}</li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={handleReset} icon={ArrowLeft}>
                Cancel
              </Button>
              <Button size="lg" variant="primary" onClick={startSpeaking}>
                I’m ready — start speaking now <Mic size={16} className="ml-1" aria-hidden />
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* Stage 3: Speaking active timer & recording */}
      {phase === 'speak' && activeChallenge && (
        <section aria-label="Speaking time" className="mx-auto max-w-2xl py-8">
          <Card className="p-8">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-red-600" />
                </span>
                <span className="text-[13px] font-bold uppercase tracking-wider text-red-600">
                  Recording out loud
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-[22px] font-bold tabular-nums">
                  {Math.floor(speakTime / 60)}:{(speakTime % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-[12px] text-ink-faint"> / {targetTime}s target</span>
              </div>
            </div>

            {/* Target progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full bg-accent-fill transition-all duration-300"
                style={{ width: `${timeProgress}%` }}
              />
            </div>

            <div className="mt-6 text-center">
              <h2 className="font-serif text-[22px] font-semibold">{activeChallenge.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                {activeChallenge.prompt}
              </p>
            </div>

            {/* Real-time speech transcription display (F0584) */}
            <div className="mt-6 rounded-2xl border border-line bg-surface/50 p-4">
              <div className="mb-2 flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-accent-text" /> Real-time transcription (F0584)
                </span>
                <span>{wordCount} words spoken</span>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Speak clearly into your microphone... your words appear here in real time."
                rows={4}
                className="w-full resize-none bg-transparent font-serif text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
              />
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" variant="primary" icon={Square} onClick={finishSpeaking}>
                Finish speaking
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* Stage 4: Post-speaking review and audio playback (F0579) */}
      {phase === 'review' && activeChallenge && (
        <section aria-label="Review speaking performance" className="mx-auto max-w-2xl py-8">
          <Card className="p-8">
            <span className="inline-block rounded-full bg-sage-soft px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sage-text">
              Speaking complete · Summary
            </span>

            <h2 className="mt-3 font-serif text-[26px] font-semibold">{activeChallenge.title}</h2>

            {/* Performance Stats Cards */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-sunken p-3.5 text-center">
                <span className="block text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                  Speaking time
                </span>
                <span className="mt-1 block font-mono text-[22px] font-bold tabular-nums">
                  {speakTime}s
                </span>
                <span className="text-[11.5px] text-ink-soft">Target: {targetTime}s</span>
              </div>

              <div className="rounded-2xl bg-sunken p-3.5 text-center">
                <span className="block text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                  Words spoken
                </span>
                <span className="mt-1 block font-mono text-[22px] font-bold tabular-nums">
                  {wordCount}
                </span>
                <span className="text-[11.5px] text-ink-soft">
                  {wordCount > 0 ? `${Math.round((wordCount / (speakTime || 1)) * 60)} wpm` : '—'}
                </span>
              </div>

              <div className="rounded-2xl bg-sunken p-3.5 text-center">
                <span className="block text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                  Target reached
                </span>
                <span className="mt-1 block font-mono text-[22px] font-bold tabular-nums">
                  {timeProgress}%
                </span>
                <span className="text-[11.5px] text-ink-soft">
                  {timeProgress >= 100 ? 'Full duration' : 'Brief answer'}
                </span>
              </div>
            </div>

            {/* Audio Recording Playback (F0579) */}
            {audioUrl && (
              <div className="mt-6 rounded-2xl border border-line bg-raised p-4">
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                  Listen to your recording (F0579)
                </h4>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={isPlayingAudio ? Pause : Play}
                    onClick={toggleAudioPlayback}
                  >
                    {isPlayingAudio ? 'Pause' : 'Play back'}
                  </Button>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="flex-1 h-8"
                    controls
                  />
                </div>
              </div>
            )}

            {/* Spoken Transcript */}
            <div className="mt-6 rounded-2xl border border-line bg-surface/50 p-4">
              <div className="mb-2 flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                <span>Spoken transcript</span>
                <Button size="sm" variant="ghost" icon={Copy} onClick={copyTranscript}>
                  Copy
                </Button>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={5}
                placeholder="No words recorded. You can type or paste what you said here to review it."
                className="w-full resize-none bg-transparent font-serif text-[16px] leading-relaxed text-ink outline-none"
              />
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
              <Button variant="ghost" icon={RotateCcw} onClick={handleReset}>
                Try another challenge
              </Button>

              <div className="flex items-center gap-2">
                {onSendToReview && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => onSendToReview(transcript)}
                    disabled={!transcript.trim()}
                  >
                    Analyze in “How did it go?” <ArrowRight size={16} className="ml-1" aria-hidden />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
