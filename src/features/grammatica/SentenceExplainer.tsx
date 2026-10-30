import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import {
  analyzeSentenceOffline,
  type SentenceGrammarAnalysis,
  type WordGrammarBreakdown,
} from '@/core/grammar/sentenceExplainer';
import { analyzeSentenceGrammar } from '@/services/llm/grammarExplainer';
import { cx } from '@/lib/cx';
import { isRtl } from '@/core/lang/languages';

const DEFAULT_SAMPLES: Record<string, string[]> = {
  es: [
    'Quiero que vengas temprano a la fiesta.',
    'El hombre vio a la mujer con el telescopio.',
    'Aunque llovía fuertemente, fuimos al parque.',
  ],
  fr: [
    'Je pense qu’il viendra demain matin.',
    'Le chat qui dort sur la chaise est noir.',
  ],
  de: [
    'Weil das Wetter schön ist, gehen wir spazieren.',
    'Der Junge gab dem Hund einen großen Knochen.',
  ],
  it: [
    'Penso che Marco sia già arrivato a casa.',
    'La ragazza ha comprato un bel libro ieri.',
  ],
  ru: [
    'Когда я пришёл домой, мама уже читала книгу.',
    'Он быстро решил трудную задачу.',
  ],
  zh: [
    '因为下雨了，所以我们不去公园。',
    '我昨天在图书馆看了一本很有意思的书。',
  ],
};

export function SentenceExplainer({ lang }: { lang: string }) {
  const translateUi = useUi();
  const rtl = isRtl(lang);
  const samples = DEFAULT_SAMPLES[lang] ?? DEFAULT_SAMPLES.es;

  const [inputSentence, setInputSentence] = useState(samples[0] ?? '');
  const [analysis, setAnalysis] = useState<SentenceGrammarAnalysis | null>(() =>
    analyzeSentenceOffline(samples[0] ?? '', lang),
  );
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!inputSentence.trim()) return;
    setLoading(true);
    try {
      const res = await analyzeSentenceGrammar(inputSentence, lang);
      setAnalysis(res);
      setSelectedWordIdx(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedWord: WordGrammarBreakdown | null = useMemo(
    () => (selectedWordIdx !== null && analysis ? analysis.words[selectedWordIdx] ?? null : null),
    [selectedWordIdx, analysis],
  );

  return (
    <div className="space-y-6">
      {/* Input section */}
      <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold tracking-wider text-ink-faint uppercase"><UiText source={'Sentence Explainer'} /></h2>
          <span className="flex items-center gap-1 text-[12px] font-medium text-ink-soft"><UiText source={'{0}Dictionary forms & syntax'} values={[<Sparkles size={13} className="text-accent" />]} /></span>
        </div>

        <div className="mt-3">
          <textarea
            value={inputSentence}
            onChange={(e) => setInputSentence(e.target.value)}
            rows={2}
            lang={lang}
            dir={rtl ? 'rtl' : undefined}
            placeholder="Type or paste any sentence to analyze its grammar…"
            className="w-full rounded-2xl border border-line bg-surface p-3.5 font-serif text-[17px] leading-relaxed text-ink outline-none transition-colors placeholder:font-sans placeholder:text-[14.5px] placeholder:text-ink-faint focus:border-ink"
          />
        </div>

        {/* Quick sample buttons & action */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-medium text-ink-faint"><UiText source={'Samples:'} /></span>
            {samples.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setInputSentence(s);
                  setAnalysis(analyzeSentenceOffline(s, lang));
                }}
                className="rounded-lg bg-sunken px-2.5 py-1 text-[12px] font-medium text-ink-soft hover:bg-sunken/80 transition-colors"
              ><UiText source={'Sample {0}'} values={[i + 1]} /></button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || !inputSentence.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13.5px] font-semibold text-bg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? translateUi('Analyzing…') : translateUi('Analyze grammar')}
            <ArrowRight size={15} />
          </button>
        </div>

        {analysis?.requiresMaxNotice && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line/60 bg-sunken/40 p-3 text-[12.5px] text-ink-soft">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-accent" />
            <span><UiText source={'{0} Every word\'s lemma and ending are identified on device. {1}'} values={[<strong><UiText source={'Offline dictionary breakdown active.'} /></strong>, analysis.requiresMaxNotice]} /></span>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Clause Structure */}
          {analysis.clauses.length > 0 && (
            <div className="rounded-3xl border border-line bg-card p-5 sm:p-6">
              <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Clauses & Structure'} /></h3>
              <div className="space-y-2.5">
                {analysis.clauses.map((clause) => {
                  const isMain = clause.type === 'main';
                  return (
                    <div
                      key={clause.id}
                      className={cx(
                        'flex flex-col rounded-2xl border p-3.5 transition-colors sm:p-4',
                        isMain
                          ? 'border-sage/40 bg-sage-soft/30'
                          : 'border-accent/30 bg-accent-soft/25',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cx(
                            'rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                            isMain
                              ? 'bg-sage/20 text-sage-text'
                              : 'bg-accent/20 text-accent-text',
                          )}
                        ><UiText source={'{0} clause'} values={[clause.type]} /></span>
                        {clause.explanation && (
                          <span className="text-[12px] text-ink-soft italic">
                            {clause.explanation}
                          </span>
                        )}
                      </div>
                      <p
                        lang={lang}
                        dir={rtl ? 'rtl' : undefined}
                        className="mt-2 font-serif text-[17px] font-medium text-ink"
                      >
                        {clause.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dependency Arcs Canvas (F0275) */}
          {analysis.arcs.length > 0 && (
            <div className="rounded-3xl border border-line bg-card p-5 sm:p-6">
              <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Dependency Relationships'} /></h3>
              <div className="overflow-x-auto py-4">
                <div className="relative min-w-[600px]">
                  {/* SVG Arcs */}
                  <svg className="h-28 w-full overflow-visible" role="img" aria-label={translateUi('Dependency arcs')}>
                    <defs>
                      <marker
                        id="arc-arrow"
                        viewBox="0 0 10 10"
                        refX="7"
                        refY="5"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto"
                      >
                        <path d="M 0 2 L 7 5 L 0 8 z" fill="var(--accent)" />
                      </marker>
                    </defs>

                    {analysis.arcs.map((arc, i) => {
                      const fromX = 40 + arc.fromIndex * 110;
                      const toX = 40 + arc.toIndex * 110;
                      const midX = (fromX + toX) / 2;
                      const dist = Math.abs(toX - fromX);
                      const arcHeight = Math.min(80, Math.max(35, dist * 0.35));
                      const peakY = 95 - arcHeight;

                      return (
                        <g key={i}>
                          <path
                            d={`M ${fromX} 95 Q ${midX} ${peakY} ${toX} 95`}
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="1.3"
                            markerEnd="url(#arc-arrow)"
                            className="opacity-80"
                          />
                          <text
                            x={midX}
                            y={peakY - 4}
                            textAnchor="middle"
                            className="fill-accent-text text-[10.5px] font-semibold"
                          >
                            {arc.relation}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Words Row beneath Arcs */}
                  <div className="flex gap-4">
                    {analysis.words.map((w, idx) => (
                      <div
                        key={idx}
                        style={{ width: '94px' }}
                        onClick={() => setSelectedWordIdx(idx)}
                        className={cx(
                          'flex cursor-pointer flex-col rounded-xl border p-2 text-center transition-colors',
                          selectedWordIdx === idx
                            ? 'border-accent bg-accent-soft/40 shadow-xs'
                            : 'border-line/70 bg-sunken/40 hover:bg-sunken',
                        )}
                      >
                        <span lang={lang} className="font-serif text-[15px] font-bold text-ink truncate">
                          {w.surface}
                        </span>
                        {w.role && (
                          <span className="mt-1 text-[10px] font-medium text-ink-faint truncate">
                            {w.role}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Word Breakdown Cards Grid */}
          <div className="rounded-3xl border border-line bg-card p-5 sm:p-6">
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Word-by-Word Grammatical Breakdown'} /></h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {analysis.words.map((w, idx) => {
                const isSelected = selectedWordIdx === idx;
                return (
                  <div
                    key={idx}
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedWordIdx(isSelected ? null : idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedWordIdx(isSelected ? null : idx);
                    }}
                    className={cx(
                      'flex flex-col justify-between rounded-2xl border p-4 text-left transition-all outline-none',
                      isSelected
                        ? 'border-accent bg-accent-soft/25 ring-2 ring-accent/30'
                        : 'border-line/80 bg-sunken/40 hover:border-line hover:bg-sunken/70',
                    )}
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          lang={lang}
                          dir={rtl ? 'rtl' : undefined}
                          className="font-serif text-[18px] font-bold text-ink"
                        >
                          {w.surface}
                        </span>
                        {w.role && (
                          <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-bold text-accent-text uppercase">
                            {w.role}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1 text-[13px] text-ink-soft">
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink-faint"><UiText source={'Lemma:'} /></span>
                          <strong className="font-medium text-ink">{w.lemma}</strong>
                        </div>
                        {w.ending && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink-faint"><UiText source={'Ending:'} /></span>
                            <span className="rounded bg-accent-soft/50 px-1 py-0.2 font-mono font-bold text-accent-text">
                              {w.ending}
                            </span>
                          </div>
                        )}
                        {w.gloss && (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-ink-faint"><UiText source={'Meaning:'} /></span>
                            <span>{w.gloss}</span>
                          </div>
                        )}
                        {w.formDescription && (
                          <div className="text-[12px] text-ink-faint">
                            {w.formDescription}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ambiguities / Alternative Interpretations (F0279) */}
          {analysis.alternatives && analysis.alternatives.length > 0 && (
            <div className="rounded-3xl border border-line bg-card p-5 sm:p-6">
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink"><UiText source={'{0}Alternative Valid Interpretations'} values={[<HelpCircle size={17} className="text-accent" />]} /></h3>
              <p className="mt-1 text-[13px] text-ink-soft"><UiText source={'This sentence possesses structural or lexical ambiguity. Multiple readings are grammatically valid:'} /></p>
              <div className="mt-3 space-y-2.5">
                {analysis.alternatives.map((alt, i) => (
                  <div key={i} className="rounded-xl border border-line/70 bg-sunken/40 p-3.5">
                    <p className="font-semibold text-[14px] text-ink">{alt.reading}</p>
                    <p className="mt-0.5 text-[13px] text-ink-soft">{alt.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Word Detail View */}
          {selectedWord && (
            <div className="rounded-2xl border border-accent/40 bg-accent-soft/20 p-4 animate-in fade-in">
              <div className="flex items-baseline justify-between gap-2">
                <h4 lang={lang} className="font-serif text-[17px] font-bold text-ink">
                  Detailed inspection: {selectedWord.surface}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedWordIdx(null)}
                  className="text-[12px] font-semibold text-accent-text hover:underline"
                ><UiText source={'Close'} /></button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3 text-[13px]">
                <div>
                  <span className="text-ink-faint"><UiText source={'Dictionary base: '} /></span>
                  <span className="font-semibold text-ink">{selectedWord.lemma}</span>
                </div>
                <div>
                  <span className="text-ink-faint"><UiText source={'Inflection: '} /></span>
                  <span className="font-semibold text-accent-text">{selectedWord.ending ?? translateUi('Base form')}</span>
                </div>
                <div>
                  <span className="text-ink-faint"><UiText source={'Syntactic Role: '} /></span>
                  <span className="font-semibold text-ink">{selectedWord.role ?? translateUi('Determined by context')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
