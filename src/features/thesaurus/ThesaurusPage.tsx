import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Layers, Plus, Search, SearchX, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { STARTER_THEMES } from '@/core/lang/starter';
import { createDeck, createFolder, useDeckCounts, useDecks, useFolders } from '@/data/decks';
import { patchSetting } from '@/data/settings';
import type { DeckSort } from '@/data/settings';
import { starterKey, useStarterList } from '@/data/starter';
import type { StarterSpec } from '@/data/starter';
import { useStudyOutlook } from '@/data/study';
import type { Deck, Folder } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Card, IconButton, SearchInput, searchKey, Segmented, SortMenu } from '@/design/primitives';
import { fade, spring } from '@/design/motion';
import { THEME_ICONS } from './common/DeckIcon';
import { CsvImportDrawer } from './library/CsvImportDrawer';
import { DeckResults, DeckTree, deckOrder } from './library/DeckTree';
import type { TreeActions } from './library/DeckTree';
import { ConfirmDialog, MoveDialog, NameDialog } from './library/dialogs';
import type { ConfirmRequest, MoveRequest, NameRequest } from './library/dialogs';
import { NewMenu } from './library/NewMenu';
import type { NewAction } from './library/NewMenu';
import { StarterLibrary } from './library/StarterLibrary';
import { TodayCard } from './library/TodayCard';
import { useDeckImport } from './library/useDeckImport';
import { MundusLink } from '@/features/mundus/MundusLink';

type Tab = 'decks' | 'discover';

const SORTS: Array<{ value: DeckSort; label: string }> = [
  { value: 'due', label: 'Most to do' },
  { value: 'recent', label: 'Recently studied' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Most cards' },
];

const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.05 * i } });

export default function ThesaurusPage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const navigate = useNavigate();
  const { pointer } = useLayout();
  const decks = useDecks(lang);
  const folders = useFolders(lang);
  const counts = useDeckCounts(decks);
  const outlook = useStudyOutlook(decks);
  const imports = useDeckImport(lang);
  const sort = settings.ui.deckSort;

  const [params, setParams] = useSearchParams();
  const hasDecks = Boolean(decks?.length);
  // The tab you pick wins; with nothing chosen, an empty treasury opens on Discover.
  const picked = params.get('tab');
  const tab: Tab = picked === 'decks' || picked === 'discover' ? picked : decks && !hasDecks ? 'discover' : 'decks';
  const setTab = (next: Tab) => setParams({ tab: next }, { replace: true });
  const tabsRef = useRef<HTMLDivElement>(null);
  const browse = () => {
    setSearching(false);
    setQuery('');
    setTab('discover');
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => (searching ? searchRef.current?.focus() : setSearching(true)) }, pointer === 'fine');

  const openStarter = (spec: StarterSpec) => navigate('/thesaurus/ready/' + starterKey(spec));
  const [naming, setNaming] = useState<NameRequest | null>(null);
  const [confirming, setConfirming] = useState<ConfirmRequest | null>(null);
  const [moving, setMoving] = useState<MoveRequest | null>(null);

  const newDeck = (folderId: string | null) =>
    setNaming({
      title: 'New deck',
      label: 'Name',
      confirm: 'Create deck',
      folders: folders ?? [],
      folderId,
      onConfirm: async (name, folder) => navigate(`/thesaurus/deck/${await createDeck(lang, { name, folderId: folder })}`),
    });

  const actions: TreeActions = { ask: setNaming, confirm: setConfirming, move: setMoving, newDeck };

  const choose = (action: NewAction) => {
    if (action === 'deck') newDeck(null);
    else if (action === 'folder')
      setNaming({ title: 'New folder', label: 'Name', confirm: 'Create folder', folders: folders ?? [], onConfirm: (name, parent) => void createFolder(lang, name, parent) });
    else if (action === 'csv') void imports.pickCsv();
    else void imports.pickApkg();
  };

  const order = useMemo(() => deckOrder(sort, decks ?? [], folders ?? [], counts, outlook?.lastStudied), [sort, decks, folders, counts, outlook]);

  const closeSearch = () => {
    setQuery('');
    setSearching(false);
  };

  return (
    <>
      <PageHeader title="Thesaurus" actions={<NewMenu busy={imports.apkgProgress !== null} onChoose={choose} />} />

      {imports.apkgProgress !== null && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink-soft" role="status">
          Importing the Anki deck…
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
            <span className="block h-full origin-left rounded-full bg-sage transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.04, imports.apkgProgress)})` }} />
          </span>
        </div>
      )}

      {hasDecks && (
        <motion.div {...enter(0)} className="mb-9">
          <TodayCard lang={lang} hasDecks forecast={outlook?.forecast} onDiscover={browse} />
        </motion.div>
      )}

      <motion.div ref={tabsRef} {...enter(1)} className="mb-5 flex h-11 scroll-mt-24 items-center gap-2">
        <div className="relative h-full min-w-0 flex-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {searching ? (
              <motion.div key="search" className="absolute inset-0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={fade}>
                <SearchInput ref={searchRef} value={query} onChange={setQuery} placeholder="Search decks, folders and themes" onClose={closeSearch} autoFocus />
              </motion.div>
            ) : (
              <motion.div key="tabs" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                <Segmented<Tab>
                  block
                  label="Thesaurus sections"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'decks', label: hasDecks ? `My decks · ${decks!.length}` : 'My decks' },
                    { value: 'discover', label: 'Discover' },
                  ]}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!searching && <IconButton icon={Search} label="Search" shortcut="/" onClick={() => setSearching(true)} />}
        {(tab === 'decks' || searching) && hasDecks && <SortMenu value={sort} options={SORTS} onChange={(deckSort) => void patchSetting('ui', { deckSort })} />}
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        {query.trim() ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
            <SearchResults lang={lang} query={query} decks={decks ?? []} folders={folders ?? []} order={order.decks} onOpenStarter={openStarter}>
              {(found) => <DeckResults decks={found} folders={folders ?? []} counts={counts} actions={actions} />}
            </SearchResults>
          </motion.div>
        ) : tab === 'decks' ? (
          <motion.section key="decks" aria-label="My decks" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={spring.snappy}>
            {hasDecks && folders && <DeckTree decks={decks!} folders={folders} counts={counts} actions={actions} order={order} />}
            {decks && !hasDecks && <NoDecks onBrowse={browse} onNew={() => newDeck(null)} onImport={(kind) => choose(kind)} />}
          </motion.section>
        ) : (
          <motion.section key="discover" aria-label="Ready-made decks" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={spring.snappy}>
            <StarterLibrary lang={lang} onOpen={openStarter} />
            <MundusLink>Series, books, podcasts and radio for new words</MundusLink>
          </motion.section>
        )}
      </AnimatePresence>

      <CsvImportDrawer lang={lang} source={imports.csv} folders={folders ?? []} onClose={imports.closeCsv} />
      <NameDialog request={naming} onClose={() => setNaming(null)} />
      <ConfirmDialog request={confirming} onClose={() => setConfirming(null)} />
      <MoveDialog request={moving} onClose={() => setMoving(null)} />
    </>
  );
}

/** My decks, before there are any: the three ways to start. */
function NoDecks({ onBrowse, onNew, onImport }: { onBrowse: () => void; onNew: () => void; onImport: (kind: 'apkg' | 'csv') => void }) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <Layers size={24} aria-hidden />
      </span>
      <p className="font-serif text-xl font-semibold">No decks yet</p>
      <p className="mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
        Start with ready-made words, make a deck of your own, or bring one from Anki. Words you mark as Learning while reading arrive on their own.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button icon={Sparkles} onClick={onBrowse}>
          Browse ready-made decks
        </Button>
        <Button variant="secondary" icon={Plus} onClick={onNew}>
          New deck
        </Button>
      </div>
      <p className="mt-4 text-[13px] text-ink-soft">
        Or import{' '}
        <button type="button" onClick={() => onImport('apkg')} className="font-semibold text-accent-text underline-offset-2 hover:underline">
          an Anki deck
        </button>{' '}
        or{' '}
        <button type="button" onClick={() => onImport('csv')} className="font-semibold text-accent-text underline-offset-2 hover:underline">
          a spreadsheet (CSV)
        </button>
        .
      </p>
    </Card>
  );
}

interface SearchResultsProps {
  lang: string;
  query: string;
  decks: Deck[];
  order: (a: Deck, b: Deck) => number;
  onOpenStarter: (spec: StarterSpec) => void;
  folders: Folder[];
  children: (found: Deck[]) => ReactNode;
}

/** Decks whose name matches, and ready-made themes that match by name or description. */
function SearchResults({ lang, query, decks, folders, order, onOpenStarter, children }: SearchResultsProps) {
  const list = useStarterList(lang);
  const q = searchKey(query.trim());
  // A deck matches by its own name or the name of any folder it sits in.
  const folderNames = (id: string | null): string => {
    const f = id ? folders.find((x) => x.id === id) : undefined;
    return f ? `${f.name} ${folderNames(f.parentId)}` : '';
  };
  const found = decks.filter((d) => searchKey(`${d.name} ${folderNames(d.folderId)}`).includes(q)).sort(order);
  const themes = STARTER_THEMES.filter((t) => list?.themes[t.id]?.length && searchKey(`${t.name} ${t.blurb}`).includes(q));

  if (!found.length && !themes.length) {
    return (
      <div className="flex flex-col items-center py-14 text-center text-ink-soft">
        <SearchX size={28} className="mb-3 text-ink-faint" aria-hidden />
        <p className="font-semibold text-ink">No decks or themes match “{query.trim()}”</p>
        <p className="mt-1 text-sm">Try a shorter word, or browse Discover.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {found.length > 0 && (
        <div>
          <p className="mb-2.5 text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">Your decks · {found.length}</p>
          {children(found)}
        </div>
      )}
      {themes.length > 0 && (
        <div>
          <p className="mb-2.5 text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">Ready-made themes</p>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => {
              const Icon = THEME_ICONS[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpenStarter({ kind: 'theme', id: t.id })}
                  className="no-callout flex items-center gap-2 rounded-2xl border border-line bg-raised py-2 pr-3.5 pl-2 text-sm font-semibold transition-[border-color,transform] hover:border-line-strong active:scale-[0.97]"
                >
                  <span className="grid size-8 place-items-center rounded-xl bg-sage-soft text-sage-text">
                    <Icon size={16} aria-hidden />
                  </span>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
