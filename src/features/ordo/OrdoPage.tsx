import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import { useLanguages } from '@/data/languages';
import { getReaderFont } from '@/design/fonts';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { fade } from '@/design/motion';
import { aiBlock } from '@/data/plan';
import { SearchInput } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { formatDateTime } from '@/lib/format';
import { APP_VERSION, GROUPS, LEARNING_GROUPS, getGroup, groupOf, searchSettings, sectionTitle } from './groups';
import type { SectionId, SettingEntry, SettingsGroup } from './groups';
import { SectionAlone } from './SettingsSection';
import { AboutSection } from './sections/AboutSection';
import { AiSection } from './sections/AiSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { BackupSection } from './sections/BackupSection';
import { CardsSection } from './sections/CardsSection';
import { KeyboardSection } from './sections/KeyboardSection';
import { LanguageSection } from './sections/LanguageSection';
import { ListeningSection } from './sections/ListeningSection';
import { MusicSection } from './sections/MusicSection';
import { PerformanceSection } from './sections/PerformanceSection';
import { PlanSection } from './sections/PlanSection';
import { ReadingSection } from './sections/ReadingSection';
import { ResetSection } from './sections/ResetSection';
import { StorageSection } from './sections/StorageSection';
import { SyncSection } from './sections/SyncSection';
import { StudySection } from './sections/StudySection';

/** Keyboard shortcuts only matter with a keyboard and a mouse or trackpad. */
const TOUCH_HIDDEN: ReadonlySet<SectionId> = new Set(['keyboard']);
const NONE_HIDDEN: ReadonlySet<SectionId> = new Set();

/**
 * Settings, a few groups at a time. Phones get a list of groups that each open as their own page
 * (Back returns to the list); wide screens keep the groups in a column beside the open one. A
 * search finds any single setting and opens its page with that setting lit up. Older links like
 * /ordo#ai land on the group that holds that section.
 */
export default function OrdoPage() {
  const { group: groupId } = useParams();
  const { hash, state } = useLocation();
  const { layout, pointer } = useLayout();
  const hidden = pointer === 'fine' ? NONE_HIDDEN : TOUCH_HIDDEN;

  if (!groupId && hash) {
    const owner = groupOf(hash.slice(1));
    if (owner) return <Navigate to={`/settings/${owner.id}${hash}`} replace state={state} />;
  }
  const group = getGroup(groupId);
  if (groupId && !group) return <Navigate to="/settings" replace />;

  if (layout === 'wide') return <WideOrdo group={group ?? GROUPS[0]} hidden={hidden} />;
  return group ? <GroupPage group={group} hidden={hidden} /> : <Overview hidden={hidden} />;
}

// ── Phones and tablets ──────────────────────────────────────────────────────────────────────────

function Overview({ hidden }: { hidden: ReadonlySet<SectionId> }) {
  const [query, setQuery] = useState('');
  const summaries = useSummaries(hidden);
  return (
    <>
      <PageHeader title="Settings" />
      <SearchInput value={query} onChange={setQuery} placeholder="Search settings" className="mb-6" />
      {query.trim() ? (
        <SearchResults query={query} hidden={hidden} />
      ) : (
        <div className="space-y-6">
          <GroupList title="Your learning" groups={GROUPS.filter((g) => LEARNING_GROUPS.includes(g.id))} summaries={summaries} />
          <GroupList title="Lingua" groups={GROUPS.filter((g) => !LEARNING_GROUPS.includes(g.id))} summaries={summaries} />
        </div>
      )}
    </>
  );
}

function GroupList({ title, groups, summaries }: { title: string; groups: SettingsGroup[]; summaries: Summaries }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</h2>
      <ul className="overflow-hidden rounded-3xl border border-line/70 bg-surface">
        {groups.map((g, i) => (
          <li key={g.id}>
            <Link to={`/settings/${g.id}`} className="flex items-center gap-3.5 pl-4 transition-colors active:bg-sunken">
              <Tile group={g} />
              <span className={cx('flex min-h-[64px] min-w-0 flex-1 items-center gap-2 py-3 pr-3.5', i > 0 && 'border-t border-line/70')}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15.5px] leading-snug font-semibold">{g.title}</span>
                  <span className={cx('block truncate text-[13px] leading-snug', summaries[g.id]?.attention ? 'text-accent-text' : 'text-ink-soft')}>
                    {summaries[g.id]?.text}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GroupPage({ group, hidden }: { group: SettingsGroup; hidden: ReadonlySet<SectionId> }) {
  return (
    <>
      <PageHeader eyebrow="Settings" title={group.title} />
      <GroupSections group={group} hidden={hidden} />
    </>
  );
}

// ── Wide screens ────────────────────────────────────────────────────────────────────────────────

function WideOrdo({ group, hidden }: { group: SettingsGroup; hidden: ReadonlySet<SectionId> }) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => searchRef.current?.focus() });
  const searching = Boolean(query.trim());

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-[236px_minmax(0,1fr)] gap-10">
        <nav aria-label="Settings" className="sticky top-12 self-start">
          <SearchInput ref={searchRef} value={query} onChange={setQuery} placeholder="Search settings" className="mb-4" />
          {[GROUPS.filter((g) => LEARNING_GROUPS.includes(g.id)), GROUPS.filter((g) => !LEARNING_GROUPS.includes(g.id))].map((list, i) => (
            <ul key={i} className={cx('space-y-0.5', i > 0 && 'mt-3 border-t border-line/70 pt-3')}>
              {list.map((g) => {
                const current = !searching && g.id === group.id;
                return (
                  <li key={g.id}>
                    <Link
                      to={`/settings/${g.id}`}
                      onClick={() => setQuery('')}
                      aria-current={current ? 'page' : undefined}
                      className={cx(
                        'flex items-center gap-3 rounded-xl px-2.5 py-2 text-[14.5px] font-semibold transition-colors',
                        current ? 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)]' : 'text-ink-soft hover:bg-surface/70 hover:text-ink',
                      )}
                    >
                      <Tile group={g} small />
                      {g.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        </nav>
        <div className="min-w-0">
          {searching ? (
            <SearchResults query={query} hidden={hidden} onPick={() => setQuery('')} />
          ) : (
            <motion.div key={group.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={fade}>
              <h2 className="mb-5 font-serif text-[26px] leading-tight font-semibold">{group.title}</h2>
              <GroupSections group={group} hidden={hidden} />
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────────────────────────

function Tile({ group, small }: { group: SettingsGroup; small?: boolean }) {
  const Icon = group.icon;
  const style = {
    backgroundColor: `color-mix(in oklab, ${group.color} 24%, var(--surface))`,
    color: `color-mix(in oklab, ${group.color} 72%, var(--ink))`,
  } as CSSProperties;
  return (
    <span className={cx('grid shrink-0 place-items-center', small ? 'size-7 rounded-[9px]' : 'size-9 rounded-[11px]')} style={style} aria-hidden>
      <Icon size={small ? 15 : 18} />
    </span>
  );
}

function GroupSections({ group, hidden }: { group: SettingsGroup; hidden: ReadonlySet<SectionId> }) {
  const sections = group.sections.filter((s) => !hidden.has(s));
  useLanding(sections[0]);
  return (
    <SectionAlone.Provider value={sections.length === 1}>
      <div className="flex min-w-0 flex-col gap-5">
        {sections.map((id) => (
          <SectionView key={id} id={id} />
        ))}
      </div>
    </SectionAlone.Provider>
  );
}

function SectionView({ id }: { id: SectionId }) {
  const { settings, language } = useApp();
  switch (id) {
    case 'appearance':
      return <AppearanceSection theme={settings.theme} motion={settings.ui.motion} palette={settings.palette} homeLayout={settings.ui.homeLayout} flavour={settings.ui.flavour} lang={language.id} />;
    case 'reading':
      return <ReadingSection reader={settings.reader} lang={language.id} />;
    case 'study':
      return <StudySection study={settings.study} />;
    case 'cards':
      return <CardsSection look={settings.cards} lang={language.id} />;
    case 'listening':
      return <ListeningSection audio={settings.audio} />;
    case 'music':
      return <MusicSection cantus={settings.cantus} spotify={settings.spotify} youtubeKey={settings.apiKeys.youtube ?? ''} />;
    case 'language':
      return <LanguageSection active={language} />;
    case 'ai':
      return <AiSection llm={settings.llm} apiKeys={settings.apiKeys} translation={settings.translation} />;
    case 'plus':
      return <PlanSection meta={settings.meta} />;
    case 'sync':
      return <SyncSection sync={settings.sync} />;
    case 'storage':
      return <StorageSection />;
    case 'backup':
      return <BackupSection meta={settings.meta} />;
    case 'reset':
      return <ResetSection language={language} />;
    case 'keyboard':
      return <KeyboardSection />;
    case 'performance':
      return <PerformanceSection perfHud={settings.ui.perfHud} />;
    case 'about':
      return <AboutSection />;
  }
}

function SearchResults({ query, hidden, onPick }: { query: string; hidden: ReadonlySet<SectionId>; onPick?: () => void }) {
  const navigate = useNavigate();
  const results = useMemo(() => searchSettings(query, hidden), [query, hidden]);
  const open = (entry: SettingEntry) => {
    const group = groupOf(entry.section)!;
    onPick?.();
    navigate(`/settings/${group.id}#${entry.section}`, { state: { find: entry.find ?? entry.label } });
  };

  if (!results.length) {
    return <p className="px-1 py-6 text-center text-[15px] text-ink-soft">Nothing in settings matches “{query.trim()}”.</p>;
  }
  return (
    <ul aria-label="Matching settings" className="overflow-hidden rounded-3xl border border-line/70 bg-surface">
      {results.map((entry, i) => {
        const group = groupOf(entry.section)!;
        return (
          <li key={`${entry.section}:${entry.label}`}>
            <button type="button" onClick={() => open(entry)} className="flex w-full items-center gap-3.5 pl-4 text-left transition-colors hover:bg-sunken/60 active:bg-sunken">
              <Tile group={group} />
              <span className={cx('flex min-h-[60px] min-w-0 flex-1 items-center gap-2 py-2.5 pr-3.5', i > 0 && 'border-t border-line/70')}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-snug font-semibold">{entry.label}</span>
                  <span className="block truncate text-[13px] leading-snug text-ink-soft">
                    {group.title}
                    {group.sections.length > 1 && ` › ${sectionTitle(entry.section)}`}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type Summaries = Record<string, { text: string; attention?: boolean }>;

/** One line under each group on the overview: how things stand now. */
function useSummaries(hidden: ReadonlySet<SectionId>): Summaries {
  const { settings, language } = useApp();
  const languages = useLanguages();
  const { reader, study, audio, llm, apiKeys, theme, ui, meta } = settings;
  const names = (languages ?? [language]).map((l) => getLanguage(l.id)?.name ?? l.id);
  const themeName = { paper: 'Paper', nocturne: 'Nocturne', system: 'Follows the device' }[theme];
  const motionName = { system: 'system motion', reduced: 'reduced motion', full: 'full motion' }[ui.motion];
  const block = aiBlock(settings, llm.provider);
  return {
    reading: { text: `${getReaderFont(reader.font).label} · ${reader.sizePx} px · ${reader.mode === 'paged' ? 'page flip' : 'smooth scroll'}` },
    study: { text: `${study.newPerDay} new cards a day · remember ${Math.round(study.desiredRetention * 100)}%` },
    listening: { text: `${+audio.rate.toFixed(2)}× speed · transcripts ${audio.transcriber === 'groq' ? 'with Groq' : 'on this device'}` },
    music: { text: `English ${{ show: 'shown', blur: 'blurred', hide: 'hidden' }[settings.cantus.translation]} · ${settings.spotify.refreshToken ? 'Spotify connected' : 'Spotify not connected'}` },
    languages: { text: names.join(', ') },
    look: { text: `${themeName} · ${motionName}` },
    ai: !block ? { text: `${llm.provider === 'groq' ? 'Groq' : 'Gemini'} key connected` } : block === 'max' ? { text: apiKeys[llm.provider]?.trim() ? 'Key saved · works with Lingua+ Max' : 'Comes with Lingua+ Max' } : { text: 'Add a free key for explanations', attention: true },
    data: meta.lastBackupAt ? { text: `Last backup ${formatDateTime(meta.lastBackupAt)}` } : { text: 'No backup yet', attention: true },
    about: { text: `Lingua ${APP_VERSION} · ${hidden.has('keyboard') ? '' : 'shortcuts, '}performance, credits` },
  };
}

/**
 * Opening a group from a link or a search: scroll to the section the link names, or to the
 * setting the search picked, and light it up for a moment.
 */
function useLanding(firstSection: SectionId | undefined) {
  const { hash, state, key } = useLocation();
  useEffect(() => {
    const find = (state as { find?: string } | null)?.find;
    const id = hash.slice(1);
    if (!find && (!id || id === firstSection)) return;
    const frame = requestAnimationFrame(() => {
      const section = id ? document.getElementById(id) : null;
      const target = (find && section && findSetting(section, find)) || section;
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: find ? 'center' : 'start' });
      if (find) flash(target);
    });
    return () => cancelAnimationFrame(frame);
    // `key` changes with every navigation, so picking the same result twice lands again.
  }, [hash, state, key, firstSection]);
}

/** The row in a section that shows `label`: by accessible name first, then by visible text. */
function findSetting(section: HTMLElement, label: string): HTMLElement | null {
  const card = (section.firstElementChild as HTMLElement | null) ?? section;
  const named = [...section.querySelectorAll<HTMLElement>('[aria-label]')];
  const texts: HTMLElement[] = [];
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.parentElement && n.textContent?.trim()) texts.push(n.parentElement);
  const name = (el: HTMLElement) => el.getAttribute('aria-label') ?? '';
  const text = (el: HTMLElement) => el.textContent?.trim() ?? '';
  const hit =
    named.find((el) => name(el) === label) ??
    texts.find((el) => text(el) === label) ??
    named.find((el) => name(el).startsWith(label)) ??
    texts.find((el) => text(el).startsWith(label)) ??
    texts.find((el) => text(el).includes(label));
  return hit ? rowOf(hit, card) : null;
}

const LABELLED = 'label, [role=radiogroup], [role=group]';
/** How many separate settings an element holds, counted by their labels. */
const settingsIn = (el: HTMLElement) => (el.matches(LABELLED) ? 1 : 0) + el.querySelectorAll(LABELLED).length;

/**
 * Widen a label or control to its whole row (label, control and hint): up through wrappers that
 * hold no other setting and aren't much taller, stopping short of the card.
 */
function rowOf(el: HTMLElement, card: HTMLElement): HTMLElement {
  let row = el;
  while (row.parentElement && row.parentElement !== card && row.parentElement.tagName !== 'SECTION') {
    const parent = row.parentElement;
    if (settingsIn(parent) > Math.max(settingsIn(row), 1)) break;
    if (parent.getBoundingClientRect().height > Math.max(200, row.getBoundingClientRect().height * 1.7)) break;
    row = parent;
  }
  return row;
}

function flash(el: HTMLElement) {
  el.classList.remove('settings-flash');
  void el.offsetWidth;
  el.classList.add('settings-flash');
  el.addEventListener('animationend', () => el.classList.remove('settings-flash'), { once: true });
}
