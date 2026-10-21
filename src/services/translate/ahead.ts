// Sentences translated before they're asked for (5.1-3a). With your own AI key (Max), the sentences
// coming into view are translated in idle time, one at a time; without it only the sentence of the
// word you rest on, so the free translators' daily limits last. The answers land in the caches the
// phrase bubble reads, so asking for a sentence shows it at once.
import { getAiSettings } from '@/data/plan';
import { translatePhrase } from './phrase';

interface Job {
  lang: string;
  text: string;
  /** Also with the free translators (a sentence you rest on), not only with an AI key. */
  online: boolean;
}

/** Sentences sent ahead per visit: generous with your own key, a few for the free translators. */
const BUDGET = { ai: 300, online: 30 };
const spent = { ai: 0, online: 0 };
const queue: Job[] = [];
const queued = new Set<string>();
let running = false;

/** Same spacing as the phrase bubble asks with, so the cached answer is found. */
export const sentenceKey = (text: string): string => text.replace(/\s+/g, ' ').trim();

export function translateAhead(lang: string, sentences: Iterable<string | undefined>, { online = false } = {}): void {
  for (const s of sentences) {
    const text = sentenceKey(s ?? '');
    const id = `${lang}:${text}`;
    if (text.length < 3 || text.length > 600 || queued.has(id)) continue;
    queued.add(id);
    // A sentence you rest on goes first: it is the one most likely asked for next.
    if (online) queue.unshift({ lang, text, online });
    else queue.push({ lang, text, online });
  }
  pump();
}

function whenIdle(fn: () => void): void {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 250);
}

function pump(): void {
  if (running || !queue.length) return;
  running = true;
  const job = queue.shift()!;
  whenIdle(() =>
    void run(job).finally(() => {
      running = false;
      pump();
    }),
  );
}

async function run(job: Job): Promise<void> {
  const { llm, apiKeys } = await getAiSettings();
  const by = apiKeys[llm.provider] && llm.model ? 'ai' : 'online';
  if (by === 'online' && !job.online) {
    // Not now, without a key: the sentence may be asked again once one is added.
    queued.delete(`${job.lang}:${job.text}`);
    return;
  }
  if (spent[by] >= BUDGET[by]) return;
  spent[by]++;
  await translatePhrase(job.lang, job.text).catch(() => null);
}
