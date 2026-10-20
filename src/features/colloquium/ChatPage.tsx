import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowUp, ChevronLeft, LoaderCircle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { normalizeWord } from '@/core/text/normalize';
import { appendMessages, deleteChat, updateLastMessage, useChat } from '@/data/chats';
import type { Chat, ChatMessage } from '@/data/types';
import { setWordState } from '@/data/words';
import { Button, Dialog, IconButton } from '@/design/primitives';
import { useLayout } from '@/design/hooks/useLayout';
import { GlossText } from '@/features/codex/reader/GlossText';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';
import { nextTurn } from '@/services/llm/colloquium';
import { toast } from '@/state/ui';

/** A Colloquium chat with the learner's own key: the AI's lines can be glossed and heard, and the
 *  learner's own lines come back corrected. */
export default function ChatPage() {
  const { chatId } = useParams();
  const chat = useChat(chatId);
  const { language } = useApp();
  const { layout } = useLayout();
  const wide = layout === 'wide';
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const started = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  const ask = async (c: Chat) => {
    setBusy(true);
    setError(null);
    try {
      const level = c.lang === language.id ? language.level : 'B1';
      const turn = await nextTurn(c.lang, level, c);
      if (turn.corrections.length && c.messages.at(-1)?.role === 'me') await updateLastMessage(c.id, 'me', { corrections: turn.corrections });
      await appendMessages(c.id, [
        {
          role: 'ai',
          text: turn.reply,
          en: turn.en,
          words: turn.words,
          at: Date.now(),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The AI didn’t answer. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // A new chat opens with the AI's first line.
  useEffect(() => {
    if (!chat || chat.messages.length || started.current) return;
    started.current = true;
    void ask(chat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat]);

  const count = chat?.messages.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView({
      block: 'end',
      behavior: count > 1 ? 'smooth' : 'auto',
    });
  }, [count, busy]);

  if (chat === undefined) return null;
  if (chat === null) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-ink-soft">This chat isn’t here any more.</p>
        <Link to="/colloquium" className="mt-3 inline-block font-semibold text-accent-text hover:underline">
          Back to Colloquium
        </Link>
      </div>
    );
  }

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    const mine: ChatMessage = { role: 'me', text, at: Date.now() };
    await appendMessages(chat.id, [mine]);
    await ask({ ...chat, messages: [...chat.messages, mine] });
  };

  const last = chat.messages.at(-1);
  const remove = <IconButton icon={Trash2} label="Delete this chat" onClick={() => setRemoving(true)} />;

  return (
    <div className={cx(!wide && 'min-h-dvh bg-bg')}>
      {wide ? (
        <PageHeader title={chat.title} eyebrow="Colloquium" actions={remove} />
      ) : (
        <header className="no-callout sticky top-0 z-20 flex items-center gap-1 bg-bg/90 px-2 pt-safe backdrop-blur-xl">
          <button type="button" aria-label="Back to Colloquium" onClick={() => navigate('/colloquium')} className="grid size-11 place-items-center rounded-xl text-ink-soft">
            <ChevronLeft size={24} aria-hidden />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[16px] font-semibold">{chat.title}</h1>
          {remove}
        </header>
      )}

      <ol aria-label="The conversation" className={cx('flex flex-col gap-4', wide ? 'max-w-3xl pb-6' : 'px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+96px)]')}>
        {chat.messages.map((m, i) => (m.role === 'ai' ? <AiLine key={i} lang={chat.lang} message={m} /> : <MyLine key={i} lang={chat.lang} message={m} />))}
        {busy && (
          <li className="flex items-center gap-2 text-[14px] text-ink-faint" aria-live="polite">
            <LoaderCircle size={16} className="animate-spin" aria-hidden /> {last?.role === 'me' ? 'Reading your line…' : 'Starting the scene…'}
          </li>
        )}
        {error && (
          <li role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3 text-[14px]">
            <span className="min-w-0 flex-1 text-ink-soft">{error}</span>
            {error.includes('Ordo') ? (
              <Link to="/ordo/ai" className="font-semibold text-accent-text hover:underline">
                Open Ordo › AI
              </Link>
            ) : (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => void ask(chat)}>
                Try again
              </Button>
            )}
          </li>
        )}
      </ol>
      <div ref={end} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className={cx(
          'z-20 flex items-end gap-2 bg-bg/92 backdrop-blur-xl',
          wide ? 'sticky bottom-0 max-w-3xl border-t border-line py-3' : 'fixed inset-x-0 bottom-0 border-t border-line px-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]',
        )}
      >
        <textarea
          lang={chat.lang}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          enterKeyHint="send"
          aria-label="Your line"
          placeholder="Write your answer…"
          className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-raised px-4 py-2.5 text-[16px] leading-snug [field-sizing:content] focus:border-accent/60 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || busy}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-opacity disabled:opacity-40"
        >
          <ArrowUp size={20} aria-hidden />
        </button>
      </form>

      <Dialog
        open={removing}
        onClose={() => setRemoving(false)}
        title="Delete this chat?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setRemoving(false)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setRemoving(false);
                await deleteChat(chat.id);
                navigate('/colloquium');
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        The conversation is removed from this device. Words you saved stay.
      </Dialog>
    </div>
  );
}

function AiLine({ lang, message }: { lang: string; message: ChatMessage }) {
  const [english, setEnglish] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const save = async (word: string, meaning: string) => {
    await setWordState(lang, normalizeWord(word, lang), 1, {
      gloss: meaning,
      surface: word,
      sentence: message.text,
    });
    setSaved((s) => new Set(s).add(word));
    toast(`“${word}” is in your words to learn.`, {
      tone: 'success',
      duration: 1800,
    });
  };
  return (
    <li className="mr-8 flex flex-col items-start sm:mr-16">
      <div className="rounded-3xl rounded-bl-lg bg-surface px-4 py-3">
        <GlossText text={message.text} lang={lang} className="text-[17px] leading-relaxed" />
        {english && message.en && <p className="mt-1.5 border-t border-line pt-1.5 text-[14px] leading-snug text-ink-soft">{message.en}</p>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <SpeakButton lang={lang} text={message.text} size={16} className="grid size-8 place-items-center rounded-full text-ink-faint hover:text-ink" />
        {message.en && (
          <button type="button" aria-pressed={english} onClick={() => setEnglish(!english)} className="h-8 rounded-full px-2.5 text-[12.5px] font-bold text-ink-faint hover:text-ink">
            {english ? 'Hide English' : 'English'}
          </button>
        )}
        {message.words?.map((w) => (
          <button
            key={w.word}
            type="button"
            disabled={saved.has(w.word)}
            onClick={() => void save(w.word, w.meaning)}
            title={`Learn “${w.word}”`}
            className="flex h-8 items-center gap-1 rounded-full border border-line px-2.5 text-[12.5px] transition-colors hover:border-line-strong disabled:opacity-60"
          >
            {!saved.has(w.word) && <Plus size={13} className="text-ink-faint" aria-hidden />}
            <span lang={lang} className="font-semibold">
              {w.word}
            </span>
            <span className="text-ink-soft">{w.meaning}</span>
          </button>
        ))}
      </div>
    </li>
  );
}

function MyLine({ lang, message }: { lang: string; message: ChatMessage }) {
  return (
    <li className="ml-8 flex flex-col items-end sm:ml-16">
      <p lang={lang} className="rounded-3xl rounded-br-lg bg-accent-soft px-4 py-3 text-[16px] leading-relaxed whitespace-pre-wrap">
        {message.text}
      </p>
      {message.corrections?.map((c, i) => (
        <p key={i} className="mt-1.5 max-w-full rounded-2xl border border-line px-3 py-2 text-[13.5px] leading-snug">
          <span lang={lang} className="text-ink-faint line-through">
            {c.original}
          </span>{' '}
          →{' '}
          <span lang={lang} className="font-semibold text-accent-text">
            {c.suggestion}
          </span>
          {c.explanation && <span className="mt-0.5 block text-ink-soft">{c.explanation}</span>}
        </p>
      ))}
    </li>
  );
}
