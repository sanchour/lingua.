import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Layers,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import type { Level } from '@/core/lang/levels';
import {
  type ConversationReview,
  type ExtractedVocab,
  reviewConversation,
  type SentenceAnalysis,
  type SpeakerTurn,
} from '@/core/colloquium/review';
import { addNote, ensureFolder, useDecks } from '@/data/decks';
import { saveEntryText } from '@/data/journal';
import { db } from '@/data/db';
import { localDateKey } from '@/lib/format';
import { Button, Card, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';

interface ConversationReviewViewProps {
  lang: string;
  level: Level;
  initialTranscript?: string;
}

type ReviewViewTab = 'sentences' | 'fluency' | 'vocab' | 'replay';

const SAMPLES_BY_LANG: Record<string, string> = {
  es: `You: Hola, yo tener una pregunta sobre la ciudad.
AI: ¡Hola! Claro que sí, dime qué te gustaría saber.
You: Bueno... eh... en mi opinión hace muy bien tiempo hoy y quiero visitar el parque porque es bonito.
AI: Es un día perfecto para pasear por el parque. ¿Prefieres caminar o alquilar una bici?
You: Prefiero caminar caminar despacio y ver los monumentos.`,
  fr: `You: Bonjour, je avoir une question sur le train.
AI: Bonjour ! Je vous écoute.
You: Euh... je veux visiter mes amis parce que il fait très beaucoup beau.
AI: C'est une excellente idée ! Quelle est votre destination ?
You: Je vais à Lyon pour le week-end.`,
  de: `You: Hallo! Gestern ich habe gegangen zum Markt in die Wochenende.
AI: Guten Tag! Wie war der Markt?
You: Also... es war sehr schön und ich habe viele Äpfel gekauft.
AI: Wunderbar, frische Äpfel schmecken immer am besten.`,
  en: `You: Hi, I am agree with your proposal about the project.
AI: Great to hear that! What timeline do you envision?
You: Well... um... I think he do not have enough time because the deadline is tight.
AI: We can negotiate an extension with the client if needed.`,
};

export function ConversationReviewView({
  lang,
  level: _level,
  initialTranscript = '',
}: ConversationReviewViewProps) {
  const translateUi = useUi();
  const [transcriptInput, setTranscriptInput] = useState(initialTranscript);
  const [review, setReview] = useState<ConversationReview | null>(() =>
    initialTranscript.trim() ? reviewConversation(initialTranscript, lang) : null,
  );
  const [activeTab, setActiveTab] = useState<ReviewViewTab>('sentences');
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  const [savedToJournal, setSavedToJournal] = useState(false);

  const decks = useDecks(lang);

  const handleAnalyze = () => {
    if (!transcriptInput.trim()) {
      toast('Please paste or write a conversation first', { tone: 'error' });
      return;
    }
    const result = reviewConversation(transcriptInput, lang);
    setReview(result);
    setSavedToJournal(false);
  };

  const loadSample = () => {
    const sample = SAMPLES_BY_LANG[lang] ?? SAMPLES_BY_LANG.es;
    setTranscriptInput(sample);
    const result = reviewConversation(sample, lang);
    setReview(result);
  };

  const copyCorrected = async () => {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(review.correctedTranscript);
      toast('Corrected transcript copied', { tone: 'success' });
    } catch {
      toast('Failed to copy', { tone: 'error' });
    }
  };

  // Convert mistake or phrase to flashcard (F0575, F0576)
  const saveCard = async (vocab: ExtractedVocab) => {
    try {
      let targetDeckId = decks?.[0]?.id;
      if (!targetDeckId) {
        const folderId = await ensureFolder(lang, 'Speaking');
        targetDeckId = await db.decks.add({
          id: crypto.randomUUID(),
          lang,
          folderId,
          name: 'Speaking & Sermo Cards',
          order: 0,
          kind: 'custom',
          config: {
            newPerDay: 15,
            maxReviews: 200,
            desiredRetention: 0.9,
            directions: ['recognition'],
            defaultMode: 'classic',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      await addNote(targetDeckId, {
        term: vocab.term,
        meaning: vocab.meaning,
        example: vocab.context ? { text: vocab.context } : undefined,
      });

      setSavedCards((prev) => new Set([...prev, vocab.term]));
      toast({ source: 'Saved “{0}” to flashcards', values: [String(vocab.term)] }, { tone: 'success' });
    } catch {
      toast('Could not save card', { tone: 'error' });
    }
  };

  // Save conversation transcript to personal journal Diarium (F0583, F1126)
  const handleSaveToJournal = async () => {
    if (!review) return;
    try {
      const now = Date.now();
      const notes = [
        `### Fluency: ${review.metrics.fluencyScore}/100`,
        `* ${review.metrics.overallSummary}`,
        `* Total learner words: ${review.metrics.learnerWords} (${review.metrics.speechRateWpm} wpm)`,
        `* Subordinate clauses: ${review.metrics.subordinateClauseCount}`,
        review.vocabulary.length > 0
          ? `\n### Key Expressions\n${review.vocabulary.map((v) => `* **${v.term}**: ${v.meaning}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n');

      const fullContent = `### Spoken Dialogue\n\n${transcriptInput.trim()}\n\n### Corrected Transcript\n\n${review.correctedTranscript}\n\n${notes}`;

      const id = crypto.randomUUID();
      await db.journalEntries.add({
        id,
        lang,
        date: localDateKey(now),
        title: 'Sermo conversation review',
        prompt: 'Conversation review notes',
        text: fullContent,
        words: review.metrics.totalWords,
        createdAt: now,
        updatedAt: now,
      });
      await saveEntryText(id, fullContent, lang);

      setSavedToJournal(true);
      toast('Saved conversation transcript and notes to Diarium', { tone: 'success' });
    } catch {
      toast('Failed to save to Diarium', { tone: 'error' });
    }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-5xl">
      {/* Transcript Input / Paste Area */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-[24px] font-semibold"><UiText source={'“How did it go?”'} /></h2>
            <p className="mt-1 text-[14px] text-ink-soft"><UiText source={'Paste your conversation with an external AI or solo recording to analyze fluency, get essential corrections, and extract flashcards.'} /></p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={loadSample}><UiText source={'Load sample dialogue'} /></Button>
            {review && (
              <Button
                size="sm"
                variant="ghost"
                icon={RotateCcw}
                onClick={() => {
                  setReview(null);
                  setTranscriptInput('');
                }}
              ><UiText source={'Clear'} /></Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <textarea
            value={transcriptInput}
            onChange={(e) => setTranscriptInput(e.target.value)}
            placeholder={translateUi('Paste your dialogue transcript here...\nExample:\nYou: Hola, ¿cómo estás?\nAI: ¡Hola! Muy bien, ¿y tú?')}
            rows={5}
            className="w-full resize-y rounded-2xl border border-line bg-surface/50 p-4 font-mono text-[14px] leading-relaxed text-ink outline-none transition-colors focus:border-accent/60 focus:bg-surface"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12.5px] text-ink-faint"><UiText source={'Recognizes lines starting with “You:”, “AI:”, or raw paragraphs.'} /></span>
          <Button size="lg" variant="primary" onClick={handleAnalyze}><UiText source={'Analyze conversation {0}'} values={[<ArrowRight size={16} className="ml-1" aria-hidden />]} /></Button>
        </div>
      </Card>

      {/* Review Dashboard */}
      {review && (
        <section aria-label={translateUi('Conversation analysis results')} className="mt-8">
          {/* Top Metric Highlights & Journal Button */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-text">
                <span className="font-serif text-[22px] font-bold">
                  {review.metrics.fluencyScore}
                </span>
              </div>
              <div>
                <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Fluency score'} /></span>
                <p className="text-[14.5px] font-medium text-ink">
                  {review.metrics.overallSummary}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={savedToJournal ? 'ghost' : 'secondary'}
                icon={savedToJournal ? Check : BookOpen}
                onClick={handleSaveToJournal}
                disabled={savedToJournal}
              >
                {savedToJournal ? translateUi('Saved to Diarium') : translateUi('Save to Diarium (F0583)')}
              </Button>
              <Button variant="ghost" icon={Copy} onClick={copyCorrected}><UiText source={'Copy corrected'} /></Button>
            </div>
          </div>

          {/* Sub-tabs Navigation */}
          <div className="mb-6">
            <Segmented<ReviewViewTab>
              label={translateUi('Review views')}
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: 'sentences', label: translateUi('Sentence Review (F0581)') },
                { value: 'fluency', label: translateUi('Fluency Metrics (F0562)') },
                { value: 'vocab', label: translateUi('Vocabulary ({0})', [review.vocabulary.length]) },
                { value: 'replay', label: translateUi('Conversation Replay (F0578)') },
              ]}
            />
          </div>

          {/* Tab 1: Sentence-by-Sentence Breakdown (F0581) */}
          {activeTab === 'sentences' && (
            <div className="space-y-4">
              {review.sentences.map((sent) => (
                <SentenceCard
                  key={sent.id}
                  sent={sent}
                  onSaveCard={saveCard}
                  isSaved={savedCards.has(sent.corrected)}
                  onSpeak={speakText}
                />
              ))}
            </div>
          )}

          {/* Tab 2: Fluency Metrics (F0562–F0570, F0602, F0603) */}
          {activeTab === 'fluency' && (
            <FluencyTab metrics={review.metrics} />
          )}

          {/* Tab 3: Vocabulary and Expressions Summary (F0559, F0582, F0978) */}
          {activeTab === 'vocab' && (
            <VocabTab
              vocabulary={review.vocabulary}
              summary={review.newExpressionsSummary}
              onSaveCard={saveCard}
              savedCards={savedCards}
              onSpeak={speakText}
            />
          )}

          {/* Tab 4: Replay Conversation (F0578) */}
          {activeTab === 'replay' && (
            <ReplayTab turns={review.turns} onSpeak={speakText} />
          )}
        </section>
      )}
    </div>
  );
}

/** Individual sentence analysis card with essential errors vs stylistic alternatives. */
function SentenceCard({
  sent,
  onSaveCard,
  isSaved,
  onSpeak,
}: {
  sent: SentenceAnalysis;
  onSaveCard: (v: ExtractedVocab) => void;
  isSaved: boolean;
  onSpeak: (t: string) => void;
}) {
  const translateUi = useUi();
  const hasChanges = sent.corrected !== sent.original;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Turn {0}'} values={[sent.turnIndex + 1]} /></span>
            {sent.confidence && (
              <span
                className={cx(
                  'rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                  sent.confidence === 'high'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-accent-soft text-accent-text',
                )}
              >
                {sent.confidence === 'high' ? translateUi('High confidence correction') : translateUi('Stylistic nuance')}
              </span>
            )}
          </div>

          {/* Original sentence */}
          <div className="mt-2 text-[16px] leading-relaxed font-serif text-ink">
            {sent.original}
          </div>

          {/* Corrected version (F0556) */}
          {hasChanges && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-sage-soft/30 p-3 text-[15px] font-serif text-sage-text">
              <span className="font-bold shrink-0"><UiText source={'Corrected:'} /></span>
              <span className="flex-1 font-semibold">{sent.corrected}</span>
              <button
                type="button"
                onClick={() => onSpeak(sent.corrected)}
                className="text-sage-text/80 hover:text-sage-text"
                aria-label={translateUi('Listen to corrected sentence')}
              >
                <Volume2 size={16} aria-hidden />
              </button>
            </div>
          )}

          {/* Essential Grammar Errors (F0557, F0574) */}
          {sent.essentialErrors.length > 0 && (
            <div className="mt-3 space-y-1">
              <span className="block text-[11.5px] font-bold uppercase tracking-wider text-red-600"><UiText source={'Essential Grammar Errors (F0557)'} /></span>
              <ul className="list-disc list-inside space-y-0.5 text-[13px] text-ink-soft">
                {sent.essentialErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Stylistic Alternatives (F0558, F0574) */}
          {sent.stylisticSuggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="block text-[11.5px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Natural phrasing & stylistic notes (F0558)'} /></span>
              <ul className="list-disc list-inside space-y-0.5 text-[13px] text-ink-soft">
                {sent.stylisticSuggestions.map((sug, idx) => (
                  <li key={idx}>{sug}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Idiomatic Alternatives (F0560) */}
          {sent.idiomaticAlternatives.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-accent-text">
              <span className="font-bold"><UiText source={'More idiomatic:'} /></span>
              {sent.idiomaticAlternatives.map((alt, idx) => (
                <span key={idx} className="rounded bg-accent-soft px-2 py-0.5 font-serif font-medium">
                  {alt}
                </span>
              ))}
            </div>
          )}

          {/* Formality and Register Feedback (F0571, F0572) */}
          {sent.formalityNote && (
            <div className="mt-2 text-[12.5px] italic text-ink-soft"><UiText source={'Formality: {0}'} values={[sent.formalityNote]} /></div>
          )}
        </div>

        {/* Card Creation Action (F0575, F0576) */}
        {hasChanges && (
          <Button
            size="sm"
            variant={isSaved ? 'ghost' : 'secondary'}
            icon={isSaved ? Check : Layers}
            onClick={() =>
              onSaveCard({
                term: sent.corrected,
                meaning: `Correction for: “${sent.original}”`,
                context: sent.original,
                category: 'correction',
              })
            }
            disabled={isSaved}
          >
            {isSaved ? translateUi('Saved') : translateUi('Add card')}
          </Button>
        )}
      </div>
    </Card>
  );
}

/** Detailed fluency metrics view. */
function FluencyTab({ metrics }: { metrics: ConversationReview['metrics'] }) {
  const translateUi = useUi();
  return (
    <div className="space-y-6">
      {/* 4-Stat Overview Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 text-center">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Speaking rate (F0602)'} /></span>
          <span className="mt-1 block font-mono text-[28px] font-bold tabular-nums">
            {metrics.speechRateWpm}
          </span>
          <span className="text-[12px] text-ink-soft"><UiText source={'Words per minute'} /></span>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Speaking time (F0566)'} /></span>
          <span className="mt-1 block font-mono text-[28px] font-bold tabular-nums">
            {metrics.speechDurationEstimateSeconds}s
          </span>
          <span className="text-[12px] text-ink-soft"><UiText source={'{0} words total'} values={[metrics.learnerWords]} /></span>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Avg Turn Length (F0567)'} /></span>
          <span className="mt-1 block font-mono text-[28px] font-bold tabular-nums">
            {metrics.averageTurnLengthWords}
          </span>
          <span className="text-[12px] text-ink-soft"><UiText source={'Max: {0} words'} values={[metrics.longestTurnWords]} /></span>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Complexity (F0565)'} /></span>
          <span className="mt-1 block font-mono text-[28px] font-bold tabular-nums">
            {metrics.complexityScore}
          </span>
          <span className="text-[12px] text-ink-soft"><UiText source={'{0} sub-clauses'} values={[metrics.subordinateClauseCount]} /></span>
        </Card>
      </div>

      {/* Trackers Detailed Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Filler Words Tracking (F0563) */}
        <Card className="p-5">
          <h3 className="font-serif text-[18px] font-semibold"><UiText source={'Filler-word tracking (F0563)'} /></h3>
          <p className="mt-1 text-[13px] text-ink-soft"><UiText source={'Unconscious vocal fillers and crutch words detected in speech.'} /></p>

          {metrics.fillerWords.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {metrics.fillerWords.map((f) => (
                <span
                  key={f.word}
                  className="flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1 text-[13px] font-medium"
                >
                  <span className="font-semibold text-ink">{f.word}</span>
                  <span className="rounded-full bg-raised px-1.5 py-0.2 text-[11px] font-bold text-ink-faint">
                    ×{f.count}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[13.5px] italic text-ink-soft"><UiText source={'No repetitive filler words detected. Smooth delivery!'} /></p>
          )}
        </Card>

        {/* Repeated Words Tracking (F0564) */}
        <Card className="p-5">
          <h3 className="font-serif text-[18px] font-semibold"><UiText source={'Repeated-word tracking (F0564)'} /></h3>
          <p className="mt-1 text-[13px] text-ink-soft"><UiText source={'Consecutive word repetitions and stutters.'} /></p>

          {metrics.repeatedWords.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {metrics.repeatedWords.map((r, i) => (
                <span
                  key={i}
                  className="rounded-full bg-sunken px-3 py-1 text-[13px] text-ink"
                >
                  “{r.phrase}” <span className="text-ink-faint">({r.count})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[13.5px] italic text-ink-soft"><UiText source={'No repeated stutter tokens spotted.'} /></p>
          )}
        </Card>

        {/* Hesitations & Pauses (F0568, F0603) */}
        <Card className="p-5">
          <h3 className="font-serif text-[18px] font-semibold"><UiText source={'Hesitations & pause distribution (F0568, F0603)'} /></h3>
          <p className="mt-1 text-[13px] text-ink-soft"><UiText source={'Moments where speech paused for thought or search.'} /></p>

          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-[24px] font-bold tabular-nums">
              {metrics.hesitationsAndPauses}
            </span>
            <span className="text-[13px] text-ink-soft">
              {metrics.hesitationsAndPauses <= 2
                ? translateUi('Minimal hesitation; speech flowed unimpeded.')
                : translateUi('Multiple pauses detected; practice speaking with continuous breath support.')}
            </span>
          </div>
        </Card>

        {/* Self-Corrections & Word Retrieval (F0569, F0570) */}
        <Card className="p-5">
          <h3 className="font-serif text-[18px] font-semibold"><UiText source={'Self-corrections & retrieval (F0569, F0570)'} /></h3>
          <p className="mt-1 text-[13px] text-ink-soft"><UiText source={'Moments where wording was repaired on the fly.'} /></p>

          <ul className="mt-3 space-y-1.5 text-[13px] text-ink">
            {metrics.selfCorrections.map((sc, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-accent-fill" />
                <span>{sc}</span>
              </li>
            ))}
            {metrics.retrievalDifficulties.map((rd, i) => (
              <li key={i} className="flex items-center gap-2 text-ink-soft">
                <span className="size-1.5 rounded-full bg-ink-faint" />
                <span>{rd}</span>
              </li>
            ))}
            {metrics.selfCorrections.length === 0 && metrics.retrievalDifficulties.length === 0 && (
              <li className="italic text-ink-soft"><UiText source={'No self-repairs or placeholder words found.'} /></li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** Vocabulary and expressions summary tab. */
function VocabTab({
  vocabulary,
  summary,
  onSaveCard,
  savedCards,
  onSpeak,
}: {
  vocabulary: ExtractedVocab[];
  summary: string;
  onSaveCard: (v: ExtractedVocab) => void;
  savedCards: Set<string>;
  onSpeak: (t: string) => void;
}) {
  const translateUi = useUi();
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-serif text-[18px] font-semibold"><UiText source={'Summary of new expressions (F0582)'} /></h3>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{summary}</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {vocabulary.map((v, i) => (
          <Card key={i} className="flex flex-col justify-between p-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  {v.category === 'correction' ? translateUi('Corrected form') : translateUi('Idiomatic expression')}
                </span>
                <button
                  type="button"
                  onClick={() => onSpeak(v.term)}
                  className="text-ink-soft hover:text-ink"
                  aria-label={translateUi('Listen to word')}
                >
                  <Volume2 size={15} aria-hidden />
                </button>
              </div>

              <h4 className="mt-1 font-serif text-[18px] font-bold text-ink">{v.term}</h4>
              <p className="mt-1 text-[13.5px] text-ink-soft">{v.meaning}</p>
              {v.context && (
                <p className="mt-2 rounded-lg bg-sunken p-2 font-serif text-[12.5px] italic text-ink-faint"><UiText source={'Context: “{0}”'} values={[v.context]} /></p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-line flex items-center justify-end">
              <Button
                size="sm"
                variant={savedCards.has(v.term) ? 'ghost' : 'secondary'}
                icon={savedCards.has(v.term) ? Check : Layers}
                onClick={() => onSaveCard(v)}
                disabled={savedCards.has(v.term)}
              >
                {savedCards.has(v.term) ? translateUi('In deck') : translateUi('Make flashcard (F0576)')}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Replay conversation turn-by-turn with speaker roles and audio playback (F0578). */
function ReplayTab({
  turns,
  onSpeak,
}: {
  turns: SpeakerTurn[];
  onSpeak: (t: string) => void;
}) {
  const translateUi = useUi();
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-[20px] font-semibold"><UiText source={'Replay conversation (F0578)'} /></h3>
        <span className="text-[12.5px] text-ink-faint"><UiText source={'{0} turns'} values={[turns.length]} /></span>
      </div>

      <div className="space-y-4">
        {turns.map((turn) => {
          const isLearner = turn.speaker === 'learner';
          return (
            <div
              key={turn.turnIndex}
              className={cx(
                'flex flex-col max-w-[85%] rounded-3xl p-4.5 transition-colors',
                isLearner
                  ? 'ml-auto bg-accent-soft/50 border border-accent/20 text-ink'
                  : 'mr-auto bg-raised border border-line text-ink',
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                  {turn.speakerLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onSpeak(turn.text)}
                  className="text-ink-soft hover:text-ink transition-colors"
                  aria-label={translateUi('Listen to {0}\'s turn', [turn.speakerLabel])}
                >
                  <Volume2 size={15} aria-hidden />
                </button>
              </div>
              <p className="font-serif text-[16px] leading-relaxed">{turn.text}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
