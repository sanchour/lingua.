// Reading papers: page colours for Codex, chosen separately for Paper (day) and Nocturne (night).
// The reader puts the chosen ids on <html>; the stylesheet below (generated from this list, so the
// colours live in one place) swaps the surface and ink tokens. The paper flips together with the
// theme, inside the same view transition.
import type { PaperDarkId, PaperLightId } from '@/data/settings';

type PaperVar = 'bg' | 'surface' | 'raised' | 'sunken' | 'ink' | 'ink-soft' | 'ink-faint' | 'line' | 'line-strong';

export interface Paper<Id extends string = string> {
  id: Id;
  label: string;
  vars: Record<PaperVar, string>;
}

export const LIGHT_PAPERS: Array<Paper<PaperLightId>> = [
  {
    id: 'cream',
    label: 'Cream',
    vars: { bg: '#faf6f0', surface: '#efe7d9', raised: '#fffbf4', sunken: '#e8dfcf', ink: '#262220', 'ink-soft': '#5e554e', 'ink-faint': '#776c63', line: '#e1d6c4', 'line-strong': '#cec0a9' },
  },
  {
    id: 'ivory',
    label: 'Ivory',
    vars: { bg: '#fdfbf6', surface: '#f2eee6', raised: '#fffefb', sunken: '#ebe6dc', ink: '#23211f', 'ink-soft': '#5a5550', 'ink-faint': '#736d66', line: '#e6e0d5', 'line-strong': '#d2cabc' },
  },
  {
    id: 'parchment',
    label: 'Parchment',
    vars: { bg: '#f5ecdb', surface: '#eadfca', raised: '#fbf5ea', sunken: '#e2d5bc', ink: '#2d2520', 'ink-soft': '#5f5347', 'ink-faint': '#72655a', line: '#e0d2b9', 'line-strong': '#cbb998' },
  },
  {
    id: 'sepia',
    label: 'Sepia',
    vars: { bg: '#f1e5cc', surface: '#e6d6b6', raised: '#f8eedb', sunken: '#dccaa6', ink: '#3b2d21', 'ink-soft': '#5f4c3a', 'ink-faint': '#6f5c49', line: '#dac8a5', 'line-strong': '#c5ae86' },
  },
  {
    id: 'sage',
    label: 'Sage',
    vars: { bg: '#eff1e7', surface: '#e3e8d9', raised: '#f7f8f1', sunken: '#d9e0cc', ink: '#252a23', 'ink-soft': '#535b4e', 'ink-faint': '#656e60', line: '#d7ddc9', 'line-strong': '#c1c9b0' },
  },
  {
    id: 'blush',
    label: 'Blush',
    vars: { bg: '#faeee8', surface: '#f1e2d9', raised: '#fdf6f2', sunken: '#ead8cd', ink: '#2d2321', 'ink-soft': '#615150', 'ink-faint': '#756361', line: '#ebd8ce', 'line-strong': '#d9c1b4' },
  },
  {
    id: 'stone',
    label: 'Stone',
    vars: { bg: '#f2f0eb', surface: '#e7e4dd', raised: '#f9f8f4', sunken: '#dfdbd2', ink: '#242320', 'ink-soft': '#57544d', 'ink-faint': '#6b6860', line: '#dddad0', 'line-strong': '#c8c3b7' },
  },
];

export const DARK_PAPERS: Array<Paper<PaperDarkId>> = [
  {
    id: 'charcoal',
    label: 'Charcoal',
    vars: { bg: '#1f1c1a', surface: '#2b2724', raised: '#35302c', sunken: '#191715', ink: '#ebe0cc', 'ink-soft': '#bdb19f', 'ink-faint': '#918779', line: '#3b3532', 'line-strong': '#514944' },
  },
  {
    id: 'espresso',
    label: 'Espresso',
    vars: { bg: '#241b16', surface: '#30251f', raised: '#3b2e27', sunken: '#1c1511', ink: '#eedcc1', 'ink-soft': '#c4ae92', 'ink-faint': '#9c8770', line: '#403229', 'line-strong': '#5a4738' },
  },
  {
    id: 'dusk',
    label: 'Sepia night',
    vars: { bg: '#2b2219', surface: '#372b20', raised: '#423428', sunken: '#231b14', ink: '#efdcb9', 'ink-soft': '#c8b08a', 'ink-faint': '#a08a6a', line: '#47392b', 'line-strong': '#5f4c39' },
  },
  {
    id: 'ink',
    label: 'Ink',
    vars: { bg: '#1a1c21', surface: '#23262c', raised: '#2d3037', sunken: '#15171b', ink: '#e8e2d6', 'ink-soft': '#b5b0a6', 'ink-faint': '#8e8a82', line: '#30333a', 'line-strong': '#464a53' },
  },
  {
    id: 'forest',
    label: 'Forest',
    vars: { bg: '#1b211d', surface: '#242c26', raised: '#2d3630', sunken: '#161b18', ink: '#e6e4d3', 'ink-soft': '#b3b5a2', 'ink-faint': '#8c907e', line: '#303a33', 'line-strong': '#455148' },
  },
  {
    id: 'plum',
    label: 'Plum',
    vars: { bg: '#221c22', surface: '#2c242c', raised: '#362d36', sunken: '#1b161b', ink: '#eee1dc', 'ink-soft': '#c0b0ad', 'ink-faint': '#988985', line: '#3b313a', 'line-strong': '#534651' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    vars: { bg: '#100f0e', surface: '#1b1917', raised: '#252220', sunken: '#0a0909', ink: '#e4d7c2', 'ink-soft': '#ada08c', 'ink-faint': '#877b6b', line: '#2b2724', 'line-strong': '#3f3934' },
  },
];

export const lightPaper = (id: string): Paper => LIGHT_PAPERS.find((p) => p.id === id) ?? LIGHT_PAPERS[0];
export const darkPaper = (id: string): Paper => DARK_PAPERS.find((p) => p.id === id) ?? DARK_PAPERS[0];

/** The paper's tokens as inline CSS variables (for previews outside the reader). */
export function paperStyle(paper: Paper): Record<string, string> {
  return Object.fromEntries(Object.entries(paper.vars).map(([k, v]) => [`--${k}`, v]));
}

const declarations = (paper: Paper) =>
  Object.entries(paper.vars)
    .map(([k, v]) => `--${k}:${v}`)
    .join(';');

let installed = false;

/** Adds the paper stylesheet once (only the reader needs it). */
export function installPaperStyles(): void {
  if (installed) return;
  installed = true;
  const rules = [
    ...LIGHT_PAPERS.map((p) => `:root[data-theme='paper'][data-paper-light='${p.id}']{${declarations(p)}}`),
    ...DARK_PAPERS.map((p) => `:root[data-theme='nocturne'][data-paper-dark='${p.id}']{${declarations(p)}}`),
  ];
  const style = document.createElement('style');
  style.dataset.lingua = 'papers';
  style.textContent = rules.join('\n');
  document.head.append(style);
}
