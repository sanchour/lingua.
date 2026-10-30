import { UiText } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Library } from 'lucide-react';
import { Button, Card } from '@/design/primitives';
import { pickFile } from '@/services/files/files';
import { importGoodreads } from '@/services/import/importers';
import { toast } from '@/state/ui';

/** Choosing a Goodreads export: new books are added, books already here take its shelves, ratings and dates. */
export function useGoodreadsImport(lang: string, onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    const file = await pickFile('.csv,text/csv');
    if (!file) return;
    setBusy(true);
    try {
      const added = await importGoodreads(lang, file);
      toast(added ? { source: 'Added {0} {1} to your Goodreads shelves.', values: [String(added), added === 1 ? { source: 'book' } : { source: 'books' }] } : 'Your Goodreads shelves are up to date.', { tone: 'success' });
      onDone?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That file couldn’t be read.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return { busy, choose };
}

export function GoodreadsImport({ lang, onDone }: { lang: string; onDone?: () => void }) {
  const { busy, choose } = useGoodreadsImport(lang, onDone);
  return (
    <Card className="max-w-2xl p-6">
      <p className="font-serif text-xl font-semibold"><UiText source={'Bring your Goodreads shelves'} /></p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink-soft">
        <li><UiText source={'On goodreads.com, open My Books → Import and export.'} /></li>
        <li><UiText source={'Choose “Export Library” and download the CSV file.'} /></li>
        <li><UiText source={'Choose it below. Your shelves, ratings and dates come along; add an EPUB to any book to read it here.'} /></li>
      </ol>
      <Button className="mt-5" icon={Library} loading={busy} onClick={() => void choose()}><UiText source={'Choose the Goodreads CSV'} /></Button>
    </Card>
  );
}
