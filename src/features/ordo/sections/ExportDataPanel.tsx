import { listLibrary } from '@/data/notebook';
import { savedPhrasesForExport } from '@/services/export';
import { UiText } from '@/design/i18n/UiText';
// Export & integrations hub in Settings › Your data (6-24): vocabulary CSV, Anki decks, Markdown
// notes with [[wikilinks]], reading highlights & bilingual reading journal, conversation transcripts,
// personal phrasebook, learning statistics CSV, printable progress report HTML, and .ics study calendar.
import { useState } from 'react';
import { BookMarked, Calendar, Download, FileCode2, FileSpreadsheet, FileText, MessageSquare, NotebookPen, Printer } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { db } from '@/data/db';
import type { LanguageProfile } from '@/data/types';
import { Button } from '@/design/primitives';
import {
  bilingualReadingJournalToMarkdown,
  conversationsToMarkdown,
  entriesToMarkdown,
  entriesToText,
  goalsToIcsEvents,
  grammarNotesToMarkdown,
  highlightsToMarkdown,
  phrasebookToCsv,
  phrasebookToMarkdown,
  progressReportToHtml,
  saveFile,
  scheduleToIcs,
  statsToCsv,
  wordsToCsv,
} from '@/services/export';
import { toast } from '@/state/ui';

export function ExportDataPanel({ language }: { language: LanguageProfile }) {
  const [busy, setBusy] = useState<string | null>(null);
  const lang = language.id;
  const langName = getLanguage(lang)?.name ?? lang.toUpperCase();

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      toast('Export failed.', { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const exportWordsCsv = () =>
    run('words-csv', async () => {
      const words = await db.words.where('[lang+state]').between([lang, 0], [lang, 2]).toArray();
      if (!words.length) return void toast('No saved words for this language yet.');
      saveFile(`lingua-vocabulary-${lang}.csv`, wordsToCsv(words), 'text/csv;charset=utf-8');
      toast({ source: 'Exported {0} words to CSV.', values: [String(words.length.toLocaleString())] }, { tone: 'success' });
    });

  const exportJournalMd = (format: 'md' | 'txt') =>
    run(`journal-${format}`, async () => {
      const entries = await db.journalEntries.where('lang').equals(lang).toArray();
      if (!entries.length) return void toast('No journal entries for this language yet.');
      if (format === 'md') {
        saveFile(`lingua-journal-${lang}.md`, entriesToMarkdown(entries, lang), 'text/markdown;charset=utf-8');
      } else {
        saveFile(`lingua-journal-${lang}.txt`, entriesToText(entries), 'text/plain;charset=utf-8');
      }
      toast({ source: 'Exported {0} journal {1}.', values: [String(entries.length), entries.length === 1 ? { source: 'entry' } : { source: 'entries' }] }, { tone: 'success' });
    });

  const exportGrammarMd = () =>
    run('grammar-md', async () => {
      const rows = await db.grammarProgress.where('lang').equals(lang).toArray();
      const items = rows.map((r) => ({
        id: r.id,
        lang: r.lang,
        title: r.topic,
        summary: `Step ${r.step}/6 · ${r.lessons} lessons completed`,
      }));
      if (!items.length) return void toast('No grammar progress or notes yet.');
      saveFile(`lingua-grammar-notes-${lang}.md`, grammarNotesToMarkdown(items, lang), 'text/markdown;charset=utf-8');
      toast({ source: 'Exported {0} grammar topics to Markdown.', values: [String(items.length)] }, { tone: 'success' });
    });

  const exportHighlightsAndReadingJournal = (mode: 'highlights' | 'journal') =>
    run(`reading-${mode}`, async () => {
      const texts = await db.texts.where('lang').equals(lang).toArray();
      if (!texts.length) return void toast('No texts in Codex for this language yet.');
      if (mode === 'highlights') {
        const md = highlightsToMarkdown(texts);
        saveFile(`lingua-highlights-${lang}.md`, md, 'text/markdown;charset=utf-8');
        toast('Exported reading highlights & margin notes.', { tone: 'success' });
      } else {
        const items = texts.map((t) => ({ text: t }));
        const md = bilingualReadingJournalToMarkdown(items, lang);
        saveFile(`lingua-reading-journal-${lang}.md`, md, 'text/markdown;charset=utf-8');
        toast('Exported bilingual reading journal.', { tone: 'success' });
      }
    });

  const exportConversations = () =>
    run('conversations', async () => {
      const chats = await db.chats.where('lang').equals(lang).toArray();
      if (!chats.length) return void toast('No conversation transcripts yet.');
      saveFile(`lingua-conversations-${lang}.md`, conversationsToMarkdown(chats), 'text/markdown;charset=utf-8');
      toast({ source: 'Exported {0} conversation {1}.', values: [String(chats.length), chats.length === 1 ? { source: 'transcript' } : { source: 'transcripts' }] }, { tone: 'success' });
    });

  const exportPhrasebook = (format: 'md' | 'csv') =>
    run(`phrases-${format}`, async () => {
      const notes = await db.notes.where('lang').equals(lang).toArray();
      const saved = await listLibrary('phrasebook', lang);
      const savedIds = new Set(saved.map((p) => p.id));
      const phrases = [...savedPhrasesForExport(saved), ...notes
        .filter((n) => !n.deletedAt && !savedIds.has(n.extra?.phrasebookId ?? '') && (/\s/.test(n.term.trim()) || n.pos === 'phrase'))
        .map((n) => ({
          phrase: n.term,
          meaning: n.meaning,
          usageNote: n.mnemonic,
          example: n.example?.text ?? n.context?.sentence,
          tags: n.tags,
        }))];
      if (!phrases.length) return void toast('No multi-word phrases saved yet.');
      if (format === 'md') {
        saveFile(`lingua-phrasebook-${lang}.md`, phrasebookToMarkdown(phrases, lang), 'text/markdown;charset=utf-8');
      } else {
        saveFile(`lingua-phrasebook-${lang}.csv`, phrasebookToCsv(phrases), 'text/csv;charset=utf-8');
      }
      toast({ source: 'Exported {0} phrases.', values: [String(phrases.length)] }, { tone: 'success' });
    });

  const exportStatsCsv = () =>
    run('stats-csv', async () => {
      const stats = await db.dailyStats.where('lang').equals(lang).toArray();
      if (!stats.length) return void toast('No study statistics recorded yet.');
      saveFile(`lingua-stats-${lang}.csv`, statsToCsv(stats), 'text/csv;charset=utf-8');
      toast({ source: 'Exported {0} days of learning statistics.', values: [String(stats.length)] }, { tone: 'success' });
    });

  const exportProgressReport = () =>
    run('report-html', async () => {
      const [words, stats, texts, entries] = await Promise.all([
        db.words.where('[lang+state]').between([lang, 1], [lang, 2]).toArray(),
        db.dailyStats.where('lang').equals(lang).toArray(),
        db.texts.where('lang').equals(lang).toArray(),
        db.journalEntries.where('lang').equals(lang).toArray(),
      ]);
      const knownWords = words.filter((w) => w.state === 1 && !w.deletedAt).length;
      const learningWords = words.filter((w) => w.state === 2 && !w.deletedAt).length;
      const totalReviews = stats.reduce((acc, s) => acc + (s.reviews ?? 0), 0);
      const totalMs = stats.reduce((acc, s) => acc + (s.readMs ?? 0) + (s.listenMs ?? 0) + (s.watchMs ?? 0) + (s.writeMs ?? 0), 0);
      const booksRead = texts.filter((t) => t.finishedAt && !t.deletedAt).length;
      const html = progressReportToHtml({
        lang,
        langName,
        level: String(language.level),
        generatedAt: new Date().toISOString().slice(0, 10),
        knownWords,
        learningWords,
        totalReviews,
        totalHours: totalMs / 3_600_000,
        booksRead,
        streakDays: stats.filter((s) => s.goalMet).length,
        recentEntries: entries.filter((e) => !e.deletedAt),
      });
      saveFile(`lingua-progress-report-${lang}.html`, html, 'text/html;charset=utf-8');
      toast('Saved printable progress report (.html).', { tone: 'success' });
    });

  const exportCalendarIcs = () =>
    run('calendar-ics', async () => {
      const goals = await db.goals.where('lang').equals(lang).toArray();
      const events = goalsToIcsEvents(lang, language.dailyGoal, goals);
      const ics = scheduleToIcs(events, `Lingua (${langName}) Study Schedule`);
      saveFile(`lingua-study-schedule-${lang}.ics`, ics, 'text/calendar;charset=utf-8');
      toast('Saved study schedule (.ics) for your calendar app.', { tone: 'success' });
    });

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-line/70 bg-sunken/35 p-4">
      <div>
        <p className="font-semibold"><UiText source={'Export & integrations ({0})'} values={[langName]} /></p>
        <p data-hint="" className="text-[13px] text-ink-soft"><UiText source={'Export your words, notes, highlights, transcripts, statistics, and study calendar in open formats (CSV, Markdown with [[wikilinks]], HTML/PDF, and iCalendar .ics).'} /></p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={FileSpreadsheet} loading={busy === 'words-csv'} onClick={exportWordsCsv}><UiText source={'Vocabulary (.csv)'} /></Button>
        <Button variant="secondary" size="sm" icon={FileCode2} loading={busy === 'journal-md'} onClick={() => exportJournalMd('md')}><UiText source={'Journal (.md)'} /></Button>
        <Button variant="secondary" size="sm" icon={FileText} loading={busy === 'journal-txt'} onClick={() => exportJournalMd('txt')}><UiText source={'Journal (.txt)'} /></Button>
        <Button variant="secondary" size="sm" icon={NotebookPen} loading={busy === 'grammar-md'} onClick={exportGrammarMd}><UiText source={'Grammar notes (.md)'} /></Button>
        <Button variant="secondary" size="sm" icon={BookMarked} loading={busy === 'reading-highlights'} onClick={() => exportHighlightsAndReadingJournal('highlights')}><UiText source={'Reading highlights (.md)'} /></Button>
        <Button variant="secondary" size="sm" icon={BookMarked} loading={busy === 'reading-journal'} onClick={() => exportHighlightsAndReadingJournal('journal')}><UiText source={'Reading journal (.md)'} /></Button>
        <Button variant="secondary" size="sm" icon={MessageSquare} loading={busy === 'conversations'} onClick={exportConversations}><UiText source={'Conversations (.md)'} /></Button>
        <Button variant="secondary" size="sm" icon={Download} loading={busy === 'phrases-md'} onClick={() => exportPhrasebook('md')}><UiText source={'Phrasebook (.md)'} /></Button>
        <Button variant="secondary" size="sm" icon={FileSpreadsheet} loading={busy === 'phrases-csv'} onClick={() => exportPhrasebook('csv')}><UiText source={'Phrasebook (.csv)'} /></Button>
        <Button variant="secondary" size="sm" icon={FileSpreadsheet} loading={busy === 'stats-csv'} onClick={exportStatsCsv}><UiText source={'Statistics (.csv)'} /></Button>
        <Button variant="secondary" size="sm" icon={Printer} loading={busy === 'report-html'} onClick={exportProgressReport}><UiText source={'Progress report (.html)'} /></Button>
        <Button variant="secondary" size="sm" icon={Calendar} loading={busy === 'calendar-ics'} onClick={exportCalendarIcs}><UiText source={'Study calendar (.ics)'} /></Button>
      </div>
    </div>
  );
}
