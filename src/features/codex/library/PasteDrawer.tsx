import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer } from '@/design/primitives';
import { importPasted } from '@/services/import/importers';
import { toast } from '@/state/ui';

export function PasteDrawer({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const id = await importPasted(lang, title.trim(), body);
      setTitle('');
      setBody('');
      onClose();
      navigate(`/codex/read/${id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The text couldn’t be added.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Paste a text"
      description="An article, a chapter, song lyrics: anything you want to read."
      footer={
        <Button block size="lg" onClick={() => void save()} loading={busy} disabled={!body.trim()}>
          Add and read
        </Button>
      }
    >
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional"
          lang={lang}
          className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 font-serif text-[16px]"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">Text</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          lang={lang}
          rows={12}
          data-autofocus
          className="w-full resize-y rounded-xl border border-line bg-bg px-3.5 py-3 font-serif text-[16px] leading-relaxed"
        />
      </label>
    </Drawer>
  );
}
