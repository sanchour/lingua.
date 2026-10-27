// Sandesigning's own look, inside its shadow root so no app's styles reach it (and it reaches none).
export const CSS = `
:host { all: initial; }
.sd {
  --bg: #f4f4f5; --panel: #ffffff; --raised: #ffffff; --line: #e4e4e7; --line-strong: #d4d4d8;
  --ink: #18181b; --soft: #52525b; --faint: #a1a1aa; --hover: #f4f4f5; --press: #e4e4e7;
  --accent: #4f46e5; --accent-soft: #eef2ff; --accent-ink: #ffffff; --danger: #e11d48;
  --grid: rgba(24, 24, 27, .07); --shadow: 0 10px 30px rgba(24, 24, 27, .14), 0 2px 6px rgba(24, 24, 27, .08);
  position: fixed; inset: 0; display: grid; grid-template: 48px 1fr / 252px 1fr 280px;
  font: 12.5px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--ink); background: var(--bg);
  -webkit-font-smoothing: antialiased; color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  .sd:not([data-theme='light']) {
    --bg: #111113; --panel: #1b1b1e; --raised: #232327; --line: #2c2c31; --line-strong: #3a3a40;
    --ink: #f4f4f5; --soft: #a1a1aa; --faint: #71717a; --hover: #26262b; --press: #303036;
    --accent: #818cf8; --accent-soft: #272a4a; --accent-ink: #0b0b0e; --grid: rgba(255, 255, 255, .06);
    --shadow: 0 10px 30px rgba(0, 0, 0, .5), 0 2px 6px rgba(0, 0, 0, .4); color-scheme: dark;
  }
}
.sd[data-theme='dark'] {
  --bg: #111113; --panel: #1b1b1e; --raised: #232327; --line: #2c2c31; --line-strong: #3a3a40;
  --ink: #f4f4f5; --soft: #a1a1aa; --faint: #71717a; --hover: #26262b; --press: #303036;
  --accent: #818cf8; --accent-soft: #272a4a; --accent-ink: #0b0b0e; --grid: rgba(255, 255, 255, .06);
  --shadow: 0 10px 30px rgba(0, 0, 0, .5), 0 2px 6px rgba(0, 0, 0, .4); color-scheme: dark;
}
.sd.bare { grid-template-columns: 0 1fr 0; }
.sd.bare .left, .sd.bare .right { display: none; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
input, select, textarea { font: inherit; color: inherit; }
svg.i { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; flex: none; }
kbd { font: 600 10.5px/1 ui-monospace, 'SF Mono', Consolas, monospace; padding: 3px 5px; border-radius: 5px; background: var(--hover); border: 1px solid var(--line); color: var(--soft); white-space: nowrap; }

/* The top bar */
.top { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; padding: 0 10px; background: var(--panel); border-bottom: 1px solid var(--line); min-width: 0; }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 700; letter-spacing: -.01em; padding-right: 6px; white-space: nowrap; }
.brand b { width: 22px; height: 22px; border-radius: 7px; background: linear-gradient(135deg, #6366f1, #ec4899 60%, #f59e0b); display: grid; place-items: center; color: #fff; font-size: 12px; }
.title { border: 1px solid transparent; background: none; padding: 5px 8px; border-radius: 7px; width: 220px; font-weight: 600; min-width: 80px; }
.title:hover { border-color: var(--line); }
.title:focus { outline: none; border-color: var(--accent); background: var(--raised); }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border-radius: 8px; white-space: nowrap; }
.btn:hover { background: var(--hover); }
.btn.primary { background: var(--accent); color: var(--accent-ink); font-weight: 600; }
.btn.primary:hover { filter: brightness(1.08); }
.btn.icon { width: 30px; padding: 0; justify-content: center; }
.btn[aria-pressed='true'] { background: var(--accent-soft); color: var(--accent); }
.spacer { flex: 1; }
.status { color: var(--faint); font-size: 11.5px; padding: 0 6px; white-space: nowrap; }

/* Side panels */
.left, .right { background: var(--panel); overflow: auto; min-height: 0; }
.left { border-right: 1px solid var(--line); display: flex; flex-direction: column; }
.right { border-left: 1px solid var(--line); }
.tabs { display: flex; gap: 2px; padding: 8px 8px 0; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: var(--panel); z-index: 1; }
.tabs button { padding: 7px 10px; border-radius: 7px 7px 0 0; color: var(--soft); font-weight: 600; border-bottom: 2px solid transparent; }
.tabs button[aria-selected='true'] { color: var(--ink); border-bottom-color: var(--accent); }
.sec { padding: 12px 12px 14px; border-bottom: 1px solid var(--line); }
.sec h3 { margin: 0 0 9px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--faint); display: flex; align-items: center; justify-content: space-between; }
.empty { color: var(--faint); padding: 18px 14px; line-height: 1.55; }

.layer { display: flex; align-items: center; gap: 6px; height: 28px; padding: 0 6px 0 8px; border-radius: 7px; margin: 1px 6px; cursor: default; user-select: none; }
.layer:hover { background: var(--hover); }
.layer.on { background: var(--accent-soft); color: var(--accent); }
.layer .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layer .nm input { width: 100%; border: 1px solid var(--accent); border-radius: 5px; padding: 1px 4px; background: var(--raised); }
.layer .t { color: var(--faint); }
.layer.on .t { color: inherit; }
.layer .act { opacity: 0; color: var(--faint); display: grid; place-items: center; width: 22px; height: 22px; border-radius: 5px; }
.layer:hover .act, .layer .act.keep { opacity: 1; }
.layer .act:hover { background: var(--press); color: var(--ink); }
.layer.dim .nm { opacity: .45; }
.layer.drop-before { box-shadow: inset 0 2px 0 var(--accent); }
.layer.drop-after { box-shadow: inset 0 -2px 0 var(--accent); }
.layer.drop-in { outline: 2px solid var(--accent); outline-offset: -2px; }

.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.card { border: 1px solid var(--line); border-radius: 10px; padding: 9px; text-align: left; background: var(--raised); display: flex; flex-direction: column; gap: 4px; min-height: 64px; }
.card:hover { border-color: var(--accent); }
.card b { font-weight: 600; }
.card span { color: var(--faint); font-size: 11.5px; }
.card .x { align-self: flex-end; margin-top: auto; color: var(--faint); }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip { padding: 4px 9px; border-radius: 99px; border: 1px solid var(--line); background: var(--raised); white-space: nowrap; }
.chip:hover { border-color: var(--line-strong); }
.chip[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.icons { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.icons button { aspect-ratio: 1; display: grid; place-items: center; border-radius: 7px; color: var(--soft); }
.icons button:hover { background: var(--hover); color: var(--ink); }
.icons button[aria-pressed='true'] { background: var(--accent-soft); color: var(--accent); }
.search { width: 100%; height: 30px; padding: 0 9px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); margin-bottom: 8px; }
.search:focus, .f input:focus, .f select:focus, textarea.note:focus { outline: none; border-color: var(--accent); }
.thumbs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.thumbs .card img { width: 100%; height: 64px; object-fit: cover; border-radius: 6px; background: var(--bg); }

/* Properties */
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.f { display: flex; align-items: center; gap: 6px; height: 30px; border-radius: 7px; border: 1px solid var(--line); background: var(--bg); padding: 0 7px; min-width: 0; }
.f:hover { border-color: var(--line-strong); }
.f > span { color: var(--faint); font-size: 11px; min-width: 12px; }
.f input, .f select { border: 0; background: none; width: 100%; min-width: 0; height: 28px; padding: 0; outline: none; }
.f input[type='color'] { width: 18px; height: 18px; border-radius: 4px; padding: 0; flex: none; cursor: pointer; }
.f input[type='color']::-webkit-color-swatch-wrapper { padding: 0; }
.f input[type='color']::-webkit-color-swatch { border: 1px solid var(--line-strong); border-radius: 4px; }
.row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.row > * { flex: 1; }
.check { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: var(--soft); cursor: pointer; }
.check input { accent-color: var(--accent); }
.swatches { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 8px; }
.swatches button { width: 20px; height: 20px; border-radius: 6px; border: 1px solid var(--line-strong); }
.swatches button:hover { transform: scale(1.12); }
.seg { display: flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--bg); }
.seg button { flex: 1; height: 28px; display: grid; place-items: center; color: var(--soft); }
.seg button:hover { background: var(--hover); color: var(--ink); }
.seg button[aria-pressed='true'] { background: var(--accent-soft); color: var(--accent); }
textarea.note { width: 100%; min-height: 96px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; padding: 8px; background: var(--bg); line-height: 1.5; }
.target { margin-top: 8px; padding: 8px; border-radius: 8px; background: var(--bg); color: var(--soft); font-size: 11.5px; word-break: break-word; }
.target code { font: 11px ui-monospace, Consolas, monospace; color: var(--ink); }
.list-notes .ln { display: flex; gap: 8px; padding: 7px 4px; border-radius: 7px; cursor: pointer; align-items: flex-start; }
.list-notes .ln:hover { background: var(--hover); }
.dot { width: 20px; height: 20px; border-radius: 99px; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 11px; flex: none; }

/* The stage */
.stage { position: relative; overflow: hidden; min-width: 0; min-height: 0; touch-action: none; cursor: default; outline: none; }
.stage[data-tool='hand'], .stage.space { cursor: grab; }
.stage.panning { cursor: grabbing; }
.stage[data-tool='frame'], .stage[data-tool='rect'], .stage[data-tool='ellipse'], .stage[data-tool='line'], .stage[data-tool='arrow'], .stage[data-tool='widget'], .stage[data-tool='icon'], .stage[data-tool='cut'], .stage[data-tool='pin'], .stage[data-tool='sticky'] { cursor: crosshair; }
.stage[data-tool='text'] { cursor: text; }
.stage[data-tool='pen'], .stage[data-tool='highlighter'] { cursor: crosshair; }
.stage[data-tool='eraser'] { cursor: cell; }
svg.world, svg.over { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
svg.over { pointer-events: none; overflow: visible; }
svg.over .handle, svg.over .frame-name { pointer-events: all; }
.grid-line { stroke: var(--grid); stroke-width: 1; }
.over .sel { fill: none; stroke: var(--accent); stroke-width: 1.5; }
.over .sel-area { fill: none; stroke: var(--accent); stroke-width: 1; stroke-dasharray: 4 3; }
.over .sel-line { stroke: var(--accent); stroke-width: 1; }
.over .hover { fill: none; stroke: var(--accent); stroke-width: 1.5; opacity: .5; }
.over .dom-hover { fill: rgba(79, 70, 229, .08); stroke: #ec4899; stroke-width: 1.5; stroke-dasharray: 5 3; }
.over .handle { fill: #fff; stroke: var(--accent); stroke-width: 1.5; }
.over rect.handle[data-handle='nw'], .over rect.handle[data-handle='se'] { cursor: nwse-resize; }
.over rect.handle[data-handle='ne'], .over rect.handle[data-handle='sw'] { cursor: nesw-resize; }
.over rect.handle[data-handle='n'], .over rect.handle[data-handle='s'] { cursor: ns-resize; }
.over rect.handle[data-handle='e'], .over rect.handle[data-handle='w'] { cursor: ew-resize; }
.over circle.handle { cursor: move; }
.over .marquee { fill: rgba(79, 70, 229, .07); stroke: var(--accent); stroke-width: 1; }
.over .cut-box { fill: rgba(236, 72, 153, .08); stroke: #ec4899; stroke-width: 1.5; stroke-dasharray: 6 4; }
.over .guide { stroke: #ec4899; stroke-width: 1; }
.over .frame-name { font: 500 11.5px system-ui, sans-serif; fill: var(--soft); cursor: default; user-select: none; }
.over .frame-name.on { fill: var(--accent); }
.over .size-tag { font: 600 10.5px system-ui, sans-serif; fill: var(--accent); text-anchor: middle; }
.edit-layer { position: absolute; inset: 0; pointer-events: none; }
.editing { position: absolute; transform-origin: 0 0; outline: 2px solid var(--accent); outline-offset: 2px; pointer-events: all; min-height: 1em; cursor: text; }
.measure { position: absolute; left: -99999px; top: 0; visibility: hidden; }

/* The tool bar */
.toolbar { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); display: flex; gap: 2px; padding: 5px; border-radius: 14px; background: var(--raised); border: 1px solid var(--line); box-shadow: var(--shadow); z-index: 2; }
.toolbar .sepv { width: 1px; background: var(--line); margin: 4px 3px; }
.tool { position: relative; width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; color: var(--soft); }
.tool:hover { background: var(--hover); color: var(--ink); }
.tool[aria-pressed='true'] { background: var(--accent); color: var(--accent-ink); }
.tool .more { position: absolute; right: 2px; bottom: 2px; width: 0; height: 0; border-left: 4px solid transparent; border-bottom: 4px solid currentColor; opacity: .6; }
.tip { position: absolute; pointer-events: none; padding: 5px 8px; border-radius: 7px; background: #18181b; color: #fafafa; font-size: 11.5px; white-space: nowrap; z-index: 50; display: flex; gap: 7px; align-items: center; box-shadow: var(--shadow); }
.tip[hidden], .menu[hidden] { display: none; }
.tip kbd { background: #3f3f46; border-color: #52525b; color: #e4e4e7; }
.hint { position: absolute; left: 50%; bottom: 74px; transform: translateX(-50%); padding: 6px 12px; border-radius: 99px; background: var(--raised); border: 1px solid var(--line); color: var(--soft); box-shadow: var(--shadow); white-space: nowrap; pointer-events: none; z-index: 2; }
.hint:empty { display: none; }
.zoomer { position: absolute; right: 12px; top: 12px; display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 10px; background: var(--raised); border: 1px solid var(--line); box-shadow: var(--shadow); z-index: 2; }
.zoomer .btn { height: 28px; }

/* Menus, dialogs and toasts */
.menu { position: fixed; min-width: 240px; padding: 5px; border-radius: 11px; background: var(--raised); border: 1px solid var(--line); box-shadow: var(--shadow); z-index: 40; max-height: 80vh; overflow: auto; }
.menu button { display: flex; align-items: center; gap: 9px; width: 100%; padding: 7px 9px; border-radius: 7px; text-align: left; }
.menu button:hover, .menu button.on { background: var(--hover); }
.menu button:disabled { opacity: .4; cursor: default; }
.menu button .k { margin-left: auto; color: var(--faint); font-size: 11px; }
.menu hr { border: 0; border-top: 1px solid var(--line); margin: 5px 4px; }
.menu .lbl { padding: 6px 9px 3px; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--faint); }
.veil { position: fixed; inset: 0; background: rgba(9, 9, 11, .35); display: grid; place-items: start center; padding-top: 12vh; z-index: 60; }
.dialog { width: min(640px, calc(100vw - 32px)); max-height: 72vh; display: flex; flex-direction: column; border-radius: 16px; background: var(--raised); border: 1px solid var(--line); box-shadow: var(--shadow); overflow: hidden; }
.dialog header { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.dialog header h2 { margin: 0; font-size: 15px; flex: 1; }
.dialog .body { overflow: auto; padding: 8px 16px 16px; }
.palette input { width: 100%; border: 0; outline: none; background: none; font-size: 15px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.palette .items { overflow: auto; padding: 6px; }
.palette .it { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; width: 100%; text-align: left; }
.palette .it.on { background: var(--accent-soft); }
.palette .it .g { color: var(--faint); font-size: 11px; margin-left: auto; padding-right: 8px; }
.keys { columns: 2; column-gap: 28px; }
.keys section { break-inside: avoid; margin: 10px 0 14px; }
.keys h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--faint); }
.keys .kr { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; border-bottom: 1px dashed var(--line); }
.keys .kr span:last-child { display: flex; gap: 3px; }
.docs .dr { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 9px; }
.docs .dr:hover { background: var(--hover); }
.docs .dr b { flex: 1; font-weight: 600; cursor: pointer; }
.docs .dr span { color: var(--faint); }
.toasts { position: fixed; left: 50%; top: 60px; transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; z-index: 70; pointer-events: none; }
.toast { padding: 9px 14px; border-radius: 10px; background: #18181b; color: #fafafa; box-shadow: var(--shadow); animation: sd-in .18s ease-out; }
@keyframes sd-in { from { opacity: 0; transform: translateY(-6px); } }
.drop { position: absolute; inset: 10px; border: 2px dashed var(--accent); border-radius: 16px; background: rgba(79, 70, 229, .06); display: none; place-items: center; font-size: 15px; font-weight: 600; color: var(--accent); z-index: 3; pointer-events: none; }
.stage.dropping .drop { display: grid; }
@media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
`;
