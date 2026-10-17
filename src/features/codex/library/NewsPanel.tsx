import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Link2, Newspaper, RefreshCw } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import type { Cefr } from '@/core/lang/levels';
import { newsSources } from '@/core/lang/news';
import type { NewsItem, ReadArticle } from '@/core/parsers/article';
import { countWords } from '@/core/text/tokenizer';
import { db } from '@/data/db';
import { Button, Card, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { addArticle, isArticleLink, latestNews, NewsError, readArticle } from '@/services/news/news';
import { toast } from '@/state/ui';
import { LevelPicker } from './LevelPicker';

function ago(ms: number | undefined): string {
  if (!ms) return '';
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/** An article already in the library, by its link. */
const alreadyAdded = async (lang: string, url: string) => (await db.texts.where('lang').equals(lang).toArray()).find((t) => !t.deletedAt && t.sourceUrl === url.trim());

/**
 * News to read: an article from a link, or a story from a source's latest list (one tap adds it and
 * opens it). Pages are read through Jina Reader.
 */
export function NewsPanel({ lang, onDone, onPaste }: { lang: string; onDone: (id: string) => void; onPaste: () => void }) {
  const sources = newsSources(lang);
  const [link, setLink] = useState('');
  const [reading, setReading] = useState<string | null>(null);
  const [article, setArticle] = useState<{ url: string; article: ReadArticle } | null>(null);
  const [level, setLevel] = useState<Cefr | undefined>(undefined);
  const [failed, setFailed] = useState<string | null>(null);

  const read = async (url: string, addNow: boolean) => {
    setFailed(null);
    const existing = await alreadyAdded(lang, url);
    if (existing) return onDone(existing.id);
    setReading(url);
    try {
      const a = await readArticle(url, lang);
      if (addNow) return onDone(await addArticle(lang, a, url));
      setArticle({ url, article: a });
    } catch (error) {
      setFailed(error instanceof NewsError ? error.message : 'That page couldn’t be read. Paste its text instead.');
    } finally {
      setReading(null);
    }
  };

  const words = article ? article.article.blocks.reduce((n, b) => n + ('text' in b ? countWords(b.text, lang) : 0), 0) : 0;
  const lead = article?.article.blocks.map((b) => (b.t === 'p' && 'text' in b ? b.text : '')).find(Boolean);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="min-w-0">
        <p className="mb-1.5 text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">From a link</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (isArticleLink(link)) void read(link, false);
            else setFailed('That doesn’t look like a web address. It should start with https://');
          }}
        >
          <label className="relative min-w-0 flex-1">
            <Link2 size={17} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              inputMode="url"
              type="url"
              placeholder="https://… a news story or blog post"
              aria-label="Article link"
              className="h-12 w-full rounded-xl border border-line bg-raised pr-3 pl-10 text-[15px] transition-colors focus:border-accent"
            />
          </label>
          <Button size="lg" type="submit" loading={reading === link && link !== ''} disabled={!link.trim()}>
            Read
          </Button>
        </form>
        <p className="mt-2 text-[12.5px] leading-snug text-ink-faint">
          The page is fetched by Jina Reader (r.jina.ai), which keeps only the article’s text. It sees the link, nothing else. Pages behind a login or paywall can’t be read; paste their text instead.
        </p>

        {failed && (
          <Card className="mt-4 flex flex-col items-start gap-3 border-accent/30 sm:flex-row sm:items-center">
            <p className="flex-1 text-[14px] text-ink-soft">{failed}</p>
            <Button variant="secondary" size="sm" onClick={onPaste}>
              Paste the text
            </Button>
          </Card>
        )}

        {article && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
            <Card className="mt-4">
              <p className="text-[12px] font-bold tracking-wide text-ink-faint uppercase">{article.article.site}</p>
              <p lang={lang} className="mt-1 font-serif text-[20px] leading-snug font-semibold">
                {article.article.title}
              </p>
              <p lang={lang} className="mt-2 line-clamp-3 font-serif text-[15px] leading-relaxed text-ink-soft">
                {lead}
              </p>
              <p className="mt-2 text-[12.5px] font-semibold text-ink-faint tabular-nums">
                {words.toLocaleString()} words{article.article.published ? ` · ${ago(article.article.published)}` : ''}
              </p>
              <div className="mt-4">
                <span className="mb-1.5 block text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">Reading level</span>
                <LevelPicker value={level} onChange={setLevel} />
              </div>
              <Button className="mt-4" icon={ArrowRight} onClick={async () => onDone(await addArticle(lang, article.article, article.url, level))}>
                Add and read
              </Button>
            </Card>
          </motion.div>
        )}
      </section>

      <section className="min-w-0">
        <p className="mb-1.5 text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">Latest news</p>
        {sources.length ? (
          <Latest lang={lang} reading={reading} onRead={(url) => void read(url, true)} />
        ) : (
          <Card className="text-[14px] text-ink-soft">
            <Newspaper size={20} aria-hidden className="mb-2 text-ink-faint" />
            No news sources for {getLanguage(lang)?.name ?? lang} yet. A link to any article works.
          </Card>
        )}
      </section>
    </div>
  );
}

function Latest({ lang, reading, onRead }: { lang: string; reading: string | null; onRead: (url: string) => void }) {
  const sources = newsSources(lang);
  const [sourceId, setSourceId] = useState(sources[0].id);
  const source = sources.find((s) => s.id === sourceId) ?? sources[0];
  const [items, setItems] = useState<NewsItem[] | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    setItems(undefined);
    latestNews(source)
      .then((list) => alive && setItems(list))
      .catch((e: unknown) => {
        if (!alive) return;
        setItems(null);
        setError(e instanceof Error ? e.message : 'The news couldn’t be loaded.');
      });
    return () => {
      alive = false;
    };
  }, [source, round]);

  return (
    <div>
      {sources.length > 1 && (
        <div className="mb-3">
          <Segmented label="News source" value={sourceId} onChange={setSourceId} options={sources.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
      )}
      {items === undefined && (
        <ul className="space-y-2" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />
          ))}
        </ul>
      )}
      {items === null && (
        <Card className="flex items-center gap-3">
          <p className="flex-1 text-[14px] text-ink-soft">{error}</p>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setRound((r) => r + 1)}>
            Try again
          </Button>
        </Card>
      )}
      {items && (
        <ul className="-mx-2">
          {items.map((item) => (
            <li key={item.link}>
              <button
                type="button"
                disabled={reading !== null}
                onClick={() => {
                  toast(`Reading “${item.title.slice(0, 60)}”…`);
                  onRead(item.link);
                }}
                className={cx(
                  'group flex w-full items-start gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface disabled:opacity-60',
                  reading === item.link && 'animate-pulse bg-surface',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span lang={lang} className="line-clamp-2 block font-serif text-[16px] leading-snug font-semibold">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-ink-faint">
                    {[ago(item.published), item.summary].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <ArrowRight size={16} aria-hidden className="mt-1 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[12px] text-ink-faint">Tap a story to add it to your library and start reading.</p>
    </div>
  );
}
