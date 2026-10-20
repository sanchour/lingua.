import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Copy, ExternalLink, MessageCircle, Mic, Type } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { asScene, buildPrompt, promptInLanguage, SCENE_INFO, SCENES } from '@/core/colloquium/prompts';
import type { SceneId } from '@/core/colloquium/prompts';
import { getLanguage } from '@/core/lang/languages';
import { createChat, useChats } from '@/data/chats';
import { currentGrammarTopic } from '@/data/grammar';
import { dueTerms } from '@/data/study';
import { Button, Card, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const dateFmt = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
});

/** Each AI's own app or site; on a phone the link opens the app when it's installed. */
const AIS = [
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    voice: 'the voice button by the message box',
  },
  {
    name: 'Claude',
    url: 'https://claude.ai/new',
    voice: 'the voice button in the Claude app',
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    voice: 'Gemini Live, the wave button',
  },
  {
    name: 'Copilot',
    url: 'https://copilot.microsoft.com/',
    voice: 'the microphone, for Copilot Voice',
  },
];

const LOW = new Set(['A0', 'A1', 'A2']);

/**
 * Colloquium: talk in the language. A scene and a few wishes make a prompt in the language, which
 * opens in the AI the learner already uses (nothing is sent from Lingua); with a key, the chat
 * can happen here too, with corrections.
 */
export default function ColloquiumPage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const name = getLanguage(lang)?.name ?? lang;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Home's scene of the day opens with that scene picked.
  const [scene, setScene] = useState<SceneId>(() => asScene(params.get('scene')) ?? 'cafe');
  const [correct, setCorrect] = useState(true);
  const [slow, setSlow] = useState(LOW.has(language.level));
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [useWords, setUseWords] = useState(true);
  const [useTopic, setUseTopic] = useState(true);
  const [copied, setCopied] = useState(false);
  const due = useLiveQuery(() => dueTerms(lang, 10), [lang]);
  // Grammatica's next topic, woven in when there is one.
  const grammar = useLiveQuery(() => currentGrammarTopic(lang, language.level), [lang, language.level]);
  const topic = useTopic && grammar ? grammar.topic.title : undefined;
  const chats = useChats(lang);
  const hasKey = Boolean(settings.apiKeys[settings.llm.provider]);

  const prompt = buildPrompt(lang, {
    scene,
    level: language.level,
    correct,
    slow,
    voice: mode === 'voice',
    words: useWords ? (due ?? []) : [],
    topic,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      toast('The prompt couldn’t be copied. Select it and copy it yourself.', {
        tone: 'error',
      });
      return false;
    }
  };

  const open = async (ai: (typeof AIS)[number]) => {
    // Open first, inside the tap, so the browser doesn't block it; the copy follows at once.
    window.open(ai.url, '_blank', 'noopener');
    if (await copy()) toast(`Copied. Paste it in ${ai.name} and send it${mode === 'voice' ? `, then use ${ai.voice}` : ''}.`, { tone: 'success', duration: 7000 });
  };

  const chatHere = async () => {
    const id = await createChat(
      lang,
      scene,
      SCENE_INFO[scene].title,
      buildPrompt(lang, {
        scene,
        level: language.level,
        correct,
        slow,
        voice: false,
        words: useWords ? (due ?? []) : [],
        topic,
      }),
    );
    navigate(`/colloquium/chat/${id}`);
  };

  const toggle = (on: boolean, set: (v: boolean) => void, text: string) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(!on)}
      className={cx(
        'flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors',
        on ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised text-ink-soft hover:border-line-strong',
      )}
    >
      {on && <Check size={14} aria-hidden />}
      {text}
    </button>
  );

  return (
    <>
      <PageHeader title="Colloquium" eyebrow={`Talk in ${name}`} />
      <p className="-mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Pick a scene and Lingua writes the opening in {name}, for your level and the words you’re learning. Talk it through in the AI you already use, by voice or text
        {hasKey ? ', or chat here with corrections.' : '.'}
      </p>

      <h2 className={cx(label, 'mt-8 mb-3')}>The scene</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {SCENES.map((id) => {
          const info = SCENE_INFO[id];
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={scene === id}
                onClick={() => setScene(id)}
                className={cx(
                  'flex h-full w-full flex-col rounded-2xl border px-3.5 py-3 text-left transition-colors',
                  scene === id ? 'border-accent/50 bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
                )}
              >
                <span className="text-[14.5px] leading-snug font-semibold">{info.title}</span>
                <span className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{info.detail}</span>
                {info.from !== 'A1' && <span className="mt-1.5 text-[11px] font-bold tracking-wide text-ink-faint uppercase">From {info.from}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className={cx(label, 'mt-8 mb-3')}>How it goes</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<'voice' | 'text'>
          label="Voice or text"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'voice', label: 'Voice', icon: Mic },
            { value: 'text', label: 'Text', icon: Type },
          ]}
        />
        {toggle(correct, setCorrect, 'Correct my mistakes')}
        {toggle(slow, setSlow, 'Slowly and simply')}
        {Boolean(due?.length) && toggle(useWords, setUseWords, `Use my ${due!.length} words due`)}
        {grammar && toggle(useTopic, setUseTopic, `Practise ${grammar.topic.title}`)}
      </div>

      <Card className="mt-6 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <h2 className={cx(label, 'flex-1')}>The prompt{promptInLanguage(lang) ? ` · in ${name}` : ''}</h2>
          <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p lang={promptInLanguage(lang) ? lang : 'en'} className="mt-2 text-[15.5px] leading-relaxed select-text">
          {prompt}
        </p>
      </Card>

      <h2 className={cx(label, 'mt-8 mb-3')}>Open it in</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {AIS.map((ai) => (
          <button
            key={ai.name}
            type="button"
            onClick={() => void open(ai)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-raised text-[15px] font-semibold transition-colors hover:border-line-strong active:scale-[0.98]"
          >
            {ai.name} <ExternalLink size={14} className="text-ink-faint" aria-hidden />
          </button>
        ))}
      </div>
      <p className="mt-2 text-[13px] leading-snug text-ink-soft">
        The prompt is copied as the AI opens: paste it and send it
        {mode === 'voice' ? ', then switch to voice there' : ''}. Nothing is sent from Lingua.
      </p>

      <section aria-label="Chat here" className="mt-10 pb-10">
        <h2 className={cx(label, 'mb-3')}>Chat here</h2>
        {hasKey ? (
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-ink-soft">
              A text chat in this scene with your own AI key: tap any word for its meaning, hear the answers, and see your mistakes corrected under each of your lines.
            </span>
            <Button icon={MessageCircle} onClick={() => void chatHere()}>
              Start chatting
            </Button>
          </Card>
        ) : (
          <p className="text-[14.5px] leading-snug text-ink-soft">
            With a free Groq or Gemini key you can chat right here, with your mistakes corrected as you go.{' '}
            <Link to="/ordo/ai" className="font-semibold text-accent-text hover:underline">
              Add a key in Ordo › AI
            </Link>
          </p>
        )}
        {chats && chats.length > 0 && (
          <ul className="mt-4 -mx-2 flex flex-col">
            {chats.map((c) => (
              <li key={c.id}>
                <Link to={`/colloquium/chat/${c.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface/70">
                  <MessageCircle size={18} className="shrink-0 text-ink-faint" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{c.title}</span>
                    <span lang={lang} className="block truncate text-[12.5px] text-ink-soft">
                      {c.messages.at(-1)?.text ?? 'Not started'}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12.5px] text-ink-faint">{dateFmt.format(c.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
