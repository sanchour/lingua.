import { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { createDeck, createFolder, useDeckCounts, useDecks, useFolders } from '@/data/decks';
import type { StarterSpec } from '@/data/starter';
import { spring } from '@/design/motion';
import { useNavigate } from 'react-router';
import { CsvImportDrawer } from './library/CsvImportDrawer';
import { DeckTree } from './library/DeckTree';
import type { TreeActions } from './library/DeckTree';
import { ConfirmDialog, MoveDialog, NameDialog } from './library/dialogs';
import type { ConfirmRequest, MoveRequest, NameRequest } from './library/dialogs';
import { NewMenu } from './library/NewMenu';
import type { NewAction } from './library/NewMenu';
import { StarterDrawer } from './library/StarterDrawer';
import { StarterLibrary } from './library/StarterLibrary';
import { TodayCard } from './library/TodayCard';
import { useDeckImport } from './library/useDeckImport';

const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.05 * i } });

export default function ThesaurusPage() {
  const { language } = useApp();
  const lang = language.id;
  const navigate = useNavigate();
  const decks = useDecks(lang);
  const folders = useFolders(lang);
  const counts = useDeckCounts(decks);
  const imports = useDeckImport(lang);

  const [starter, setStarter] = useState<StarterSpec | null>(null);
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

  const hasDecks = Boolean(decks?.length);
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

      <motion.div {...enter(0)}>{decks && <TodayCard lang={lang} hasDecks={hasDecks} />}</motion.div>

      {hasDecks && folders && (
        <motion.section {...enter(1)} className="mt-10" aria-labelledby="decks-title">
          <h2 id="decks-title" className="mb-3 font-serif text-2xl font-semibold">
            Your decks
          </h2>
          <DeckTree decks={decks!} folders={folders} counts={counts} actions={actions} />
        </motion.section>
      )}

      <motion.section {...enter(2)} className="mt-12" aria-labelledby="starter-title">
        <h2 id="starter-title" className="mb-4 font-serif text-2xl font-semibold">
          Ready-made decks
        </h2>
        <StarterLibrary lang={lang} onOpen={setStarter} />
      </motion.section>

      <StarterDrawer lang={lang} spec={starter} onClose={() => setStarter(null)} />
      <CsvImportDrawer lang={lang} source={imports.csv} folders={folders ?? []} onClose={imports.closeCsv} />
      <NameDialog request={naming} onClose={() => setNaming(null)} />
      <ConfirmDialog request={confirming} onClose={() => setConfirming(null)} />
      <MoveDialog request={moving} onClose={() => setMoving(null)} />
    </>
  );
}
