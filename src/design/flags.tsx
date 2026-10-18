// Flags for the twenty languages, drawn in Lingua's soft style: rounded, colours a little muted,
// details simplified so they read at 20 px. Each is drawn on a 36 × 24 canvas.
import { useId } from 'react';
import type { ReactNode } from 'react';
import { getLanguage } from '@/core/lang/languages';
import { cx } from '@/lib/cx';

const C = {
  red: '#c9424a',
  deepRed: '#b23a40',
  white: '#f7f5f0',
  blue: '#2f4f8f',
  navy: '#273a6b',
  sky: '#78a9d9',
  green: '#2f8a5a',
  deepGreen: '#1f6e48',
  yellow: '#f0c24a',
  gold: '#d9a93a',
  orange: '#e58a43',
  black: '#2a2a2e',
};

/** A five-pointed star centred on (cx, cy). */
function star(cx: number, cy: number, r: number, rotate = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? r * 0.4 : r;
    const a = ((i * 36 - 90 + rotate) * Math.PI) / 180;
    pts.push(`${(cx + radius * Math.cos(a)).toFixed(2)},${(cy + radius * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const Star = ({ x, y, r, fill = C.white, rotate = 0 }: { x: number; y: number; r: number; fill?: string; rotate?: number }) => (
  <polygon points={star(x, y, r, rotate)} fill={fill} />
);

const hStripes = (colors: string[]) =>
  colors.map((fill, i) => <rect key={i} x={0} y={(24 / colors.length) * i} width={36} height={24 / colors.length + 0.05} fill={fill} />);
const vStripes = (colors: string[]) =>
  colors.map((fill, i) => <rect key={i} x={(36 / colors.length) * i} y={0} width={36 / colors.length + 0.05} height={24} fill={fill} />);

/** A Nordic cross: the vertical bar's left edge at `x`, the horizontal bar's top at `y`. */
const nordic = (bg: string, cross: string, x: number, y: number, w: number, inner?: { fill: string; w: number }) => (
  <>
    <rect width={36} height={24} fill={bg} />
    <rect x={x} y={0} width={w} height={24} fill={cross} />
    <rect x={0} y={y} width={36} height={w} fill={cross} />
    {inner && (
      <>
        <rect x={x + (w - inner.w) / 2} y={0} width={inner.w} height={24} fill={inner.fill} />
        <rect x={0} y={y + (w - inner.w) / 2} width={36} height={inner.w} fill={inner.fill} />
      </>
    )}
  </>
);

/** The Union Jack inside a w × h box at the origin. */
const unionJack = (w: number, h: number) => (
  <>
    <rect width={w} height={h} fill={C.navy} />
    <path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} stroke={C.white} strokeWidth={h * 0.2} />
    <path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} stroke={C.red} strokeWidth={h * 0.07} />
    <path d={`M${w / 2} 0V${h}M0 ${h / 2}H${w}`} stroke={C.white} strokeWidth={h * 0.32} />
    <path d={`M${w / 2} 0V${h}M0 ${h / 2}H${w}`} stroke={C.red} strokeWidth={h * 0.19} />
  </>
);

/** A crescent opening to the right, centred near (cx, cy). */
const crescent = (cx: number, cy: number, r: number, fill: string, bg: string, shift = 0.28) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill={fill} />
    <circle cx={cx + r * shift} cy={cy} r={r * 0.8} fill={bg} />
  </>
);

const FLAGS: Record<string, { name: string; draw: () => ReactNode }> = {
  gb: { name: 'United Kingdom', draw: () => unionJack(36, 24) },
  us: {
    name: 'United States',
    draw: () => (
      <>
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} y={(24 / 13) * i} width={36} height={24 / 13 + 0.05} fill={i % 2 ? C.white : C.red} />
        ))}
        <rect width={15} height={(24 / 13) * 7} fill={C.navy} />
        {Array.from({ length: 20 }, (_, i) => (
          <circle key={i} cx={1.9 + (i % 5) * 2.8} cy={1.7 + Math.floor(i / 5) * 3} r={0.55} fill={C.white} />
        ))}
      </>
    ),
  },
  ie: { name: 'Ireland', draw: () => vStripes([C.green, C.white, C.orange]) },
  au: {
    name: 'Australia',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.navy} />
        {unionJack(18, 12)}
        <Star x={9} y={18} r={3} />
        <Star x={27} y={4.5} r={1.4} />
        <Star x={23} y={11} r={1.4} />
        <Star x={30.5} y={10} r={1.4} />
        <Star x={27} y={19.5} r={1.6} />
      </>
    ),
  },
  ca: {
    name: 'Canada',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.white} />
        <rect width={9} height={24} fill={C.red} />
        <rect x={27} width={9} height={24} fill={C.red} />
        <path
          d="M18 4.2l1.3 2.6 1.4-.7-.5 3.6 2.2-2.3.5 1.3 2.4-.5-.8 2.6 1 .5-3.8 3.1.4 1.3-3.6-.5v3.4h-1v-3.4l-3.6.5.4-1.3-3.8-3.1 1-.5-.8-2.6 2.4.5.5-1.3 2.2 2.3-.5-3.6 1.4.7z"
          fill={C.red}
        />
      </>
    ),
  },
  es: {
    name: 'Spain',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <rect y={6} width={36} height={12} fill={C.yellow} />
        <rect x={8} y={9.5} width={4} height={5} rx={1.2} fill={C.deepRed} opacity={0.8} />
      </>
    ),
  },
  mx: {
    name: 'Mexico',
    draw: () => (
      <>
        {vStripes([C.deepGreen, C.white, C.red])}
        <circle cx={18} cy={12} r={3.2} fill="#a7804a" opacity={0.85} />
        <path d="M15.6 13.6q2.4 2 4.8 0" stroke={C.green} strokeWidth={0.9} fill="none" />
      </>
    ),
  },
  ar: {
    name: 'Argentina',
    draw: () => (
      <>
        {hStripes([C.sky, C.white, C.sky])}
        <circle cx={18} cy={12} r={2.6} fill={C.gold} />
      </>
    ),
  },
  co: {
    name: 'Colombia',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <rect width={36} height={18} fill={C.blue} />
        <rect width={36} height={12} fill={C.yellow} />
      </>
    ),
  },
  fr: { name: 'France', draw: () => vStripes([C.blue, C.white, C.red]) },
  be: { name: 'Belgium', draw: () => vStripes([C.black, C.yellow, C.red]) },
  ch: {
    name: 'Switzerland',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <rect x={15.5} y={5} width={5} height={14} fill={C.white} />
        <rect x={11} y={9.5} width={14} height={5} fill={C.white} />
      </>
    ),
  },
  de: { name: 'Germany', draw: () => hStripes([C.black, C.red, C.yellow]) },
  at: { name: 'Austria', draw: () => hStripes([C.red, C.white, C.red]) },
  it: { name: 'Italy', draw: () => vStripes([C.green, C.white, C.red]) },
  br: {
    name: 'Brazil',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.green} />
        <polygon points="18,3 33,12 18,21 3,12" fill={C.yellow} />
        <circle cx={18} cy={12} r={5.2} fill={C.navy} />
        <path d="M13 11.2q5-2.2 10 1.6" stroke={C.white} strokeWidth={1} fill="none" />
      </>
    ),
  },
  pt: {
    name: 'Portugal',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <rect width={14.4} height={24} fill={C.deepGreen} />
        <circle cx={14.4} cy={12} r={4.4} fill={C.yellow} />
        <rect x={12.4} y={9.4} width={4} height={5} rx={1.4} fill={C.red} />
        <rect x={13.4} y={10.4} width={2} height={3} rx={0.6} fill={C.white} />
      </>
    ),
  },
  ru: { name: 'Russia', draw: () => hStripes([C.white, C.blue, C.red]) },
  gr: {
    name: 'Greece',
    draw: () => (
      <>
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} y={(24 / 9) * i} width={36} height={24 / 9 + 0.05} fill={i % 2 ? C.white : '#3c70b4'} />
        ))}
        <rect width={13.3} height={13.3} fill="#3c70b4" />
        <rect x={5.33} width={2.67} height={13.3} fill={C.white} />
        <rect y={5.33} width={13.3} height={2.67} fill={C.white} />
      </>
    ),
  },
  se: { name: 'Sweden', draw: () => nordic('#3a6fb0', C.yellow, 11, 9.6, 4.8) },
  fi: { name: 'Finland', draw: () => nordic(C.white, '#2c5aa0', 10, 8.7, 6.6) },
  no: { name: 'Norway', draw: () => nordic(C.red, C.white, 9.8, 8.8, 6.4, { fill: C.navy, w: 3.2 }) },
  dk: { name: 'Denmark', draw: () => nordic(C.red, C.white, 11, 9.6, 4.6) },
  hu: { name: 'Hungary', draw: () => hStripes([C.red, C.white, C.green]) },
  nl: { name: 'Netherlands', draw: () => hStripes(['#b8403a', C.white, '#2e4a92']) },
  tr: {
    name: 'Türkiye',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        {crescent(14, 12, 6, C.white, C.red, 0.26)}
        <Star x={21.3} y={12} r={2.6} rotate={-18} />
      </>
    ),
  },
  id: { name: 'Indonesia', draw: () => hStripes([C.red, C.white]) },
  tz: {
    name: 'Tanzania',
    draw: () => (
      <>
        <polygon points="0,0 36,0 0,24" fill={C.green} />
        <polygon points="36,0 36,24 0,24" fill="#3b86c6" />
        <path d="M0 24L36 0" stroke={C.yellow} strokeWidth={10} />
        <path d="M0 24L36 0" stroke={C.black} strokeWidth={6.4} />
      </>
    ),
  },
  ke: {
    name: 'Kenya',
    draw: () => (
      <>
        {hStripes([C.black, C.red, C.deepGreen])}
        <rect y={7.6} width={36} height={1.1} fill={C.white} />
        <rect y={15.3} width={36} height={1.1} fill={C.white} />
        <ellipse cx={18} cy={12} rx={3} ry={6.2} fill={C.red} stroke={C.black} strokeWidth={0.6} />
        <ellipse cx={18} cy={12} rx={1} ry={3.6} fill={C.white} />
      </>
    ),
  },
  laurel: {
    name: 'Latin (laurel)',
    draw: () => (
      <>
        <rect width={36} height={24} fill="#6e3552" />
        <g fill="none" stroke={C.gold} strokeWidth={1.1} strokeLinecap="round">
          <path d="M13.2 19.5C9.6 16.8 9 10.2 12.6 5.6" />
          <path d="M22.8 19.5C26.4 16.8 27 10.2 23.4 5.6" />
        </g>
        <g fill={C.gold}>
          {[
            [11.1, 16.6, -50],
            [10.2, 13.2, -15],
            [10.6, 9.8, 20],
            [11.8, 7, 45],
          ].map(([x, y, r], i) => (
            <ellipse key={`l${i}`} cx={x} cy={y} rx={0.9} ry={2} transform={`rotate(${r} ${x} ${y})`} />
          ))}
          {[
            [24.9, 16.6, 50],
            [25.8, 13.2, 15],
            [25.4, 9.8, -20],
            [24.2, 7, -45],
          ].map(([x, y, r], i) => (
            <ellipse key={`r${i}`} cx={x} cy={y} rx={0.9} ry={2} transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </g>
        <text x={18} y={14.2} textAnchor="middle" fontSize={5.2} fontFamily="Georgia, serif" fontWeight={700} fill={C.gold}>
          SPQR
        </text>
      </>
    ),
  },
  sa: {
    name: 'Saudi Arabia',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.deepGreen} />
        <g stroke={C.white} strokeWidth={1.1} strokeLinecap="round" fill="none">
          <path d="M10 9.5q2-2 4 0t4 0 4 0 4 0" />
          <path d="M12 12.4q1.5-1.4 3 0t3 0 3 0 3 0" />
          <path d="M10.5 16.4H25l-1.4-1.2" />
        </g>
      </>
    ),
  },
  eg: {
    name: 'Egypt',
    draw: () => (
      <>
        {hStripes([C.red, C.white, C.black])}
        <path d="M18 9.4l1.8 1.2-.6 3.2h-2.4l-.6-3.2z" fill={C.gold} />
      </>
    ),
  },
  ae: {
    name: 'United Arab Emirates',
    draw: () => (
      <>
        {hStripes([C.deepGreen, C.white, C.black])}
        <rect width={9} height={24} fill={C.red} />
      </>
    ),
  },
  ma: {
    name: 'Morocco',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.deepRed} />
        <polygon points={star(18, 12.4, 5.2)} fill="none" stroke={C.deepGreen} strokeWidth={1.1} strokeLinejoin="round" />
      </>
    ),
  },
  jo: {
    name: 'Jordan',
    draw: () => (
      <>
        {hStripes([C.black, C.white, C.deepGreen])}
        <polygon points="0,0 16,12 0,24" fill={C.red} />
        <Star x={5.6} y={12} r={1.9} />
      </>
    ),
  },
  cn: {
    name: 'China',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <Star x={6.5} y={6.5} r={3.6} fill={C.yellow} />
        <Star x={12.2} y={2.6} r={1.2} fill={C.yellow} rotate={20} />
        <Star x={14.4} y={5} r={1.2} fill={C.yellow} rotate={40} />
        <Star x={14.4} y={8.4} r={1.2} fill={C.yellow} rotate={5} />
        <Star x={12.2} y={10.8} r={1.2} fill={C.yellow} rotate={20} />
      </>
    ),
  },
  tw: {
    name: 'Taiwan',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <rect width={18} height={12} fill={C.navy} />
        <g fill={C.white}>
          {Array.from({ length: 12 }, (_, i) => (
            <polygon key={i} points="9,1.8 9.9,4.6 8.1,4.6" transform={`rotate(${i * 30} 9 6)`} />
          ))}
        </g>
        <circle cx={9} cy={6} r={2.3} fill={C.white} stroke={C.navy} strokeWidth={0.5} />
      </>
    ),
  },
  sg: {
    name: 'Singapore',
    draw: () => (
      <>
        {hStripes([C.red, C.white])}
        {crescent(7.6, 6, 3.6, C.white, C.red, 0.35)}
        {[
          [10, 3.4],
          [12.1, 4.9],
          [11.3, 7.5],
          [8.7, 7.5],
          [7.9, 4.9],
        ].map(([x, y], i) => (
          <Star key={i} x={x + 0.6} y={y + 0.2} r={0.8} />
        ))}
      </>
    ),
  },
  jp: {
    name: 'Japan',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.white} />
        <circle cx={18} cy={12} r={7.2} fill={C.red} />
      </>
    ),
  },
  kr: {
    name: 'South Korea',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.white} />
        <g transform="rotate(33.7 18 12)">
          <path d="M12 12a6 6 0 0 1 12 0a3 3 0 0 1-6 0a3 3 0 0 0-6 0z" fill={C.red} />
          <path d="M12 12a6 6 0 0 0 12 0a3 3 0 0 0-6 0a3 3 0 0 1-6 0z" fill={C.blue} />
        </g>
        <g fill={C.black}>
          {[
            [7, 5, -56],
            [29, 5, 56],
            [7, 19, 56],
            [29, 19, -56],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`rotate(${r} ${x} ${y})`}>
              <rect x={x - 2.6} y={y - 2.2} width={5.2} height={1} />
              <rect x={x - 2.6} y={y - 0.5} width={5.2} height={1} />
              <rect x={x - 2.6} y={y + 1.2} width={5.2} height={1} />
            </g>
          ))}
        </g>
      </>
    ),
  },
};

export const flagName = (code: string) => FLAGS[code]?.name ?? code.toUpperCase();
export const hasFlag = (code: string) => code in FLAGS;

interface FlagProps {
  code: string;
  /** Width in px; the flag is 3 : 2. */
  width?: number;
  className?: string;
  /** Spoken name; empty for a flag beside its language's name. */
  title?: string;
}

/** One flag, rounded and softly muted, with a hairline edge so white flags hold their shape. */
export function Flag({ code, width = 24, className, title }: FlagProps) {
  const clip = useId();
  const flag = FLAGS[code];
  const height = (width * 2) / 3;
  return (
    <svg
      viewBox="0 0 36 24"
      width={width}
      height={height}
      className={cx('lingua-flag shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <clipPath id={clip}>
        <rect width={36} height={24} rx={4.5} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {flag ? flag.draw() : <rect width={36} height={24} fill="#c9c4b8" />}
        {/* A soft sheen from the top and a gentle wash keep flags calm beside the paper. */}
        <rect width={36} height={24} fill="#fff" opacity={0.07} />
        <rect width={36} height={12} fill="#fff" opacity={0.06} />
      </g>
      <rect x={0.4} y={0.4} width={35.2} height={23.2} rx={4.2} fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={0.8} />
    </svg>
  );
}

/** The flag a language shows: the learner's choice, else the language's usual one. */
export function flagFor(lang: string, chosen?: string): string {
  const flags = getLanguage(lang)?.flags ?? [];
  return chosen && flags.includes(chosen) ? chosen : (flags[0] ?? lang);
}

/** A language's flag. */
export function LanguageFlag({ lang, chosen, width, className }: { lang: string; chosen?: string; width?: number; className?: string }) {
  return <Flag code={flagFor(lang, chosen)} width={width} className={className} />;
}
