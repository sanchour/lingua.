import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clapperboard, Copy, Dices, ExternalLink, Headphones, Keyboard, Mic, NotebookPen, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { AIS } from '@/core/colloquium/ais';
import type { Ai } from '@/core/colloquium/ais';
import { asScene, buildPrompt, getScene, promptInLanguage } from '@/core/colloquium/prompts';
import type { ConversationMode } from '@/core/colloquium/prompts';
import { fits, GROUPS, SCENES, searchScenes } from '@/core/colloquium/scenes';
import type { Scene } from '@/core/colloquium/scenes';
import { toPlain } from '@/core/journal/markdown';
import { getLanguage } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import { appIconUrl } from '@/core/mundus/marks';
import { currentGrammarTopic } from '@/data/grammar';
import { useJournal } from '@/data/journal';
import { dueTerms } from '@/data/study';
import { Button, Card, SearchInput, Segmented } from '@/design/primitives';
import { useRecent } from '@/features/mentis/useRecent';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';
import { loadChoices, markTalked, saveChoices } from './choices';
import type { SermoChoices } from './choices';
import { GROUP_TONE, SCENE_ICONS } from './sceneArt';
import { SoloSpeakingView } from './SoloSpeakingView';
import { ConversationReviewView } from './ConversationReviewView';

type SermoTab = 'prompts' | 'solo' | 'review';
type Step = 'scene' | 'how' | 'prompt';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const LOW = new Set<Level>(['A0', 'A1', 'A2']);
const WEEK = 7 * 86_400_000;
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const range = (s: Scene) => (s.from === s.to ? s.from : `${s.from}–${s.to}`);

/** Something from the learner's week to talk about. */
interface WeekItem {
  title: string;
  detail: string;
  icon: LucideIcon;
}

/**
 * Sermo (5.2-6): three screens, one choice each. Pick a scene, say how you'll talk, and take the prompt, written in
 * the language for your level and words, to the AI you already use. Nothing is sent from Lingua; the chat happens there.
 */
export default function ColloquiumPage() {
  const { language } = useApp();
  const lang = language.id;
  const level = language.level;
  const name = getLanguage(lang)?.name ?? lang;
  const [params] = useSearchParams();
  const [tab, setTab] = useState<SermoTab>(params.get('tab') === 'solo' ? 'solo' : params.get('tab') === 'review' ? 'review' : 'prompts');
  const [reviewInitialText, setReviewInitialText] = useState('');
  // Home's scene of the day and Mentis's "talk about" open on the second screen with the scene or topic picked.
  const linkedScene = asScene(params.get('scene'));
  const linkedAbout = params.get('topic')?.trim().slice(0, 160) || '';
  const [step, setStep] = useState<Step>(linkedScene || linkedAbout ? 'how' : 'scene');
  const [sceneId, setSceneId] = useState(linkedScene ?? 'cafe');
  const [about, setAbout] = useState(linkedAbout);
  const [choices, setChoices] = useState<SermoChoices>(loadChoices);
  const [useWords, setUseWords] = useState(true);
  const [useTopic, setUseTopic] = useState(true);
  const due = useLiveQuery(() => dueTerms(lang, 10), [lang]);
  const grammar = useLiveQuery(() => currentGrammarTopic(lang, level), [lang, level]);
  const top = useRef<HTMLDivElement>(null);

  const choose = (patch: Partial<SermoChoices>) =>
    setChoices((c) => {
      const next = { ...c, ...patch };
      saveChoices(next);
      return next;
    });
  const go = (next: Step) => {
    setStep(next);
    top.current?.scrollIntoView({ block: 'start' });
  };

  const scene = getScene(sceneId)!;
  const slow = choices.slow ?? LOW.has(level);
  const topic = grammar && (useTopic || scene.id === 'grammar') ? grammar.topic.title : undefined;
  const prompt = buildPrompt(lang, {
    scene: sceneId,
    level,
    mode: choices.conversationMode,
    styles: choices.styles,
    correct: choices.correct === 'off' ? false : choices.correct,
    slow,
    help: choices.help,
    minutes: choices.minutes,
    voice: choices.mode === 'voice',
    words: useWords ? (due ?? []) : [],
    topic,
    about: about || undefined,
  });

  const steps: Array<{ id: Step; text: string }> = [
    { id: 'scene', text: 'Your scene' },
    { id: 'how', text: 'How you’ll talk' },
    { id: 'prompt', text: 'Your prompt' },
  ];
  const at = steps.findIndex((s) => s.id === step);

  return (
    <div ref={top} className="scroll-mt-24">
      <PageHeader title="Sermo" eyebrow={`Talk in ${name}`} />

      <div className="mb-6 flex items-center justify-between">
        <Segmented<SermoTab>
          label="Speaking mode"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'prompts', label: 'AI Prompts' },
            { value: 'solo', label: 'Solo Practice' },
            { value: 'review', label: '“How Did It Go?”' },
          ]}
        />
      </div>

      {tab === 'solo' && (
        <SoloSpeakingView
          lang={lang}
          level={level}
          dueWords={due ?? []}
          grammarTopic={grammar?.topic.title}
          onSendToReview={(txt) => {
            setReviewInitialText(txt);
            setTab('review');
          }}
        />
      )}

      {tab === 'prompts' && (
        <>
          <ol className="-mt-1 mb-6 flex items-center gap-2 text-[13.5px] font-semibold" aria-label="Steps">
            {steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-8 bg-line" aria-hidden />}
                <button
                  type="button"
                  disabled={i > at}
                  aria-current={i === at ? 'step' : undefined}
                  onClick={() => go(s.id)}
                  className={cx('flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors', i === at ? 'text-ink' : i < at ? 'text-ink-soft hover:bg-surface hover:text-ink' : 'text-ink-faint')}
                >
                  <span className={cx('grid size-6 place-items-center rounded-full text-[12px]', i === at ? 'bg-inverse text-on-inverse' : i < at ? 'bg-sage-soft text-sage-text' : 'bg-sunken')}>
                    {i < at ? <Check size={13} aria-hidden /> : i + 1}
                  </span>
                  {s.text}
                </button>
              </li>
            ))}
          </ol>

          {step === 'scene' && (
            <ScenePicker
              lang={lang}
              level={level}
              picked={about ? undefined : sceneId}
              onScene={(id) => {
                setSceneId(id);
                setAbout('');
                go('how');
              }}
              onAbout={(title) => {
                setAbout(title);
                go('how');
              }}
            />
          )}

      {step === 'how' && (
        <section aria-label="How you’ll talk" className="max-w-4xl">
          <Picked scene={scene} about={about} onChange={() => go('scene')} />
          <h2 className={cx(label, 'mt-7 mb-3')}>Voice or text</h2>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: 'voice', icon: Mic, title: 'Voice', detail: 'Talk out loud with the AI’s voice mode. Short turns, like a real conversation.' },
                { id: 'text', icon: Type, title: 'Text', detail: 'Type and read. Time to think, look words up, and see every correction.' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={choices.mode === m.id}
                onClick={() => choose({ mode: m.id })}
                className={cx('flex items-start gap-4 rounded-3xl border p-5 text-left transition-colors', choices.mode === m.id ? 'border-accent/50 bg-accent-soft' : 'border-line bg-raised hover:border-line-strong')}
              >
                <span className={cx('grid size-12 shrink-0 place-items-center rounded-2xl', choices.mode === m.id ? 'bg-accent-fill text-on-accent' : 'bg-sunken text-ink-soft')}>
                  <m.icon size={22} aria-hidden />
                </span>
                <span>
                  <span className="block font-serif text-[20px] font-semibold">{m.title}</span>
                  <span className="mt-1 block text-[14px] leading-snug text-ink-soft">{m.detail}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-7 grid gap-x-10 gap-y-6 md:grid-cols-2">
            <Option title="Conversation mode" detail={choices.conversationMode === 'free' ? 'Talk about anything spontaneously without a predefined script.' : choices.conversationMode === 'tutor' ? 'The AI actively guides, teaches, and explains mistakes.' : choices.conversationMode === 'immersion' ? 'Total immersion in the language with minimal assistance.' : 'A real-world scenario with a clear goal and character roles.'}>
              <Segmented<ConversationMode>
                label="Conversation mode"
                value={choices.conversationMode ?? 'scenario'}
                onChange={(conversationMode) => choose({ conversationMode })}
                options={[
                  { value: 'scenario', label: 'Scenario' },
                  { value: 'free', label: 'Free' },
                  { value: 'tutor', label: 'Tutor' },
                  { value: 'immersion', label: 'Immersion' },
                ]}
              />
            </Option>
            <Option title="Correct my mistakes" detail={choices.correct === 'end' ? 'All together when you finish, so the talk keeps flowing.' : choices.correct === 'live' ? 'Briefly, after each of your answers.' : 'No corrections, just talking.'}>
              <Segmented<SermoChoices['correct']>
                label="Correct my mistakes"
                value={choices.correct}
                onChange={(correct) => choose({ correct })}
                options={[
                  { value: 'live', label: 'As I go' },
                  { value: 'end', label: 'At the end' },
                  { value: 'off', label: 'Not at all' },
                ]}
              />
            </Option>
            <Option title="How long" detail="The AI wraps the scene up and tells you how you did.">
              <Segmented<'5' | '10' | '20'>
                label="How long"
                value={String(choices.minutes) as '5' | '10' | '20'}
                onChange={(m) => choose({ minutes: Number(m) as SermoChoices['minutes'] })}
                options={[
                  { value: '5', label: '5 min' },
                  { value: '10', label: '10 min' },
                  { value: '20', label: '20 min' },
                ]}
              />
            </Option>
          </div>

          <div className="mt-6">
            <h2 className={cx(label, 'mb-2.5')}>Style & constraints</h2>
            <div className="flex flex-wrap gap-2">
              <Toggle
                on={Boolean(choices.styles?.interruptions)}
                onClick={() => choose({ styles: { ...choices.styles, interruptions: !choices.styles?.interruptions } })}
                text="Interruptions & follow-ups"
              />
              <Toggle
                on={Boolean(choices.styles?.feignMisunderstanding)}
                onClick={() => choose({ styles: { ...choices.styles, feignMisunderstanding: !choices.styles?.feignMisunderstanding } })}
                text="Ask for clarification on errors"
              />
              <Toggle
                on={Boolean(choices.styles?.limitedAssistance)}
                onClick={() => choose({ styles: { ...choices.styles, limitedAssistance: !choices.styles?.limitedAssistance } })}
                text="Limited English assistance"
              />
              <Toggle
                on={Boolean(choices.styles?.cappedVocabulary)}
                onClick={() => choose({ styles: { ...choices.styles, cappedVocabulary: !choices.styles?.cappedVocabulary } })}
                text="Cap vocabulary to my level"
              />
              <Toggle
                on={Boolean(choices.styles?.gradualNewWords)}
                onClick={() => choose({ styles: { ...choices.styles, gradualNewWords: !choices.styles?.gradualNewWords } })}
                text="Gradual new expressions"
              />
              <Toggle
                on={Boolean(choices.styles?.multiCharacter)}
                onClick={() => choose({ styles: { ...choices.styles, multiCharacter: !choices.styles?.multiCharacter } })}
                text="Multi-character simulation"
              />
              <Toggle
                on={Boolean(choices.styles?.branchingOutcomes)}
                onClick={() => choose({ styles: { ...choices.styles, branchingOutcomes: !choices.styles?.branchingOutcomes } })}
                text="Branching outcomes"
              />
              <Toggle
                on={Boolean(choices.styles?.pronunciationFocus)}
                onClick={() => choose({ styles: { ...choices.styles, pronunciationFocus: !choices.styles?.pronunciationFocus } })}
                text="Pronunciation clinic"
              />
              <Toggle
                on={Boolean(choices.styles?.oralGrammarFocus)}
                onClick={() => choose({ styles: { ...choices.styles, oralGrammarFocus: !choices.styles?.oralGrammarFocus } })}
                text="Oral grammar drills"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Toggle on={choices.help} onClick={() => choose({ help: !choices.help })} text="Help me when I’m stuck" />
            <Toggle on={slow} onClick={() => choose({ slow: !slow })} text="Slowly and simply" />
            {Boolean(due?.length) && <Toggle on={useWords} onClick={() => setUseWords(!useWords)} text={`Use my ${due!.length} words due`} />}
            {grammar && scene.id !== 'grammar' && <Toggle on={useTopic} onClick={() => setUseTopic(!useTopic)} text={`Practise ${grammar.topic.title}`} />}
          </div>

          <div className="mt-8 flex items-center gap-2">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => go('scene')}>
              Back
            </Button>
            <Button size="lg" onClick={() => go('prompt')}>
              Write my prompt <ArrowRight size={17} aria-hidden />
            </Button>
          </div>
        </section>
      )}

      {step === 'prompt' && <PromptStep lang={lang} name={name} prompt={prompt} voice={choices.mode === 'voice'} scene={scene} about={about} onBack={() => go('how')} onRestart={() => go('scene')} />}
        </>
      )}

      {tab === 'review' && (
        <ConversationReviewView
          lang={lang}
          level={level}
          initialTranscript={reviewInitialText}
        />
      )}
    </div>
  );
}

/** The first screen: the learner's week, then every group's scenes as large cards. */
function ScenePicker({ lang, level, picked, onScene, onAbout }: { lang: string; level: Level; picked?: string; onScene: (id: string) => void; onAbout: (title: string) => void }) {
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const recent = useRecent(lang);
  const journal = useJournal(lang);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const week = useMemo(() => {
    const out: WeekItem[] = (recent ?? []).slice(0, 3).map((r) => ({
      title: r.title,
      detail: r.lane === 'read' ? 'You read it this week' : r.lane === 'watch' ? 'You watched it this week' : 'You listened to it this week',
      icon: r.lane === 'read' ? BookOpen : r.lane === 'watch' ? Clapperboard : Headphones,
    }));
    const entry = journal?.find((e) => e.text.trim() && Date.now() - new Date(e.date).getTime() < WEEK);
    if (entry) {
      const plain = toPlain(entry.text).replace(/\s+/g, ' ');
      out.push({ title: entry.title || entry.prompt || (plain.length > 60 ? `${plain.slice(0, 60)}…` : plain), detail: 'You wrote about it in Diarium', icon: NotebookPen });
    }
    return out;
  }, [recent, journal]);

  const shown = searchScenes(all ? SCENES : SCENES.filter((s) => fits(s, level)), query);
  const surprise = () => {
    const list = SCENES.filter((s) => fits(s, level) && s.id !== picked);
    onScene(list[Math.floor(Math.random() * list.length)].id);
  };

  return (
    <section aria-label="Your scene">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-bg/90 px-1 py-2 backdrop-blur">
        <SearchInput ref={search} value={query} onChange={setQuery} placeholder="Search scenes   /" className="w-80" />
        <Segmented<'mine' | 'all'>
          label="Levels"
          value={all ? 'all' : 'mine'}
          onChange={(v) => setAll(v === 'all')}
          options={[
            { value: 'mine', label: `For ${level === 'A0' ? 'A1' : level}` },
            { value: 'all', label: 'All levels' },
          ]}
        />
        <span className="flex-1" />
        <Button variant="secondary" icon={Dices} onClick={surprise}>
          Surprise me
        </Button>
      </div>

      {!query && week.length > 0 && (
        <Group title="From your week" detail="Talk about what you read, watched and wrote">
          {week.map((w) => (
            <SceneCard key={w.title} title={w.title} detail={w.detail} icon={w.icon} tone={GROUP_TONE.week} onClick={() => onAbout(w.title)} />
          ))}
        </Group>
      )}

      {GROUPS.filter((g) => g.id !== 'week').map((g) => {
        const list = shown.filter((s) => s.group === g.id);
        if (!list.length) return null;
        return (
          <Group key={g.id} title={g.title} detail={g.detail}>
            {list.map((s) => (
              <SceneCard key={s.id} title={s.title} detail={s.detail} icon={SCENE_ICONS[s.icon] ?? Keyboard} tone={GROUP_TONE[s.group]} level={range(s)} active={s.id === picked} onClick={() => onScene(s.id)} />
            ))}
          </Group>
        );
      })}
      {shown.length === 0 && <p className="mt-10 text-center text-[15px] text-ink-soft">No scene matches “{query}”.</p>}
    </section>
  );
}

function Group({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="flex items-baseline gap-3">
        <span className="font-serif text-[21px] font-semibold">{title}</span>
        <span className="text-[13.5px] text-ink-soft">{detail}</span>
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{children}</ul>
    </section>
  );
}

function SceneCard({ title, detail, icon: Icon, tone, level, active, onClick }: { title: string; detail: string; icon: LucideIcon; tone: string; level?: string; active?: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cx('group flex h-full w-full flex-col overflow-hidden rounded-3xl border text-left transition-[border-color,transform] hover:-translate-y-0.5', active ? 'border-accent/60' : 'border-line hover:border-line-strong')}
      >
        <span className={cx('relative grid h-24 place-items-center', tone)}>
          <Icon size={38} strokeWidth={1.5} aria-hidden />
          {level && <span className="absolute top-2.5 right-3 rounded-full bg-raised/80 px-2 py-0.5 text-[11.5px] font-bold text-ink-soft">{level}</span>}
        </span>
        <span className="flex flex-1 flex-col bg-raised px-4 py-3">
          <span className="line-clamp-2 text-[15.5px] leading-snug font-semibold">{title}</span>
          <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-soft">{detail}</span>
        </span>
      </button>
    </li>
  );
}

/** The scene or topic picked, at the top of the second and third screens. */
function Picked({ scene, about, onChange }: { scene: Scene; about: string; onChange: () => void }) {
  const Icon = about ? NotebookPen : (SCENE_ICONS[scene.icon] ?? Keyboard);
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className={cx('grid size-14 shrink-0 place-items-center rounded-2xl', about ? GROUP_TONE.week : GROUP_TONE[scene.group])}>
        <Icon size={26} strokeWidth={1.6} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[20px] leading-snug font-semibold">{about ? `Talk about ${about}` : scene.title}</span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-soft">
          {about ? 'The AI asks what it is about and what you thought of it.' : `You: ${scene.you === 'yourself' ? 'yourself' : scene.you}. The AI: ${scene.ai}. Goals: ${scene.goals.join(' · ')}.`}
        </span>
      </span>
      <Button variant="ghost" size="sm" onClick={onChange}>
        Change
      </Button>
    </Card>
  );
}

function Option({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className={cx(label, 'mb-2.5')}>{title}</h2>
      {children}
      <p className="mt-2 text-[13px] leading-snug text-ink-soft">{detail}</p>
    </div>
  );
}

function Toggle({ on, onClick, text }: { on: boolean; onClick: () => void; text: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        'flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-bold transition-colors',
        on ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised text-ink-soft hover:border-line-strong',
      )}
    >
      {on && <Check size={14} aria-hidden />}
      {text}
    </button>
  );
}

/** The third screen: the prompt to read and copy, and each AI with its mark. */
function PromptStep({ lang, name, prompt, voice, scene, about, onBack, onRestart }: { lang: string; name: string; prompt: string; voice: boolean; scene: Scene; about: string; onBack: () => void; onRestart: () => void }) {
  const [copied, setCopied] = useState(false);
  const [last, setLast] = useState<Ai>();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      toast('The prompt couldn’t be copied. Select it and copy it yourself.', { tone: 'error' });
      return false;
    }
  };

  const open = (ai: Ai) => {
    // Open inside the click so the browser allows it; the prompt is copied as well, for when the link can't fill it in.
    window.open(ai.link(prompt), '_blank', 'noopener');
    markTalked();
    setLast(ai);
    void copy();
  };

  return (
    <section aria-label="Your prompt" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <Picked scene={scene} about={about} onChange={onRestart} />
        <Card className="mt-4 p-6">
          <div className="flex items-center gap-2">
            <h2 className={cx(label, 'flex-1')}>Your prompt{promptInLanguage(lang) ? ` · in ${name}` : ''}</h2>
            <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p lang={promptInLanguage(lang) ? lang : 'en'} className="mt-3 font-serif text-[18px] leading-[1.65] select-text">
            {prompt}
          </p>
        </Card>
        <div className="mt-6">
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      <aside aria-label="Open it in" className="lg:sticky lg:top-6 lg:self-start">
        <h2 className={cx(label, 'mb-3')}>Open it in</h2>
        <ul className="flex flex-col gap-2">
          {AIS.map((ai) => (
            <li key={ai.id}>
              <button
                type="button"
                onClick={() => open(ai)}
                className="flex h-16 w-full items-center gap-3.5 rounded-2xl border border-line bg-raised px-3.5 text-left transition-colors hover:border-line-strong hover:bg-surface"
              >
                <img src={appIconUrl(ai.icon, 80)} alt="" width={40} height={40} className="size-10 rounded-[11px] shadow-elev-1" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{ai.name}</span>
                  <span className="block text-[12.5px] text-ink-soft">{ai.fills ? 'Opens with the prompt filled in' : 'Opens; paste with Ctrl+V'}</span>
                </span>
                <ExternalLink size={15} className="text-ink-faint" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-snug text-ink-soft">
          {last
            ? `${last.fills ? `${last.name} opened with your prompt. If it isn’t filled in, paste it with Ctrl+V` : `Paste the prompt in ${last.name} with Ctrl+V`}${voice ? `, send it, then use ${last.voice}` : ', and send it'}.`
            : 'It opens where you’re signed in, and the prompt is copied too. Nothing is sent from Lingua.'}
        </p>
      </aside>
    </section>
  );
}
