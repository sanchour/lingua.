import { UiText, useUi } from '@/design/i18n/UiText';
import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Check,
  Compass,
  FileEdit,
  Globe2,
} from 'lucide-react';
import { Card, Button, Badge } from '@/design/primitives';
import { cx } from '@/lib/cx';
import {
  CONTRAST_PAIRS,
  type ContrastDimension,
  type ContrastItem,
} from '@/core/compare/contrastData';
import { useContrastNote, saveContrastNote } from '@/data/contrastNotes';

const DIMENSION_TABS: Array<{ id: 'all' | ContrastDimension; label: string }> = [
  { id: 'all', label: 'All Dimensions' },
  { id: 'word-order', label: 'Word Order' },
  { id: 'gender', label: 'Gender Systems' },
  { id: 'cases', label: 'Cases' },
  { id: 'tense-aspect', label: 'Tense & Aspect' },
  { id: 'articles', label: 'Articles' },
  { id: 'prepositions', label: 'Prepositions' },
  { id: 'politeness', label: 'Politeness & Address' },
  { id: 'false-friends', label: 'False Friends' },
  { id: 'roots-formation', label: 'Roots & Formation' },
  { id: 'pronunciation', label: 'Pronunciation' },
  { id: 'culture-semantics', label: 'Culture & Semantics' },
];

export function ContrastTableView() {
  const translateUi = useUi();
  const [selectedPairKey, setSelectedPairKey] = useState<string>('en-es');
  const [activeDimension, setActiveDimension] = useState<'all' | ContrastDimension>('all');

  const currentPair = CONTRAST_PAIRS.find((p) => p.pairKey === selectedPairKey) ?? CONTRAST_PAIRS[0];

  // Personal notes
  const savedNote = useContrastNote(selectedPairKey);
  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    setNoteContent(savedNote);
  }, [savedNote, selectedPairKey]);

  const handleSaveNote = async () => {
    setSaveStatus('saving');
    await saveContrastNote(selectedPairKey, noteContent);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const filteredItems = currentPair.items.filter((item) => {
    if (activeDimension === 'all') return true;
    return item.dimension === activeDimension;
  });

  return (
    <div className="space-y-6">
      {/* Pair Chooser Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-sand-50/70 p-3 rounded-xl border border-sand-200/60 dark:bg-sand-900/30 dark:border-sand-800/60">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-terracotta-600 dark:text-terracotta-400" />
          <span className="text-xs font-semibold text-sand-700 dark:text-sand-300"><UiText source={'Language Pair:'} /></span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {CONTRAST_PAIRS.map((pair) => (
            <button
              key={pair.pairKey}
              onClick={() => {
                setSelectedPairKey(pair.pairKey);
                setActiveDimension('all');
              }}
              className={cx(
                'px-3 py-1 text-xs rounded-full border transition-all font-serif',
                selectedPairKey === pair.pairKey
                  ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-800 font-bold dark:bg-terracotta-950/40 dark:text-terracotta-200'
                  : 'border-sand-200 bg-white/70 text-sand-600 hover:border-sand-300 dark:border-sand-800 dark:bg-sand-900/40 dark:text-sand-400',
              )}
            >
              {pair.title}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Banner */}
      <Card className="p-5 space-y-2 bg-sand-50/60 border-sand-200/80 dark:bg-sand-900/30 dark:border-sand-800/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-sand-700 dark:text-sand-300">
          <Compass className="w-4 h-4 text-terracotta-600" />
          <span><UiText source={'Contrastive Overview: {0}'} values={[currentPair.title]} /></span>
        </div>
        <p className="text-xs text-sand-600 dark:text-sand-400 leading-relaxed font-serif">
          {currentPair.overview}
        </p>
      </Card>

      {/* Dimension Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {DIMENSION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveDimension(tab.id)}
            className={cx(
              'px-2.5 py-1 text-xs rounded-lg whitespace-nowrap transition-colors border',
              activeDimension === tab.id
                ? 'bg-sand-800 text-white border-sand-900 font-medium dark:bg-sand-100 dark:text-sand-900 dark:border-sand-200'
                : 'bg-white/60 border-sand-200 text-sand-600 hover:bg-sand-100 dark:bg-sand-900/30 dark:border-sand-800 dark:text-sand-400',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contrast Items Grid */}
      <div className="space-y-6">
        {filteredItems.map((item) => (
          <ContrastCard key={item.id} item={item} />
        ))}

        {filteredItems.length === 0 && (
          <Card className="p-8 text-center text-sand-500"><UiText source={'No contrast entries in this category for {0}. Select "All Dimensions" to see available points.'} values={[currentPair.title]} /></Card>
        )}
      </div>

      {/* Personal Notes on This Pair */}
      <Card className="p-6 space-y-4 border-sand-300/70 dark:border-sand-800/70 bg-sand-50/40 dark:bg-sand-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-sand-800 dark:text-sand-200">
            <FileEdit className="w-4 h-4 text-terracotta-600" />
            <span><UiText source={'Your Personal Contrast Notes on {0}'} values={[currentPair.title]} /></span>
          </div>
          {saveStatus === 'saved' && (
            <Badge tone="sage">
              <span className="flex items-center gap-1 text-[10px]"><UiText source={'{0} Saved to notebook'} values={[<Check className="w-3 h-3" />]} /></span>
            </Badge>
          )}
        </div>

        <p className="text-xs text-sand-500 font-serif"><UiText source={'Keep your own comparative rules, mnemonic associations, and notes on tricky traps between these two languages.'} /></p>

        <textarea
          rows={3}
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder={translateUi('Write personal notes on {0}...', [currentPair.title])}
          className="w-full p-3 font-serif text-sm rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100"
        />

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveNote}
            disabled={saveStatus === 'saving'}
          ><UiText source={'Save Note'} /></Button>
        </div>
      </Card>
    </div>
  );
}

function ContrastCard({ item }: { item: ContrastItem }) {
  return (
    <Card className="p-6 space-y-5 border-sand-300/70 dark:border-sand-800/70">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-sand-200/50 pb-3 dark:border-sand-800/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge tone="accent">
              <span className="uppercase font-mono text-[10px]">{item.dimension}</span>
            </Badge>
            <h3 className="font-serif text-lg font-semibold text-sand-900 dark:text-sand-100">
              {item.title}
            </h3>
          </div>
          <p className="text-xs text-sand-500 leading-relaxed font-serif">
            {item.summary}
          </p>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Language 1 Column */}
        <div className="p-4 rounded-xl bg-sand-50/70 border border-sand-200/70 space-y-2 dark:bg-sand-900/30 dark:border-sand-800/60">
          <div className="text-[11px] font-mono uppercase tracking-wider text-sand-400 font-semibold">
            {item.lang1.lang.toUpperCase()}
          </div>
          <p className="text-xs text-sand-700 dark:text-sand-300 leading-relaxed font-serif">
            {item.lang1.description}
          </p>
          {item.lang1.example && (
            <div className="pt-2 border-t border-sand-200/50 dark:border-sand-800/50">
              <div className="font-serif text-sm font-medium text-sand-900 dark:text-sand-100">
                "{item.lang1.example}"
              </div>
              {item.lang1.literal && (
                <div className="text-[11px] italic text-sand-400 mt-0.5"><UiText source={'Lit: {0}'} values={[item.lang1.literal]} /></div>
              )}
            </div>
          )}
        </div>

        {/* Language 2 Column */}
        <div className="p-4 rounded-xl bg-sand-50/70 border border-sand-200/70 space-y-2 dark:bg-sand-900/30 dark:border-sand-800/60">
          <div className="text-[11px] font-mono uppercase tracking-wider text-terracotta-600 dark:text-terracotta-400 font-semibold">
            {item.lang2.lang.toUpperCase()}
          </div>
          <p className="text-xs text-sand-700 dark:text-sand-300 leading-relaxed font-serif">
            {item.lang2.description}
          </p>
          {item.lang2.example && (
            <div className="pt-2 border-t border-sand-200/50 dark:border-sand-800/50">
              <div className="font-serif text-sm font-medium text-sand-900 dark:text-sand-100">
                "{item.lang2.example}"
              </div>
              {item.lang2.literal && (
                <div className="text-[11px] italic text-sand-400 mt-0.5"><UiText source={'Lit: {0}'} values={[item.lang2.literal]} /></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alert Notice */}
      {item.alert && (
        <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-serif">{item.alert}</span>
        </div>
      )}

      {/* False Friends Sub-table */}
      {item.falseFriends && item.falseFriends.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span><UiText source={'High-Risk False Friends:'} /></span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-sand-200 dark:border-sand-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sand-100/70 text-sand-700 font-mono text-[11px] uppercase dark:bg-sand-900/60 dark:text-sand-300">
                  <th className="p-2.5 border-b border-sand-200 dark:border-sand-800"><UiText source={'Foreign Word'} /></th>
                  <th className="p-2.5 border-b border-sand-200 dark:border-sand-800"><UiText source={'Looks Like'} /></th>
                  <th className="p-2.5 border-b border-sand-200 dark:border-sand-800"><UiText source={'Actually Means'} /></th>
                  <th className="p-2.5 border-b border-sand-200 dark:border-sand-800"><UiText source={'To Say What You Meant'} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200/60 dark:divide-sand-800/60 font-serif">
                {item.falseFriends.map((ff, idx) => (
                  <tr key={idx} className="hover:bg-sand-50/50 dark:hover:bg-sand-900/20">
                    <td className="p-2.5 font-bold text-terracotta-700 dark:text-terracotta-400">
                      {ff.term}
                    </td>
                    <td className="p-2.5 text-sand-500 line-through">
                      "{ff.looksLike}"
                    </td>
                    <td className="p-2.5 font-medium text-sand-800 dark:text-sand-200">
                      {ff.actualMeaning}
                    </td>
                    <td className="p-2.5 text-sage-800 dark:text-sage-300 font-medium">
                      {ff.correctTerm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
