// Writes src/iconData.ts: the icons Sandesigning uses (its own buttons and the Icon tool), taken from Lucide (ISC
// licence) in node_modules so the tool itself needs nothing installed. Run: node sandesigning/scripts/icons.ts
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = new URL('../../node_modules/lucide-react/dist/esm/icons/', import.meta.url);

/** The buttons' own icons. */
const UI = 'mouse-pointer-2 hand frame square circle minus move-up-right pen-line highlighter eraser type sticky-note message-square-plus layout-template smile image scissors undo-2 redo-2 zoom-in zoom-out grid-3x3 magnet download upload file-plus folder-open trash-2 copy clipboard-paste layers library search x plus chevron-down chevron-right eye eye-off lock lock-open align-start-vertical align-center-vertical align-end-vertical align-start-horizontal align-center-horizontal align-end-horizontal align-horizontal-distribute-center align-vertical-distribute-center bring-to-front send-to-back keyboard command sun moon camera monitor laptop tablet smartphone app-window file-text save sparkles';

/** What the Icon tool offers, by group. */
const GROUPS: Record<string, string> = {
  Common: 'home settings user users bell heart star bookmark share-2 send mail phone calendar clock search menu more-horizontal more-vertical plus x check',
  Navigation: 'arrow-left arrow-right arrow-up arrow-down chevron-left chevron-right chevron-up chevron-down external-link link log-in log-out map-pin map globe house',
  Actions: 'edit pencil trash-2 copy download upload refresh-cw rotate-ccw filter sliders-horizontal list paperclip save lock-keyhole eye eye-off grip-vertical',
  Status: 'check-circle-2 circle-alert info help-circle loader square-check circle-dot toggle-left toggle-right wifi battery-full cloud',
  Commerce: 'shopping-cart credit-card wallet tag gift',
  Media: 'play pause skip-forward volume-2 mic video music headphones camera image',
  Learning: 'book-open graduation-cap languages message-circle messages-square thumbs-up flame trophy target sparkles',
  Data: 'chart-bar chart-line chart-pie trending-up activity database cpu code terminal file folder inbox archive file-text',
  Devices: 'monitor laptop tablet smartphone app-window keyboard sun moon smile',
};

const markup = (name: string): string => {
  const src = readFileSync(new URL(`${name}.mjs`, DIR), 'utf8');
  // Old names are files that only point at the new one.
  const alias = /from '\.\/(.+)\.mjs'/.exec(src);
  if (!src.includes('__iconData = ') && alias) return markup(alias[1]);
  const body = /__iconData = (\{[\s\S]*?\r?\n\});/.exec(src)![1];
  const { node } = new Function(`return ${body}`)() as { node: [string, Record<string, string>][] };
  return node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
};

const names = [...new Set([...UI.split(' '), ...Object.values(GROUPS).flatMap((g) => g.split(' '))])].sort();
const lines = names.map((n) => `  '${n}': '${markup(n)}',`);
const out = `// Made by scripts/icons.ts from Lucide (https://lucide.dev, ISC licence). Don't edit by hand.
// Each is the inside of a 24 × 24 SVG drawn with a 2 px stroke and round ends.
export const ICONS: Record<string, string> = {
${lines.join('\n')}
};

export const ICON_GROUPS: Record<string, string[]> = ${JSON.stringify(Object.fromEntries(Object.entries(GROUPS).map(([k, v]) => [k, v.split(' ')])), null, 2).replace(/"/g, "'")};
`;
writeFileSync(new URL('../src/iconData.ts', import.meta.url), out);
console.log(`${names.length} icons`);
