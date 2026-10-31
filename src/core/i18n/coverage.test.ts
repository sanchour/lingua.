import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import type { Node } from '@babel/types';
import { expect, it } from 'vitest';
import sources from './sources.json';
import { GAMES, GAME_GROUPS } from '@/core/games/defs';
import { PHRASE_KINDS, NOTE_KINDS } from '@/core/notebook/library';
import { MARK_LABEL } from '@/core/script/marks';
import { QUIZ_LABEL } from '@/core/script/hanzi';
import { CONVERSIONS } from '@/core/script/convert';

const registered = new Set(Object.keys(sources));
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : /\.tsx$/.test(e.name) && !e.name.includes('.test.') ? [join(dir, e.name)] : []);
const children = (node: Node, visit: (child: Node) => void) => {
  for (const [key, value] of Object.entries(node)) if (!['loc', 'extra', 'comments', 'tokens'].includes(key)) for (const item of Array.isArray(value) ? value : [value]) if (item && typeof item === 'object' && 'type' in item) visit(item as Node);
};
const astOf = (file: string) => parse(readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'] });
it('registers literal interface messages actually used by screens and useUi callers', () => {
  const missing: string[] = [];
  for (const file of files('src')) {
    const ast = astOf(file); const translators = new Set<string>();
    const bindings = (n: Node) => { if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init?.type === 'CallExpression' && n.init.callee.type === 'Identifier' && n.init.callee.name === 'useUi') translators.add(n.id.name); children(n, bindings); }; bindings(ast);
    const check = (n: Node) => {
      if (n.type === 'JSXExpressionContainer') check(n.expression);
      else if (n.type === 'StringLiteral' && /[A-Za-z]{2}/.test(n.value) && !registered.has(n.value)) missing.push(`${file}: ${n.value}`);
      else if (n.type === 'ConditionalExpression') { check(n.consequent); check(n.alternate); }
      else if (n.type === 'LogicalExpression') check(n.right);
    };
    const visit = (n: Node) => {
      if (n.type === 'JSXElement' && n.openingElement.name.type === 'JSXIdentifier' && n.openingElement.name.name === 'UiText') for (const a of n.openingElement.attributes) if (a.type === 'JSXAttribute' && a.name.name === 'source' && a.value) check(a.value);
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && translators.has(n.callee.name) && n.arguments[0]) check(n.arguments[0]);
      children(n, visit);
    }; visit(ast);
  }
  expect(missing).toEqual([]);
});
it('registers app-owned labels passed dynamically without treating learner data as messages', () => {
  const labels = [...PHRASE_KINDS, ...NOTE_KINDS, ...Object.values(MARK_LABEL), ...Object.values(QUIZ_LABEL), ...CONVERSIONS.map((c) => c.label), ...GAMES.flatMap((g) => [g.title, g.detail]), ...Object.values(GAME_GROUPS).flatMap((g) => [g.title, g.detail])];
  expect(labels.filter((label) => !registered.has(label))).toEqual([]);
});
it('keeps new literal screen copy behind an explicit interface message site', () => {
  const raw: string[] = [];
  // Flags contain country codes; these two views contain pronunciation notation and developer-only measurements.
  const notation = new Set(['src/design/flags.tsx', 'src/features/cursus/sounds/MouthDiagram.tsx', 'src/features/lab/SmoothnessTest.tsx']);
  for (const file of files('src')) {
    if (notation.has(file)) continue;
    const visit = (n: Node, literal = false) => {
      if (n.type === 'JSXElement') literal ||= n.openingElement.attributes.some((a) => a.type === 'JSXAttribute' && ['lang', 'contentEditable'].includes(String(a.name.name)));
      if (!literal && n.type === 'JSXText' && /[A-Za-z]{2}/.test(n.value)) raw.push(`${file}: ${n.value.trim()}`);
      children(n, (c) => visit(c, literal));
    }; visit(astOf(file));
  }
  expect(raw).toEqual([]);
});
