import { useUi } from '@/design/i18n/UiText';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref, RefObject } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, TextQuote, Underline } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fromDoc, toDoc } from '@/core/journal/markdown';
import type { BlockNode } from '@/core/journal/markdown';
import { cx } from '@/lib/cx';
import { tokenAt } from '@/core/journal/wordHelp';

export interface DiaryEditorHandle {
  /** Replaces the text (dictation, the corrected text) and leaves the caret at the end. */
  setText: (md: string) => void;
  focus: () => void;
}

/**
 * Diarium's editor (5.2-5): Tiptap with the keys a writer expects (Ctrl B/I/U, Ctrl Alt 1–3 and 0, Ctrl Shift 7/8,
 * `# ` `- ` `1. ` `> ` at the start of a line) and a small toolbar over a selection. The entry stays Markdown.
 */
export function DiaryEditor({ value, lang, rtl, placeholder, onChange, onBlur, onWord, ref }: { value: string; lang: string; rtl?: boolean; placeholder: string; onChange: (md: string) => void; onBlur?: () => void; onWord?: (word: string) => void; ref?: Ref<DiaryEditorHandle> }) {
  const wrap = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, code: false, codeBlock: false, strike: false, horizontalRule: false, link: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: toDoc(value) as JSONContent,
    editorProps: {
      attributes: {
        lang,
        dir: rtl ? 'rtl' : 'ltr',
        spellcheck: 'false',
        'aria-label': 'Your entry',
        'aria-multiline': 'true',
        role: 'textbox',
        class: 'diary-prose min-h-[360px] outline-none text-[19px] leading-[1.85] [font-family:var(--entry-font)]',
      },
    },
    onUpdate: ({ editor: e }) => onChange(fromDoc(e.getJSON() as BlockNode)),
    onBlur: () => onBlur?.(),
    onSelectionUpdate: ({ editor: e }) => {
      const { from, to } = e.state.selection;
      if (to > from && to - from < 80) onWord?.(e.state.doc.textBetween(from, to, ' ').trim());
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      setText: (md) => {
        editor.commands.setContent(toDoc(md) as JSONContent, { emitUpdate: false });
        editor.commands.focus('end');
      },
      focus: () => editor.commands.focus('end'),
    }),
    [editor],
  );

  return (
    <div ref={wrap} className="relative" onMouseMove={(event) => {
      if (!onWord) return;
      const hit = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (!hit) return;
      const pos = editor.state.doc.resolve(hit.pos);
      const word = tokenAt(pos.parent.textContent, pos.parentOffset, lang);
      if (word) onWord(word);
    }}>
      <EditorContent editor={editor} />
      <SelectionBar editor={editor} wrap={wrap} />
    </div>
  );
}

type Tool = { label: string; keys: string; icon: LucideIcon; active: (e: Editor) => boolean; run: (e: Editor) => void };
const TOOLS: Tool[] = [
  { label: 'Bold', keys: 'Ctrl B', icon: Bold, active: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  { label: 'Italic', keys: 'Ctrl I', icon: Italic, active: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: 'Underline', keys: 'Ctrl U', icon: Underline, active: (e) => e.isActive('underline'), run: (e) => e.chain().focus().toggleUnderline().run() },
  { label: 'Heading', keys: 'Ctrl Alt 1', icon: Heading1, active: (e) => e.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Subheading', keys: 'Ctrl Alt 2', icon: Heading2, active: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Bullet list', keys: 'Ctrl Shift 8', icon: List, active: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered list', keys: 'Ctrl Shift 7', icon: ListOrdered, active: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Quote', keys: 'Ctrl Shift B', icon: TextQuote, active: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
];

/** The toolbar over a selection, placed above its middle. */
function SelectionBar({ editor, wrap }: { editor: Editor; wrap: RefObject<HTMLDivElement | null> }) {
  const translateUi = useUi();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { from, to, empty } = e.state.selection;
      return { from, to, empty, focused: e.isFocused, active: TOOLS.map((t) => t.active(e)) };
    },
  });
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  const place = useCallback(() => {
    if (!state || state.empty || !state.focused) return setBox(null);
    const root = wrap.current;
    if (!root) return;
    const a = editor.view.coordsAtPos(state.from);
    const b = editor.view.coordsAtPos(state.to);
    const r = root.getBoundingClientRect();
    setBox({ left: (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2 - r.left, top: Math.min(a.top, b.top) - r.top });
  }, [editor, state, wrap]);
  useEffect(place, [place]);
  useEffect(() => {
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [place]);
  if (!box || !state) return null;
  return (
    <div
      role="toolbar"
      aria-label={translateUi('Format')}
      className="absolute z-30 flex -translate-x-1/2 -translate-y-[calc(100%+8px)] items-center gap-0.5 rounded-xl border border-line bg-raised p-1 shadow-elev-3"
      style={{ left: box.left, top: box.top }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {TOOLS.map((t, i) => (
        <button
          key={t.label}
          type="button"
          title={`${t.label} · ${t.keys}`}
          aria-label={t.label}
          aria-pressed={state.active[i]}
          onClick={() => t.run(editor)}
          className={cx('grid size-8 place-items-center rounded-lg transition-colors', state.active[i] ? 'bg-inverse text-on-inverse' : 'text-ink-soft hover:bg-surface hover:text-ink', i === 3 || i === 5 ? 'ml-1.5' : '')}
        >
          <t.icon size={16} aria-hidden />
        </button>
      ))}
    </div>
  );
}
