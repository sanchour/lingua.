import { UiText, useUi } from '@/design/i18n/UiText';
import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Columns2, Flag, Plus, Upload } from 'lucide-react';
import type { FullDictRow } from '@/core/dictionary/format';
import {
  compareDictionarySources,
  importPersonalDictionary,
  loadCustomEntries,
  loadIssueReports,
  saveCustomEntry,
  submitIssueReport,
} from '@/core/dictionary/userDictionary';
import type { DictIssueKind } from '@/core/dictionary/userDictionary';
import { getLanguage } from '@/core/lang/languages';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import type { Word } from '@/data/types';
import { Badge, Button, Card } from '@/design/primitives';
import { toast } from '@/state/ui';

/**
 * Toolbar in DictionaryView allowing the learner to add a custom headword entry (F1287)
 * or import a personal dictionary file in JSON, CSV, TSV, or Markdown format (F1482, F1288).
 */
export function PersonalDictionaryToolbar({ lang, onOpenWord }: { lang: string; onOpenWord: (word: string) => void }) {
  const translateUi = useUi();
  const [adding, setAdding] = useState(false);
  const [word, setWord] = useState('');
  const [pos, setPos] = useState('noun');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [translation, setTranslation] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const customEntries = useLiveQuery(() => loadCustomEntries(lang), [lang]) ?? [];

  const handleSave = async () => {
    if (!word.trim() || !meaning.trim()) return;
    const saved = await saveCustomEntry({
      lang,
      word: word.trim(),
      pos,
      definitions: meaning.split(';').map((d) => d.trim()).filter(Boolean),
      examples: example.trim() ? [[example.trim(), translation.trim()]] : [],
      sourceLabel: 'Personal dictionary',
    });
    toast({ source: 'Saved “{0}” to your personal dictionary.', values: [String(saved.word)] }, { tone: 'success' });
    setAdding(false);
    setWord('');
    setMeaning('');
    setExample('');
    setTranslation('');
    onOpenWord(saved.key);
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const label = file.name.replace(/\.[^.]+$/, '') || 'Personal dictionary';
      const imported = await importPersonalDictionary(lang, text, label);
      if (imported.length === 0) {
        toast('No valid dictionary entries found in that file.', { tone: 'error' });
        return;
      }
      toast({ source: 'Imported {0} entries from {1}.', values: [String(imported.length.toLocaleString()), String(file.name)] }, { tone: 'success' });
      onOpenWord(imported[0].key);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not import personal dictionary.', { tone: 'error' });
    }
  };

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => setAdding((v) => !v)}><UiText source={'Custom entry'} /></Button>
        <Button variant="ghost" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}><UiText source={'Import personal dictionary'} /></Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,.tsv,.md,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        {customEntries.length > 0 && (
          <span className="text-[12.5px] font-semibold text-ink-faint"><UiText source={'{0} custom {1}'} values={[customEntries.length, customEntries.length === 1 ? 'entry' : 'entries']} /></span>
        )}
      </div>

      {adding && (
        <Card className="mt-3 space-y-3 p-4">
          <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'New custom dictionary entry'} /></p>
          <div className="grid grid-cols-[1fr_140px] gap-2.5">
            <input
              type="text"
              lang={lang}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Headword or phrase"
              className="h-9 rounded-xl border border-line bg-surface px-3 font-serif text-[15px] text-ink outline-none focus:border-ink"
            />
            <select
              aria-label={translateUi('Part of speech')}
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              className="h-9 rounded-xl border border-line bg-surface px-2.5 text-[13px] font-semibold text-ink-soft outline-none focus:border-ink"
            >
              <option value="noun">Noun</option>
              <option value="verb">Verb</option>
              <option value="adj">Adjective</option>
              <option value="adv">Adverb</option>
              <option value="phrase">Phrase / idiom</option>
            </select>
          </div>
          <input
            type="text"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder={translateUi('Definition (separate multiple senses with ;)')}
            className="h-9 w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              lang={lang}
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Example sentence (optional)"
              className="h-9 rounded-xl border border-line bg-surface px-3 font-serif text-[14px] text-ink outline-none focus:border-ink"
            />
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder={translateUi('Example translation (optional)')}
              className="h-9 rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}><UiText source={'Cancel'} /></Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={!word.trim() || !meaning.trim()}><UiText source={'Save entry'} /></Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Mounted inside Entry.tsx:
 * - Side-by-side comparison across multiple dictionary sources (F1288, F1289)
 * - Custom entry editor for the current headword (F1287)
 * - Report or fix inaccurate definition / example (F1290)
 */
export function EntryToolsSection({ lang, row, savedWord }: { lang: string; row: FullDictRow; savedWord?: Word | null }) {
  const translateUi = useUi();
  const [showCompare, setShowCompare] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const langName = getLanguage(lang)?.name ?? lang;
  const data = useLiveQuery(async () => {
    const [packEntry, freqRow, allCustom, allReports] = await Promise.all([
      db.dictEntries.get([packId(lang), row.key]),
      db.frequency.get(`${lang}:${row.key}`),
      loadCustomEntries(lang),
      loadIssueReports(lang),
    ]);
    return {
      packEntry,
      freqRow,
      customEntries: allCustom.filter((c) => c.key === row.key),
      reports: allReports.filter((r) => r.key === row.key),
    };
  }, [lang, row.key]);

  const sources = compareDictionarySources({
    langName,
    fullRow: row,
    packEntry: data?.packEntry,
    freqRow: data?.freqRow,
    customEntries: data?.customEntries,
    userWord: savedWord,
    reports: data?.reports,
  });

  const existingCustom = data?.customEntries[0];
  const [customPos, setCustomPos] = useState(existingCustom?.pos ?? row.entries[0]?.pos ?? 'noun');
  const [customDefs, setCustomDefs] = useState(existingCustom?.definitions.join('; ') ?? '');
  const [customEx, setCustomEx] = useState(existingCustom?.examples[0]?.[0] ?? '');
  const [customExTr, setCustomExTr] = useState(existingCustom?.examples[0]?.[1] ?? '');

  const [issueKind, setIssueKind] = useState<DictIssueKind>('definition');
  const [issueDetail, setIssueDetail] = useState('');
  const [correctedGloss, setCorrectedGloss] = useState('');
  const [correctedExample, setCorrectedExample] = useState('');

  const saveCustomForWord = async () => {
    if (!customDefs.trim()) return;
    await saveCustomEntry({
      id: existingCustom?.id,
      lang,
      word: row.word,
      pos: customPos,
      definitions: customDefs.split(';').map((d) => d.trim()).filter(Boolean),
      examples: customEx.trim() ? [[customEx.trim(), customExTr.trim()]] : [],
      sourceLabel: 'Personal dictionary',
    });
    toast({ source: 'Updated your personal dictionary entry for “{0}”.', values: [String(row.word)] }, { tone: 'success' });
    setShowCustom(false);
  };

  const submitReport = async () => {
    if (!issueDetail.trim() && !correctedGloss.trim()) return;
    await submitIssueReport({
      lang,
      word: row.word,
      issueKind,
      detail: issueDetail.trim() || `Correction for ${row.word}`,
      correctedGloss: correctedGloss.trim() || undefined,
      correctedExample: correctedExample.trim() || undefined,
    });
    toast('Saved your report and applied any local correction.', { tone: 'success' });
    setShowReport(false);
    setIssueDetail('');
    setCorrectedGloss('');
    setCorrectedExample('');
  };

  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-center gap-2">
        {sources.length > 1 && (
          <Button variant={showCompare ? 'secondary' : 'ghost'} size="sm" icon={Columns2} onClick={() => setShowCompare((v) => !v)}><UiText source={'Compare {0} sources'} values={[sources.length]} /></Button>
        )}
        <Button variant={showCustom ? 'secondary' : 'ghost'} size="sm" icon={Plus} onClick={() => setShowCustom((v) => !v)}>
          {existingCustom ? translateUi('Edit custom entry') : translateUi('Add custom sense')}
        </Button>
        <Button variant={showReport ? 'secondary' : 'ghost'} size="sm" icon={Flag} onClick={() => setShowReport((v) => !v)}><UiText source={'Report or fix entry'} /></Button>
      </div>

      {showCompare && sources.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4" aria-label={translateUi('Dictionary source comparison')}>
          {sources.map((src) => (
            <Card key={src.id} className="p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-[13px] font-bold text-ink">{src.title}</h4>
                <div className="flex flex-wrap gap-1">
                  {src.posList.map((p) => (
                    <Badge key={p}>{p}</Badge>
                  ))}
                </div>
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-faint">{src.subtitle}</p>
              <ol className="mt-2.5 list-decimal space-y-1 pl-4 text-[14px] leading-snug text-ink">
                {src.definitions.map((d, i) => (
                  <li key={i} lang={src.id === 'monolingual' ? lang : undefined}>
                    {d}
                  </li>
                ))}
              </ol>
              {src.examples.length > 0 && (
                <div className="mt-2.5 border-t border-line pt-2 text-[12.5px] text-ink-soft italic">
                  {src.examples.map((ex, i) => (
                    <p key={i}>{ex}</p>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showCustom && (
        <Card className="mt-4 space-y-3 p-4">
          <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'Personal dictionary sense for “{0}”'} values={[<span lang={lang}>{row.word}</span>]} /></p>
          <div className="grid grid-cols-[140px_1fr] gap-2.5">
            <select
              aria-label={translateUi('Part of speech')}
              value={customPos}
              onChange={(e) => setCustomPos(e.target.value)}
              className="h-9 rounded-xl border border-line bg-surface px-2.5 text-[13px] font-semibold text-ink-soft outline-none focus:border-ink"
            >
              <option value="noun">Noun</option>
              <option value="verb">Verb</option>
              <option value="adj">Adjective</option>
              <option value="adv">Adverb</option>
              <option value="phrase">Phrase</option>
            </select>
            <input
              type="text"
              value={customDefs}
              onChange={(e) => setCustomDefs(e.target.value)}
              placeholder={translateUi('Your definition(s), separated by ;')}
              className="h-9 rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              lang={lang}
              value={customEx}
              onChange={(e) => setCustomEx(e.target.value)}
              placeholder="Custom example sentence (optional)"
              className="h-9 rounded-xl border border-line bg-surface px-3 font-serif text-[14px] text-ink outline-none focus:border-ink"
            />
            <input
              type="text"
              value={customExTr}
              onChange={(e) => setCustomExTr(e.target.value)}
              placeholder={translateUi('Translation (optional)')}
              className="h-9 rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCustom(false)}><UiText source={'Cancel'} /></Button>
            <Button size="sm" onClick={() => void saveCustomForWord()} disabled={!customDefs.trim()}><UiText source={'Save to personal dictionary'} /></Button>
          </div>
        </Card>
      )}

      {showReport && (
        <Card className="mt-4 space-y-3 p-4">
          <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'Report or fix an issue with “{0}”'} values={[<span lang={lang}>{row.word}</span>]} /></p>
          <div className="grid grid-cols-[170px_1fr] gap-2.5">
            <select
              aria-label={translateUi('What is wrong?')}
              value={issueKind}
              onChange={(e) => setIssueKind(e.target.value as DictIssueKind)}
              className="h-9 rounded-xl border border-line bg-surface px-2.5 text-[13px] font-semibold text-ink-soft outline-none focus:border-ink"
            >
              <option value="definition">Wrong definition</option>
              <option value="example">Bad example sentence</option>
              <option value="pronunciation">Pronunciation / IPA</option>
              <option value="forms">Inflected forms</option>
              <option value="other">Other issue</option>
            </select>
            <input
              type="text"
              value={issueDetail}
              onChange={(e) => setIssueDetail(e.target.value)}
              placeholder={translateUi('What looks wrong?')}
              className="h-9 rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              value={correctedGloss}
              onChange={(e) => setCorrectedGloss(e.target.value)}
              placeholder={translateUi('Replacement definition (applied immediately, optional)')}
              className="h-9 rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
            />
            <input
              type="text"
              lang={lang}
              value={correctedExample}
              onChange={(e) => setCorrectedExample(e.target.value)}
              placeholder="Better example sentence (optional)"
              className="h-9 rounded-xl border border-line bg-surface px-3 font-serif text-[14px] text-ink outline-none focus:border-ink"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowReport(false)}><UiText source={'Cancel'} /></Button>
            <Button size="sm" onClick={() => void submitReport()} disabled={!issueDetail.trim() && !correctedGloss.trim()}><UiText source={'Save report & fix'} /></Button>
          </div>
        </Card>
      )}
    </section>
  );
}
