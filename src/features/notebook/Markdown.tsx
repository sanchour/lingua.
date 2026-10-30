import { createElement } from 'react';
import type { ReactNode } from 'react';
import { toDoc } from '@/core/journal/markdown';
import type { BlockNode, InlineNode } from '@/core/journal/markdown';
export function Markdown({ text }: { text: string }) {
  const render = (node: BlockNode | InlineNode, key: number): ReactNode => {
    if (node.type === 'hardBreak') return <br key={key} />;
    if (node.type === 'text') return <span key={key}>{(node.marks ?? []).reduce<ReactNode>((value, m) => createElement(m.type === 'bold' ? 'strong' : m.type === 'italic' ? 'em' : 'u', {}, value), node.text)}</span>;
    const block = node as BlockNode;
    const tags = { doc: 'div', paragraph: 'p', heading: `h${Math.min(3, Math.max(1, block.attrs?.level ?? 2))}`, bulletList: 'ul', orderedList: 'ol', listItem: 'li', blockquote: 'blockquote' };
    return createElement(tags[block.type], { key, className: node.type === 'heading' ? 'mt-4 font-serif text-xl font-semibold' : node.type === 'bulletList' ? 'list-disc pl-6' : node.type === 'orderedList' ? 'list-decimal pl-6' : node.type === 'blockquote' ? 'border-l-2 border-line pl-4 text-ink-soft' : 'space-y-2' }, ...(block.content ?? []).map(render));
  };
  return <div className="space-y-3 break-words leading-relaxed">{render(toDoc(text), 0)}</div>;
}
