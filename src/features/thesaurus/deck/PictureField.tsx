// A card's picture (6-3b): from a file, pasted from the clipboard, or found on Wikimedia Commons with its licence kept. Always
// the learner's choice. A picture found is kept with where it came from.
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Search, X } from 'lucide-react';
import type { CommonsPicture } from '@/services/images/commons';
import { fetchPicture, searchCommons, shrinkPicture } from '@/services/images/commons';
import { Button } from '@/design/primitives';
import { toast } from '@/state/ui';
import type { Note } from '@/data/types';
import { useBlobUrl } from '../study/FlipCard';

export interface PickedPicture {
  blob: Blob;
  credit?: Note['imageCredit'];
}

interface Props {
  /** The picture the card has now. */
  blobId?: string;
  credit?: Note['imageCredit'];
  picked: PickedPicture | null;
  removed: boolean;
  /** A word to start the search with. */
  term: string;
  onPick: (p: PickedPicture) => void;
  onRemove: () => void;
}

export function PictureField({ blobId, credit, picked, removed, term, onPick, onRemove }: Props) {
  const stored = useBlobUrl(removed || picked ? undefined : blobId);
  const [made, setMade] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommonsPicture[] | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!picked) return setMade(null);
    const url = URL.createObjectURL(picked.blob);
    setMade(url);
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  const shown = made ?? stored;
  const take = async (blob: Blob, credit?: Note['imageCredit']) => onPick({ blob: await shrinkPicture(blob), credit });

  const search = async () => {
    setBusy(true);
    try {
      setResults(await searchCommons(query || term));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The search did not work.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const choose = async (p: CommonsPicture) => {
    setBusy(true);
    try {
      await take(await fetchPicture(p.thumb), { source: 'Wikimedia Commons', licence: `${p.licence}, ${p.author}`, url: p.page });
      setSearching(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The picture could not be downloaded.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const shownCredit = picked ? picked.credit : removed ? undefined : credit;

  return (
    <div
      onPaste={(e) => {
        const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'));
        const blob = item?.getAsFile();
        if (blob) {
          e.preventDefault();
          void take(blob);
        }
      }}
      className="rounded-xl border border-line bg-bg p-3"
    >
      {shown ? (
        <div className="flex items-start gap-3">
          <img src={shown} alt="" className="max-h-32 max-w-[60%] rounded-lg object-contain" />
          <div className="min-w-0 flex-1 text-[12.5px] text-ink-soft">
            {shownCredit ? (
              <p>
                {shownCredit.source}: {shownCredit.licence}
                {shownCredit.url && (
                  <>
                    {' · '}
                    <a href={shownCredit.url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2">
                      source
                    </a>
                  </>
                )}
              </p>
            ) : (
              <p>Your own picture.</p>
            )}
            <button type="button" onClick={onRemove} className="mt-2 inline-flex items-center gap-1 font-semibold text-ink underline decoration-line-strong underline-offset-4">
              <X size={13} aria-hidden /> Remove
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-ink-faint">No picture yet. Choose a file, paste one here (⌘V), or find one.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void take(e.target.files[0])} />
        <Button type="button" variant="secondary" size="sm" icon={ImagePlus} onClick={() => file.current?.click()}>
          Choose a file
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={Search}
          onClick={() => {
            setSearching((v) => !v);
            if (!query) setQuery(term);
          }}
        >
          Find a picture
        </Button>
      </div>
      {searching && (
        <div className="mt-3">
          {/* Not a form: the card editor around it is one, and Enter here must search, not save the card. */}
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void search();
                }
              }}
              placeholder="Search Wikimedia Commons"
              aria-label="Search for a picture"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-raised px-3 text-[14px] outline-none focus:border-ink"
            />
            <Button type="button" size="sm" loading={busy} onClick={() => void search()}>
              Search
            </Button>
          </div>
          {results && !results.length && <p className="mt-2 text-[13px] text-ink-soft">No free pictures found. Try another word.</p>}
          {results && results.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {results.map((p) => (
                <li key={p.page}>
                  <button type="button" disabled={busy} onClick={() => void choose(p)} title={`${p.title} · ${p.licence} · ${p.author}`} className="block w-full overflow-hidden rounded-lg border border-line hover:border-ink">
                    <img src={p.thumb} alt={p.title} loading="lazy" className="aspect-square w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11.5px] text-ink-faint">Free pictures only; the licence and author are kept on the card.</p>
        </div>
      )}
    </div>
  );
}
