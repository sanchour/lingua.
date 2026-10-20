// Flags for Lingua’s languages, drawn in its soft style: rounded, colours a little muted,
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
  // Lingua 4.0-1: the countries of the planned languages, simplified to read at 20 px.
  is: { name: 'Iceland', draw: () => nordic(C.blue, C.white, 10, 9, 5, { fill: C.red, w: 2.6 }) },
  bd: {
    name: 'Bangladesh',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.deepGreen} />
        <circle cx={15.5} cy={12} r={6.2} fill={C.red} />
      </>
    ),
  },
  pk: {
    name: 'Pakistan',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.deepGreen} />
        <rect width={9} height={24} fill={C.white} />
        {crescent(23, 12, 6, C.white, C.deepGreen, 0.26)}
        <Star x={27.4} y={9.4} r={2.2} rotate={-18} />
      </>
    ),
  },
  il: {
    name: 'Israel',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.white} />
        <rect y={3} width={36} height={2.6} fill={C.blue} />
        <rect y={18.4} width={36} height={2.6} fill={C.blue} />
        <polygon points="18,7.6 22,14.4 14,14.4" fill="none" stroke={C.blue} strokeWidth={1.1} />
        <polygon points="18,16.4 14,9.6 22,9.6" fill="none" stroke={C.blue} strokeWidth={1.1} />
      </>
    ),
  },
  ua: { name: 'Ukraine', draw: () => hStripes(['#3f6fb5', C.yellow]) },
  ad: { name: 'Andorra', draw: () => vStripes([C.blue, C.yellow, C.red]) },
  bg: { name: 'Bulgaria', draw: () => hStripes([C.white, C.green, C.red]) },
  kz: {
    name: 'Kazakhstan',
    draw: () => (
      <>
        <rect width={36} height={24} fill="#4fa6c8" />
        <circle cx={18} cy={10.4} r={4.4} fill={C.yellow} />
        <rect x={9} y={18} width={18} height={1.6} rx={0.8} fill={C.yellow} />
      </>
    ),
  },
  za: {
    name: 'South Africa',
    draw: () => (
      <>
        {hStripes([C.red, C.blue])}
        <rect y={9.5} width={36} height={5} fill={C.white} />
        <polygon points="0,0 16,12 0,24" fill={C.green} stroke={C.white} strokeWidth={1.6} />
        <polygon points="0,4 11,12 0,20" fill={C.black} />
        <rect x={9} y={10.2} width={27} height={3.6} fill={C.green} />
      </>
    ),
  },
  na: {
    name: 'Namibia',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.blue} />
        <polygon points="0,24 36,0 36,24" fill={C.green} />
        <polygon points="0,24 36,0 36,5 0,24" fill={C.white} />
        <polygon points="0,24 36,0 36,3 0,24" fill={C.red} />
        <circle cx={7} cy={6} r={2.6} fill={C.gold} />
      </>
    ),
  },
  et: {
    name: 'Ethiopia',
    draw: () => (
      <>
        {hStripes([C.green, C.yellow, C.red])}
        <circle cx={18} cy={12} r={4.6} fill={C.blue} />
        <Star x={18} y={12} r={3} fill={C.yellow} />
      </>
    ),
  },
  ng: { name: 'Nigeria', draw: () => vStripes([C.green, C.white, C.green]) },
  am: { name: 'Armenia', draw: () => hStripes([C.red, C.blue, C.orange]) },
  mm: {
    name: 'Myanmar',
    draw: () => (
      <>
        {hStripes([C.yellow, C.green, C.red])}
        <Star x={18} y={12.6} r={7} />
      </>
    ),
  },
  sk: {
    name: 'Slovakia',
    draw: () => (
      <>
        {hStripes([C.white, C.blue, C.red])}
        <path d="M6.5 5.5h7v7q0 3-3.5 4.6q-3.5-1.6-3.5-4.6z" fill={C.red} stroke={C.white} strokeWidth={0.9} />
        <rect x={9.5} y={7} width={1} height={7} fill={C.white} />
        <rect x={8} y={8.6} width={4} height={1} fill={C.white} />
      </>
    ),
  },
  ee: { name: 'Estonia', draw: () => hStripes([C.blue, C.black, C.white]) },
  lt: { name: 'Lithuania', draw: () => hStripes([C.yellow, C.green, C.red]) },
  lv: {
    name: 'Latvia',
    draw: () => (
      <>
        <rect width={36} height={24} fill="#9a3040" />
        <rect y={9.6} width={36} height={4.8} fill={C.white} />
      </>
    ),
  },
  kh: {
    name: 'Cambodia',
    draw: () => (
      <>
        {hStripes([C.blue, C.red, C.blue])}
        <rect y={6} width={36} height={12} fill={C.red} />
        <path d="M11 15.5h14l-1.5-2.5h-2l-1-3h-1l-1-2.6h-1.0l-1 2.6h-1l-1 3h-2z" fill={C.white} />
      </>
    ),
  },
  al: {
    name: 'Albania',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <path d="M18 5l3 3-1 2 3 2-2 4 1.5 3h-3l-1.5-2-1.5 2h-3l1.5-3-2-4 3-2-1-2z" fill={C.black} />
      </>
    ),
  },
  xk: {
    name: 'Kosovo',
    draw: () => (
      <>
        <rect width={36} height={24} fill="#3d5fa8" />
        <path d="M11 15q7-6 14-1l-1.5-2q-5.5-3-11 1z" fill={C.gold} />
        {[11, 14.5, 18, 21.5, 25].map((x) => (
          <circle key={x} cx={x} cy={7.5} r={0.9} fill={C.white} />
        ))}
      </>
    ),
  },
  mt: {
    name: 'Malta',
    draw: () => (
      <>
        {vStripes([C.white, C.red])}
        <rect x={3} y={3} width={4} height={1} fill="#b7b0a0" />
        <rect x={4.5} y={1.5} width={1} height={4} fill="#b7b0a0" />
      </>
    ),
  },
  ht: {
    name: 'Haiti',
    draw: () => (
      <>
        {hStripes([C.navy, C.red])}
        <rect x={13} y={8} width={10} height={8} fill={C.white} />
        <rect x={16} y={10.5} width={4} height={3.5} rx={0.5} fill={C.green} />
      </>
    ),
  },
  pe: { name: 'Peru', draw: () => vStripes([C.red, C.white, C.red]) },
  bo: { name: 'Bolivia', draw: () => hStripes([C.red, C.yellow, C.green]) },
  ec: {
    name: 'Ecuador',
    draw: () => (
      <>
        <rect width={36} height={12} fill={C.yellow} />
        <rect y={12} width={36} height={6} fill={C.blue} />
        <rect y={18} width={36} height={6} fill={C.red} />
      </>
    ),
  },
  nz: {
    name: 'New Zealand',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.navy} />
        <svg width={18} height={12} viewBox="0 0 36 24">
          {unionJack(36, 24)}
        </svg>
        <Star x={26} y={8} r={1.6} fill={C.red} />
        <Star x={30.5} y={12.5} r={1.6} fill={C.red} />
        <Star x={26} y={18} r={1.6} fill={C.red} />
        <Star x={22} y={13} r={1.3} fill={C.red} />
      </>
    ),
  },
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

// Beta languages (3.0-1b): simple shapes, emblems reduced to what reads at 20 px.
const BETA_FLAGS: Record<string, { name: string; draw: () => ReactNode }> = {
  in: {
    name: 'India',
    draw: () => (
      <>
        {hStripes([C.orange, C.white, C.green])}
        <circle cx={18} cy={12} r={2.9} fill="none" stroke={C.navy} strokeWidth={0.8} />
        <circle cx={18} cy={12} r={0.7} fill={C.navy} />
      </>
    ),
  },
  pl: { name: 'Poland', draw: () => hStripes([C.white, C.red]) },
  vn: {
    name: 'Vietnam',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <Star x={18} y={12.6} r={6.2} fill={C.yellow} />
      </>
    ),
  },
  ph: {
    name: 'Philippines',
    draw: () => (
      <>
        {hStripes([C.blue, C.red])}
        <polygon points="0,0 20.8,12 0,24" fill={C.white} />
        <circle cx={6.6} cy={12} r={2.6} fill={C.yellow} />
        <Star x={2.4} y={3.6} r={1.2} fill={C.yellow} />
        <Star x={2.4} y={20.4} r={1.2} fill={C.yellow} />
        <Star x={16.4} y={12} r={1.2} fill={C.yellow} />
      </>
    ),
  },
  th: {
    name: 'Thailand',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        <rect y={4} width={36} height={16} fill={C.white} />
        <rect y={8} width={36} height={8} fill={C.navy} />
      </>
    ),
  },
  ir: {
    name: 'Iran',
    draw: () => (
      <>
        {hStripes([C.green, C.white, C.red])}
        <g fill="none" stroke={C.red} strokeWidth={0.9} strokeLinecap="round">
          <path d="M18 9v6" />
          <path d="M15.6 9.6c-1.4 2.2-.6 4.6 1.2 5.2" />
          <path d="M20.4 9.6c1.4 2.2.6 4.6-1.2 5.2" />
        </g>
      </>
    ),
  },
  af: {
    name: 'Afghanistan',
    draw: () => (
      <>
        {vStripes([C.black, C.red, C.green])}
        <circle cx={18} cy={12} r={4} fill="none" stroke={C.white} strokeWidth={0.9} />
        <rect x={16.6} y={10.4} width={2.8} height={3} fill={C.white} />
      </>
    ),
  },
  tj: {
    name: 'Tajikistan',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.white} />
        <rect width={36} height={6.9} fill={C.red} />
        <rect y={17.1} width={36} height={6.9} fill={C.green} />
        <path d="M15.6 14l.6-2.6 1.8 1.2 1.8-1.2.6 2.6z" fill={C.gold} />
        {[-5, -3.2, -1.2, 1.2, 3.2, 5].map((dx, i) => (
          <Star key={i} x={18 + dx} y={10.2 - (Math.abs(dx) > 4 ? 0 : Math.abs(dx) > 2 ? 0.9 : 1.4)} r={0.7} fill={C.gold} />
        ))}
      </>
    ),
  },
  hk: {
    name: 'Hong Kong',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.red} />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={18} cy={8.4} rx={1.9} ry={3.6} fill={C.white} transform={`rotate(${a} 18 12)`} />
        ))}
      </>
    ),
  },
  cz: {
    name: 'Czechia',
    draw: () => (
      <>
        {hStripes([C.white, C.red])}
        <polygon points="0,0 18,12 0,24" fill={C.blue} />
      </>
    ),
  },
  ro: { name: 'Romania', draw: () => vStripes([C.blue, C.yellow, C.red]) },
  md: {
    name: 'Moldova',
    draw: () => (
      <>
        {vStripes([C.blue, C.yellow, C.red])}
        <path d="M16.2 9h3.6v4.2c0 1.5-1.8 2.4-1.8 2.4s-1.8-.9-1.8-2.4z" fill="#8a5a2b" />
      </>
    ),
  },
  hr: {
    name: 'Croatia',
    draw: () => (
      <>
        {hStripes([C.red, C.white, C.blue])}
        <path d="M14.8 7.6h6.4v5.6c0 2.2-3.2 3.6-3.2 3.6s-3.2-1.4-3.2-3.6z" fill={C.white} stroke={C.red} strokeWidth={0.5} />
        {[0, 1, 2, 3].flatMap((row) =>
          [0, 1, 2, 3].map((col) =>
            (row + col) % 2 === 0 && row < 3 ? <rect key={`${row}-${col}`} x={14.8 + col * 1.6} y={7.6 + row * 1.6} width={1.6} height={1.6} fill={C.red} /> : null,
          ),
        )}
      </>
    ),
  },
  rs: {
    name: 'Serbia',
    draw: () => (
      <>
        {hStripes([C.red, C.blue, C.white])}
        <path d="M9.4 6.6h5.2v6c0 2-2.6 3.2-2.6 3.2s-2.6-1.2-2.6-3.2z" fill={C.red} stroke={C.white} strokeWidth={0.5} />
        <path d="M12 7.8v6M10.2 10.4h3.6" stroke={C.white} strokeWidth={0.7} />
      </>
    ),
  },
  ba: {
    name: 'Bosnia and Herzegovina',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.blue} />
        <polygon points="10,0 26,0 26,24" fill={C.yellow} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Star key={i} x={7 + i * 3.3} y={-1.2 + i * 4.5} r={1.1} fill={C.white} />
        ))}
      </>
    ),
  },
  me: {
    name: 'Montenegro',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.gold} />
        <rect x={1.4} y={1.4} width={33.2} height={21.2} fill={C.deepRed} />
        <path d="M18 7.4l2.6 1.8 2.6-1.2-.8 3.2 1.6 1.4-2.4.6-1.2 3.6h-4.8l-1.2-3.6-2.4-.6 1.6-1.4-.8-3.2 2.6 1.2z" fill={C.gold} />
      </>
    ),
  },
  my: {
    name: 'Malaysia',
    draw: () => (
      <>
        {hStripes([C.red, C.white, C.red, C.white, C.red, C.white, C.red, C.white, C.red, C.white, C.red, C.white, C.red, C.white])}
        <rect width={18} height={13.7} fill={C.navy} />
        {crescent(7.4, 6.85, 4.4, C.yellow, C.navy, 0.3)}
        <Star x={12.6} y={6.85} r={2.6} fill={C.yellow} />
      </>
    ),
  },
  lk: {
    name: 'Sri Lanka',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.gold} />
        <rect x={1.4} y={1.4} width={4.4} height={21.2} fill="#2f7d5a" />
        <rect x={5.8} y={1.4} width={4.4} height={21.2} fill={C.orange} />
        <rect x={11.4} y={1.4} width={23.2} height={21.2} fill="#8a2335" />
        <path d="M18.6 16.6l1-4.2 2.2-1.6 2.6.4 1.4-2 1.6 1.2-.8 2.2 1.4 2.2-.6 1.8h-1.6l-.4-1.4-2.4.4-.4 1h-4z" fill={C.gold} />
      </>
    ),
  },
  ge: {
    name: 'Georgia',
    draw: () => (
      <>
        <rect width={36} height={24} fill={C.white} />
        <rect x={16} width={4} height={24} fill={C.red} />
        <rect y={10} width={36} height={4} fill={C.red} />
        {[
          [8, 5],
          [28, 5],
          [8, 19],
          [28, 19],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y - 2.2}v4.4M${x - 2.2} ${y}h4.4`} stroke={C.red} strokeWidth={1.2} />
        ))}
      </>
    ),
  },
  uz: {
    name: 'Uzbekistan',
    draw: () => (
      <>
        {hStripes(['#2f8fc0', C.white, C.green])}
        <rect y={7.7} width={36} height={0.6} fill={C.red} />
        <rect y={15.7} width={36} height={0.6} fill={C.red} />
        {crescent(5, 4, 2.6, C.white, '#2f8fc0', 0.3)}
        {[0, 1, 2].map((i) => (
          <Star key={i} x={10 + i * 2.4} y={4} r={0.8} />
        ))}
      </>
    ),
  },
  mn: {
    name: 'Mongolia',
    draw: () => (
      <>
        {vStripes([C.red, '#2f5fa8', C.red])}
        <g fill={C.yellow}>
          <circle cx={6} cy={5.6} r={1.2} />
          <path d="M4.4 8h3.2l-1.6 1.4z" />
          <rect x={4.4} y={10} width={3.2} height={0.8} />
          <circle cx={6} cy={13.2} r={1.4} />
          <rect x={4.4} y={15.6} width={3.2} height={0.8} />
          <rect x={3.2} y={8} width={0.7} height={9.4} />
          <rect x={8.1} y={8} width={0.7} height={9.4} />
        </g>
      </>
    ),
  },
};
Object.assign(FLAGS, BETA_FLAGS);

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
