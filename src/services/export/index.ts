import type { SavedPhrase } from '@/core/notebook/library';
// Exporting Lingua's records to open formats: CSV (RFC 4180), Markdown with YAML front matter
// and [[wikilinks]], plain text, printable HTML reports, and iCalendar (.ics, RFC 5545).
import type { Chat, DailyStat, Deck, Goal, JournalEntry, Note, Text, Word } from '@/data/types';
import type { ReadingMark } from '@/core/reading/aids';

// ── RFC 4180 CSV helpers ────────────────────────────────────────────────────

export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
  ];
  return lines.join('\r\n') + '\r\n';
}

// ── YAML front matter & wikilink helpers ────────────────────────────────────

function yamlScalar(v: string | number | boolean): string {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (/[:#[\]{}&*!|>'"%@`\n\r]/.test(v) || v.trim() !== v || v === '') {
    return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }
  return v;
}

export function frontMatter(fields: Record<string, string | number | boolean | string[] | undefined>): string {
  const lines: string[] = ['---'];
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}: [${val.map((item) => yamlScalar(item)).join(', ')}]`);
      }
    } else {
      lines.push(`${key}: ${yamlScalar(val)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

export function wikilink(target: string, alias?: string): string {
  const clean = target.replace(/[[\]|]/g, '').trim();
  if (!clean) return alias ?? '';
  return alias && alias !== clean ? `[[${clean}|${alias}]]` : `[[${clean}]]`;
}

// ── 1. Vocabulary to CSV (F1490) ────────────────────────────────────────────

const STATE_NAMES: Record<number, string> = {
  0: 'unseen',
  1: 'known',
  2: 'learning',
};

export function wordsToCsv(words: Word[]): string {
  const headers = ['term', 'lemma', 'lang', 'state', 'gloss', 'tags', 'favourite', 'important', 'note'];
  const rows = words
    .filter((w) => !w.deletedAt)
    .map((w) => [
      w.norm,
      w.lemma ?? '',
      w.lang,
      STATE_NAMES[w.state] ?? String(w.state),
      w.gloss ?? '',
      (w.tags ?? []).join('; '),
      w.favourite ? 1 : 0,
      w.important ? 1 : 0,
      w.note ?? '',
    ]);
  return toCsv(headers, rows);
}

// ── 2. Deck to CSV (F0059, F1493) ───────────────────────────────────────────

export function deckToCsv(deck: Pick<Deck, 'name' | 'lang'>, notes: Note[]): string {
  const headers = ['term', 'meaning', 'lemma', 'pos', 'gender', 'ipa', 'example', 'exampleTranslation', 'tags', 'mnemonic', 'deck'];
  const rows = notes
    .filter((n) => !n.deletedAt)
    .map((n) => [
      n.term,
      n.meaning,
      n.lemma ?? '',
      n.pos ?? '',
      n.gender ?? '',
      n.ipa ?? '',
      n.example?.text ?? n.context?.sentence ?? '',
      n.example?.translation ?? '',
      (n.tags ?? []).join(' '),
      n.mnemonic ?? '',
      deck.name,
    ]);
  return toCsv(headers, rows);
}

// ── 3. Deck / Notes to Markdown with YAML front matter & [[links]] (F1492, F1511) ─

export function notesToMarkdown(deck: Pick<Deck, 'name' | 'lang' | 'description'>, notes: Note[]): string {
  const active = notes.filter((n) => !n.deletedAt);
  const fm = frontMatter({
    title: deck.name,
    type: 'lingua-deck',
    lang: deck.lang,
    cards: active.length,
  });

  const sections = active.map((n) => {
    const heading = `## ${wikilink(n.lemma || n.term, n.term)}`;
    const meta: string[] = [];
    if (n.pos) meta.push(`*${n.pos}*`);
    if (n.gender) meta.push(`(${n.gender})`);
    if (n.ipa) meta.push(`/${n.ipa}/`);
    const tags = (n.tags ?? []).map((t) => `#${t.replace(/\s+/g, '-')}`).join(' ');

    const lines = [heading];
    if (meta.length) lines.push(meta.join(' '));
    lines.push('', `- **Meaning:** ${n.meaning}`);
    if (n.lemma && n.lemma !== n.term) lines.push(`- **Lemma:** ${wikilink(n.lemma)}`);
    if (n.example?.text) {
      lines.push(`- **Example:** ${n.example.text}`);
      if (n.example.translation) lines.push(`  - *${n.example.translation}*`);
    } else if (n.context?.sentence) {
      lines.push(`- **Context:** ${n.context.sentence}`);
    }
    if (n.mnemonic) lines.push(`- **Mnemonic:** ${n.mnemonic}`);
    if (tags) lines.push(`- **Tags:** ${tags}`);
    return lines.join('\n');
  });

  const desc = deck.description ? `\n${deck.description}\n` : '';
  return `${fm}\n\n# ${deck.name}${desc}\n\n${sections.join('\n\n')}\n`;
}

// ── 4. Journal / Diarium entries to Markdown & plain text (F0692, F1492) ────

export function entriesToMarkdown(entries: JournalEntry[], lang?: string): string {
  const active = entries.filter((e) => !e.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
  const fm = frontMatter({
    title: 'Diarium Journal Export',
    type: 'lingua-journal',
    lang: lang ?? active[0]?.lang ?? 'all',
    entries: active.length,
  });

  const body = active.map((entry) => {
    const title = entry.title?.trim() || entry.date;
    const lines: string[] = [
      `## ${title} (${entry.date})`,
      '',
    ];
    if (entry.prompt) {
      lines.push(`> **Prompt:** ${entry.prompt}`);
      lines.push('');
    }
    lines.push(entry.text.trim());
    if (entry.review) {
      lines.push('');
      lines.push(`### Review (${entry.review.cefr} · Score ${entry.review.scores.overall}/100)`);
      if (entry.review.corrected && entry.review.corrected !== entry.text) {
        lines.push('', '**Corrected:**', entry.review.corrected);
      }
      if (entry.review.corrections.length > 0) {
        lines.push('', '**Notes:**');
        for (const c of entry.review.corrections) {
          lines.push(`- ~~${c.original}~~ → **${c.suggestion}** (*${c.category}*): ${c.explanation}`);
        }
      }
    }
    return lines.join('\n');
  });

  return `${fm}\n\n# Diarium Journal\n\n${body.join('\n\n---\n\n')}\n`;
}

export function entriesToText(entries: JournalEntry[]): string {
  const active = entries.filter((e) => !e.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
  return active
    .map((entry) => {
      const header = `${entry.date}${entry.title ? ` — ${entry.title}` : ''} (${entry.words} words)`;
      const rule = '='.repeat(Math.min(72, header.length));
      const parts = [header, rule];
      if (entry.prompt) parts.push(`Prompt: ${entry.prompt}`, '');
      parts.push(entry.text.trim());
      if (entry.review?.corrected && entry.review.corrected !== entry.text) {
        parts.push('', `Corrected (${entry.review.cefr}):`, entry.review.corrected.trim());
      }
      return parts.join('\n');
    })
    .join('\n\n\n');
}

// ── 5. Grammar notes to Markdown (F1138, F1492, F1511) ──────────────────────

export interface GrammarNoteExportItem {
  id: string;
  lang: string;
  title: string;
  level?: string;
  summary?: string;
  userNote?: string;
  examples?: Array<{ target: string; translation?: string }>;
  relatedTopics?: string[];
}

export function grammarNotesToMarkdown(items: GrammarNoteExportItem[], lang: string): string {
  const fm = frontMatter({
    title: `Grammar Notes (${lang.toUpperCase()})`,
    type: 'lingua-grammar-notes',
    lang,
    topics: items.length,
  });

  const sections = items.map((item) => {
    const head = `## ${wikilink(item.title)}${item.level ? ` (${item.level})` : ''}`;
    const lines = [head];
    if (item.summary) lines.push('', item.summary);
    if (item.userNote) {
      lines.push('', '### Personal Notes', item.userNote);
    }
    if (item.examples && item.examples.length > 0) {
      lines.push('', '### Examples');
      for (const ex of item.examples) {
        lines.push(`- **${ex.target}**${ex.translation ? ` — *${ex.translation}*` : ''}`);
      }
    }
    if (item.relatedTopics && item.relatedTopics.length > 0) {
      lines.push('', `Related: ${item.relatedTopics.map((t) => wikilink(t)).join(', ')}`);
    }
    return lines.join('\n');
  });

  return `${fm}\n\n# Grammar Notes (${lang.toUpperCase()})\n\n${sections.join('\n\n')}\n`;
}

// ── 6. Learning statistics to CSV (F1494) ───────────────────────────────────

export function statsToCsv(stats: DailyStat[]): string {
  const headers = [
    'date',
    'lang',
    'readMinutes',
    'wordsRead',
    'listenMinutes',
    'watchMinutes',
    'writeMinutes',
    'wordsWritten',
    'songMinutes',
    'reviews',
    'againCount',
    'newCards',
    'knownTotal',
    'learningTotal',
    'newKnown',
    'newLearning',
    'goalMet',
  ];
  const sorted = [...stats].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map((s) => [
    s.date,
    s.lang,
    Math.round((s.readMs ?? 0) / 60000),
    s.wordsRead ?? 0,
    Math.round((s.listenMs ?? 0) / 60000),
    Math.round((s.watchMs ?? 0) / 60000),
    Math.round((s.writeMs ?? 0) / 60000),
    s.wordsWritten ?? 0,
    Math.round((s.songMs ?? 0) / 60000),
    s.reviews ?? 0,
    s.againCount ?? 0,
    s.newCards ?? 0,
    s.knownTotal ?? 0,
    s.learningTotal ?? 0,
    s.newKnown ?? 0,
    s.newLearning ?? 0,
    s.goalMet ? 1 : 0,
  ]);
  return toCsv(headers, rows);
}

// ── 7. Reading highlights & Bilingual reading journal to Markdown (F0408, F1495) ─

export function highlightsToMarkdown(texts: Array<Pick<Text, 'id' | 'title' | 'author' | 'lang' | 'readingMarks' | 'finishedAt'>>): string {
  const withMarks = texts.filter((t) => (t.readingMarks?.length ?? 0) > 0);
  const totalMarks = withMarks.reduce((acc, t) => acc + (t.readingMarks?.length ?? 0), 0);
  const fm = frontMatter({
    title: 'Reading Highlights & Margin Notes',
    type: 'lingua-highlights',
    books: withMarks.length,
    highlights: totalMarks,
  });

  const sections = withMarks.map((t) => {
    const head = `## ${wikilink(t.title)}${t.author ? ` — *${t.author}*` : ''}`;
    const marks = (t.readingMarks ?? []).map((m: ReadingMark) => {
      const lines = [`> ${m.quote}`];
      if (m.note) lines.push(`>\n> — **Note:** ${m.note}`);
      lines.push(`> *(Chapter ${m.chapterIndex + 1}, ${m.colour})*`);
      return lines.join('\n');
    });
    return `${head}\n\n${marks.join('\n\n')}`;
  });

  return `${fm}\n\n# Reading Highlights & Margin Notes\n\n${sections.join('\n\n---\n\n')}\n`;
}

export interface BilingualJournalItem {
  text: Pick<Text, 'id' | 'title' | 'author' | 'lang' | 'wordCount' | 'finishedAt' | 'readingMarks'>;
  keyWords?: Array<{ term: string; gloss: string }>;
  summary?: string;
}

export function bilingualReadingJournalToMarkdown(items: BilingualJournalItem[], lang: string): string {
  const fm = frontMatter({
    title: `Bilingual Reading Journal (${lang.toUpperCase()})`,
    type: 'lingua-reading-journal',
    lang,
    works: items.length,
  });

  const sections = items.map(({ text, keyWords, summary }) => {
    const dateStr = text.finishedAt ? new Date(text.finishedAt).toISOString().slice(0, 10) : 'In progress';
    const lines = [
      `## ${wikilink(text.title)}${text.author ? ` — *${text.author}*` : ''}`,
      `- **Status / Date:** ${dateStr} · **Length:** ${text.wordCount.toLocaleString()} words`,
    ];
    if (summary) {
      lines.push('', '### Reflections & Summary', summary);
    }
    if (text.readingMarks && text.readingMarks.length > 0) {
      lines.push('', '### Highlights & Margin Notes');
      for (const m of text.readingMarks) {
        lines.push(`- "${m.quote}"${m.note ? ` → *${m.note}*` : ''}`);
      }
    }
    if (keyWords && keyWords.length > 0) {
      lines.push('', '### Vocabulary Kept');
      for (const kw of keyWords) {
        lines.push(`- ${wikilink(kw.term)} — ${kw.gloss}`);
      }
    }
    return lines.join('\n');
  });

  return `${fm}\n\n# Bilingual Reading Journal (${lang.toUpperCase()})\n\n${sections.join('\n\n---\n\n')}\n`;
}

// ── 8. Conversation transcripts to Markdown (F1496) ─────────────────────────

export function conversationsToMarkdown(chats: Chat[]): string {
  const active = chats.filter((c) => !c.deletedAt && c.messages.length > 0);
  const fm = frontMatter({
    title: 'Colloquium Conversation Transcripts',
    type: 'lingua-conversations',
    conversations: active.length,
  });

  const sections = active.map((chat) => {
    const date = new Date(chat.createdAt).toISOString().slice(0, 10);
    const lines = [`## ${chat.title} (${date} · ${chat.lang.toUpperCase()})`, ''];
    for (const msg of chat.messages) {
      const speaker = msg.role === 'me' ? '**You**' : '**Partner**';
      lines.push(`${speaker}: ${msg.text}`);
      if (msg.en) lines.push(`  *(Translation: ${msg.en})*`);
      if (msg.corrections && msg.corrections.length > 0) {
        for (const c of msg.corrections) {
          lines.push(`  - *Correction:* ~~${c.original}~~ → **${c.suggestion}** (${c.explanation})`);
        }
      }
      if (msg.words && msg.words.length > 0) {
        lines.push(`  - *Words:* ${msg.words.map((w) => `${wikilink(w.word)} (${w.meaning})`).join(', ')}`);
      }
    }
    return lines.join('\n');
  });

  return `${fm}\n\n# Conversation Transcripts\n\n${sections.join('\n\n---\n\n')}\n`;
}

// ── 9. Personal phrasebook to Markdown & CSV (F1497) ────────────────────────

export interface PhraseExportItem {
  phrase: string;
  meaning: string;
  literal?: string;
  usageNote?: string;
  category?: string;
  example?: string;
  tags?: string[];
}

export function savedPhrasesForExport(phrases: SavedPhrase[]): PhraseExportItem[] {
  return phrases.filter((p) => !p.deletedAt).map((p) => ({ phrase: p.text, meaning: p.translation, category: p.kind, tags: p.tags, usageNote: [p.folder && `Folder: ${p.folder}`, p.situation && `Situation: ${p.situation}`, p.topic && `Topic: ${p.topic}`, p.formal && `Formal: ${p.formal}`, p.informal && `Informal: ${p.informal}`, p.notes, p.source && `Source: ${p.source}`].filter(Boolean).join('\n') }));
}

export function phrasebookToMarkdown(phrases: PhraseExportItem[], lang: string): string {
  const fm = frontMatter({
    title: `Personal Phrasebook (${lang.toUpperCase()})`,
    type: 'lingua-phrasebook',
    lang,
    phrases: phrases.length,
  });

  const sections = phrases.map((p) => {
    const lines = [`### ${p.phrase}`, `- **Meaning:** ${p.meaning}`];
    if (p.literal) lines.push(`- **Literal:** ${p.literal}`);
    if (p.category) lines.push(`- **Category:** ${p.category}`);
    if (p.usageNote) lines.push(`- **Usage:** ${p.usageNote}`);
    if (p.example) lines.push(`- **Example:** *${p.example}*`);
    if (p.tags && p.tags.length > 0) lines.push(`- **Tags:** ${p.tags.map((t) => `#${t}`).join(' ')}`);
    return lines.join('\n');
  });

  return `${fm}\n\n# Personal Phrasebook (${lang.toUpperCase()})\n\n${sections.join('\n\n')}\n`;
}

export function phrasebookToCsv(phrases: PhraseExportItem[]): string {
  const headers = ['phrase', 'meaning', 'literal', 'category', 'usageNote', 'example', 'tags'];
  const rows = phrases.map((p) => [
    p.phrase,
    p.meaning,
    p.literal ?? '',
    p.category ?? '',
    p.usageNote ?? '',
    p.example ?? '',
    (p.tags ?? []).join('; '),
  ]);
  return toCsv(headers, rows);
}

// ── 10. Printable Progress Report & Writing Portfolio HTML (F0692, F1498) ───

export interface ProgressReportData {
  lang: string;
  langName: string;
  level: string;
  generatedAt: string;
  knownWords: number;
  learningWords: number;
  totalReviews: number;
  totalHours: number;
  booksRead: number;
  streakDays: number;
  recentEntries?: JournalEntry[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function progressReportToHtml(data: ProgressReportData): string {
  const entriesHtml = (data.recentEntries ?? [])
    .slice(0, 10)
    .map(
      (e) => `
      <article class="entry">
        <h3>${escapeHtml(e.title || e.date)} <span class="meta">(${escapeHtml(e.date)} · ${e.words} words${e.review ? ` · ${escapeHtml(e.review.cefr)}` : ''})</span></h3>
        <p>${escapeHtml(e.text).replace(/\n/g, '<br/>')}</p>
      </article>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Lingua Progress Report — ${escapeHtml(data.langName)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #1f1e1b; background: #faf7f0; max-width: 760px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.6; }
    header { border-bottom: 2px solid #2c2a25; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    h1 { margin: 0 0 0.25rem 0; font-size: 1.8rem; }
    .subtitle { color: #656056; font-size: 0.95rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .stat { border: 1px solid #dcd6c8; border-radius: 6px; padding: 0.85rem 1rem; background: #fffdf8; }
    .stat-value { font-size: 1.5rem; font-weight: bold; }
    .stat-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #656056; }
    .entry { border-top: 1px solid #e4decb; padding-top: 1rem; margin-top: 1rem; }
    .meta { font-weight: normal; font-size: 0.9rem; color: #656056; }
    @media print { body { background: #fff; margin: 0; } }
  </style>
</head>
<body>
  <header>
    <h1>Lingua Progress Report · ${escapeHtml(data.langName)} (${escapeHtml(data.level)})</h1>
    <div class="subtitle">Generated on ${escapeHtml(data.generatedAt)}</div>
  </header>
  <section class="grid">
    <div class="stat"><div class="stat-value">${data.knownWords.toLocaleString()}</div><div class="stat-label">Known Words</div></div>
    <div class="stat"><div class="stat-value">${data.learningWords.toLocaleString()}</div><div class="stat-label">Learning Words</div></div>
    <div class="stat"><div class="stat-value">${data.totalHours.toFixed(1)} h</div><div class="stat-label">Total Study Time</div></div>
    <div class="stat"><div class="stat-value">${data.totalReviews.toLocaleString()}</div><div class="stat-label">Cards Reviewed</div></div>
    <div class="stat"><div class="stat-value">${data.booksRead}</div><div class="stat-label">Texts Finished</div></div>
    <div class="stat"><div class="stat-value">${data.streakDays} d</div><div class="stat-label">Active Streak</div></div>
  </section>
  ${entriesHtml ? `<section><h2>Writing Portfolio</h2>${entriesHtml}</section>` : ''}
</body>
</html>
`;
}

// ── 11. Study schedule & goals to iCalendar .ics (RFC 5545, F1509) ──────────

export interface CalendarEventInput {
  id: string;
  title: string;
  /** YYYY-MM-DD for all-day or start date */
  date: string;
  /** Optional start hour (0-23), default all-day if omitted */
  hour?: number;
  durationMinutes?: number;
  description?: string;
  /** Optional recurrence rule, e.g. 'FREQ=DAILY;COUNT=30' */
  rrule?: string;
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function scheduleToIcs(events: CalendarEventInput[], calendarName = 'Lingua Study Schedule'): string {
  const stamp = '20261029T120000Z';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lingua//Language Study Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ];

  for (const ev of events) {
    const cleanDate = ev.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${icsEscape(ev.id)}@lingua.local`);
    lines.push(`DTSTAMP:${stamp}`);
    if (typeof ev.hour === 'number') {
      const startH = pad2(ev.hour);
      const dur = ev.durationMinutes ?? 30;
      const endTotalMin = ev.hour * 60 + dur;
      const endH = pad2(Math.floor(endTotalMin / 60) % 24);
      const endM = pad2(endTotalMin % 60);
      lines.push(`DTSTART:${cleanDate}T${startH}0000`);
      lines.push(`DTEND:${cleanDate}T${endH}${endM}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
    }
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    }
    if (ev.rrule) {
      lines.push(`RRULE:${ev.rrule}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function goalsToIcsEvents(
  lang: string,
  dailyGoal: { reviews: number; readMinutes: number; listenMinutes: number },
  goals: Goal[],
  startDate = new Date().toISOString().slice(0, 10),
): CalendarEventInput[] {
  const events: CalendarEventInput[] = [
    {
      id: `lingua-daily-${lang}-${startDate}`,
      title: `Lingua (${lang.toUpperCase()}): ${dailyGoal.reviews} reviews · ${dailyGoal.readMinutes}m reading · ${dailyGoal.listenMinutes}m listening`,
      date: startDate,
      hour: 9,
      durationMinutes: Math.max(15, dailyGoal.readMinutes + dailyGoal.listenMinutes),
      description: `Daily language practice in Lingua (${lang.toUpperCase()}).`,
      rrule: 'FREQ=DAILY;COUNT=30',
    },
  ];

  for (const g of goals) {
    if (g.deletedAt) continue;
    if (g.kind === 'level' && g.by) {
      events.push({
        id: `lingua-goal-${g.id}`,
        title: `Lingua Target: Reach ${g.target} in ${lang.toUpperCase()}`,
        date: g.by,
        description: `Milestone target date for reaching ${g.target} in ${lang.toUpperCase()}.`,
      });
    }
  }
  return events;
}

// ── Browser file download helper ────────────────────────────────────────────

export function saveFile(name: string, content: Blob | Uint8Array | string, mime = 'text/plain;charset=utf-8'): void {
  if (typeof document === 'undefined') return;
  const blob =
    content instanceof Blob
      ? content
      : content instanceof Uint8Array
        ? new Blob([content as Uint8Array<ArrayBuffer>], { type: mime })
        : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
