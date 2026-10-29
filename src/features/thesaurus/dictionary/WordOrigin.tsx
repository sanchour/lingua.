// The language's half of a word's page that Wiktionary gives as data (6-1b): how it is split into syllables, and what it is
// made of, where it comes from and what it is called in other languages.
import { Link } from 'react-router';
import type { FullEntry } from '@/core/dictionary/format';
import { getLanguage } from '@/core/lang/languages';
import { Badge } from '@/design/primitives';
import { entryPath } from './DictionarySearch';

/** Wiktionary's codes for the older stages of languages and for proto-languages, which `getLanguage` does not know. */
const OLDER: Record<string, string> = {
  grc: 'Ancient Greek',
  fro: 'Old French',
  frm: 'Middle French',
  osp: 'Old Spanish',
  roa: 'Romance',
  ang: 'Old English',
  enm: 'Middle English',
  gmh: 'Middle High German',
  goh: 'Old High German',
  gml: 'Middle Low German',
  odt: 'Old Dutch',
  non: 'Old Norse',
  got: 'Gothic',
  orv: 'Old East Slavic',
  cu: 'Old Church Slavonic',
  xno: 'Anglo-Norman',
  'gem-pro': 'Proto-Germanic',
  'ine-pro': 'Proto-Indo-European',
  'sla-pro': 'Proto-Slavic',
  'itc-pro': 'Proto-Italic',
  'sem-pro': 'Proto-Semitic',
  'sem-wes-pro': 'Proto-West-Semitic',
  arc: 'Aramaic',
  he: 'Hebrew',
  ca: 'Catalan',
  gl: 'Galician',
  da: 'Danish',
  nl: 'Dutch',
  lt: 'Lithuanian',
  ga: 'Irish',
};

/** A language by its Wiktionary code: Lingua's name for it, or the older stage's, or the code itself. */
export const etymonName = (code: string) => getLanguage(code)?.name ?? OLDER[code] ?? code;

/** The word split into syllables, the stressed one in bold. */
export function SyllableBadge({ lang, entry }: { lang: string; entry: FullEntry | undefined }) {
  if (!entry?.syl) return null;
  return (
    <Badge>
      <span lang={lang} aria-label={`Syllables: ${entry.syl.join(' ')}`}>
        {entry.syl.map((s, i) => (
          <span key={i}>
            {i > 0 && <span className="text-ink-faint">·</span>}
            <span className={i === entry.stress ? 'font-bold text-ink' : undefined}>{s}</span>
          </span>
        ))}
      </span>
    </Badge>
  );
}

/** What it is made of, where it comes from and its cognates, for the "Where it comes from" block. */
export function OriginLines({ lang, entries }: { lang: string; entries: FullEntry[] }) {
  const parts = entries.find((e) => e.parts)?.parts;
  const root = entries.find((e) => e.root)?.root;
  const cog = entries.find((e) => e.cog)?.cog;
  if (!parts && !root && !cog) return null;
  return (
    <ul className="mb-2 space-y-1 text-[14px] leading-snug">
      {parts && (
        <li>
          <span className="text-ink-faint">Made of </span>
          {parts.map((p, i) => {
            const word = p.replace(/^-+|-+$/g, '');
            return (
              <span key={i}>
                {i > 0 && <span className="text-ink-faint"> + </span>}
                {/\s/.test(word) || p !== word ? (
                  <span lang={lang} className="font-serif font-semibold">
                    {p}
                  </span>
                ) : (
                  <Link to={entryPath(word)} lang={lang} className="font-serif font-semibold underline decoration-line-strong underline-offset-4">
                    {p}
                  </Link>
                )}
              </span>
            );
          })}
        </li>
      )}
      {root && (
        <li>
          <span className="text-ink-faint">From {etymonName(root[0])} </span>
          <span className="font-serif font-semibold">{root[1]}</span>
        </li>
      )}
      {cog && (
        <li>
          <span className="text-ink-faint">Also </span>
          {cog.map(([l, w], i) => (
            <span key={`${l}-${w}`}>
              {i > 0 && <span className="text-ink-faint"> · </span>}
              <span className="text-ink-soft">{etymonName(l)} </span>
              <span lang={l} className="font-serif font-semibold">
                {w}
              </span>
            </span>
          ))}
        </li>
      )}
    </ul>
  );
}
