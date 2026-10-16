// Draws the languages table as a shareable card (PNG), in the current theme's colours.
import type { Capability } from '@/data/types';
import { LEVEL_TINT, STATUS_LABEL } from './levels';

/** Resolves a CSS colour expression (tokens, color-mix) to something canvas understands. */
function resolve(color: string): string {
  const probe = document.createElement('span');
  probe.style.color = color;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

export async function renderTableImage(rows: Capability[], live: (c: Capability) => string | null): Promise<Blob> {
  const scale = 2;
  const width = 720;
  const rowH = 64;
  const height = 150 + rows.length * rowH + 50;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  const css = getComputedStyle(document.documentElement);
  const serif = css.getPropertyValue('--font-serif').trim() || 'Georgia, serif';
  const sans = css.getPropertyValue('--font-sans').trim() || 'system-ui, sans-serif';
  await document.fonts?.ready;

  ctx.fillStyle = resolve('var(--bg)');
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = resolve('var(--sage-text)');
  ctx.font = `700 12px ${sans}`;
  ctx.fillText('MY LANGUAGES', 48, 62);
  ctx.fillStyle = resolve('var(--ink)');
  ctx.font = `600 34px ${serif}`;
  ctx.fillText(`${rows.length} ${rows.length === 1 ? 'language' : 'languages'}`, 48, 102);

  rows.forEach((c, i) => {
    const y = 140 + i * rowH;
    ctx.strokeStyle = resolve('var(--line)');
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(width - 48, y);
    ctx.stroke();
    ctx.fillStyle = resolve('var(--ink)');
    ctx.font = `600 21px ${serif}`;
    ctx.fillText(c.name, 48, y + 30);
    ctx.fillStyle = resolve('var(--ink-soft)');
    ctx.font = `500 13px ${sans}`;
    const sub = [STATUS_LABEL[c.status], c.methods.join(', '), live(c)].filter(Boolean).join(' · ');
    ctx.fillText(sub.length > 70 ? `${sub.slice(0, 69)}…` : sub, 48, y + 50);
    // Level pill
    const tint = LEVEL_TINT[c.level];
    ctx.fillStyle = resolve(tint.bg);
    ctx.beginPath();
    ctx.roundRect(width - 48 - 56, y + 16, 56, 30, 9);
    ctx.fill();
    ctx.fillStyle = resolve(tint.fg);
    ctx.font = `700 14px ${sans}`;
    ctx.textAlign = 'center';
    ctx.fillText(c.level, width - 48 - 28, y + 36);
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = resolve('var(--ink-faint)');
  ctx.font = `600 11px ${sans}`;
  ctx.fillText('Lingua', 48, height - 28);
  return new Promise((resolveBlob, reject) => canvas.toBlob((b) => (b ? resolveBlob(b) : reject(new Error('No image'))), 'image/png'));
}
