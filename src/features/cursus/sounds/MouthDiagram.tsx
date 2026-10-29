// A sketch of the mouth from the side (6-10): where the tongue is and what the lips, the soft palate and the voice are doing for a sound.
// Stylised and labelled so: it is a picture to think with, not a scan. Drawn from the sound's own fields (core/sounds/articulation).
import { PLACE_POINT, vowelPoint } from '@/core/sounds/articulation';
import type { Sound } from '@/core/sounds';

/** The tongue as a closed shape: its tip, its highest point, and its root at the throat. */
function tonguePath(tip: { x: number; y: number }, high: { x: number; y: number }): string {
  return `M ${tip.x} ${tip.y} C ${tip.x + 22} ${tip.y - 14}, ${high.x - 24} ${high.y - 4}, ${high.x} ${high.y} C ${high.x + 22} ${high.y + 2}, 156 ${high.y + 22}, 154 136 L 70 138 C 56 134, ${tip.x - 8} ${tip.y + 10}, ${tip.x} ${tip.y} Z`;
}

export function MouthDiagram({ sound }: { sound: Sound }) {
  if (sound.kind === 'tone') return null;
  const consonant = sound.kind === 'consonant';
  const nasal = consonant ? sound.manner === 'nasal' : Boolean(sound.nasal);
  const voiced = consonant ? sound.voiced : true;
  const rounded = !consonant && Boolean(sound.rounded);
  // A consonant: the tongue rises to its place (the lips and the glottis keep it low). A vowel: the tongue's highest point is where the vowel puts it.
  const point = consonant ? PLACE_POINT[sound.place] : vowelPoint(sound);
  const lingual = consonant && !['bilabial', 'labiodental', 'glottal', 'pharyngeal'].includes(sound.place);
  const tip = lingual ? { x: Math.min(point.x, 96), y: point.y + 6 } : { x: 58, y: 116 };
  const high = consonant ? (lingual ? { x: Math.max(point.x, 100), y: point.y + 4 } : { x: sound.place === 'pharyngeal' ? 140 : 104, y: sound.place === 'pharyngeal' ? 104 : 108 }) : point;
  return (
    <svg viewBox="0 0 200 160" role="img" aria-label="A sketch of the mouth from the side, showing where the tongue is" className="w-full max-w-[17rem]">
      {/* The head: forehead, nose, upper lip, teeth and ridge, the hard palate and the soft palate, the throat. */}
      <path d="M20 70 C14 70, 12 60, 18 54 L18 30 C60 6, 150 6, 168 40 L168 150" fill="none" stroke="var(--line-strong)" strokeWidth="1.6" />
      <path d="M48 66 L50 78 M58 60 C70 46, 112 36, 128 42 C142 46, 152 52, 156 66" fill="none" stroke="var(--ink-soft)" strokeWidth="1.8" strokeLinecap="round" />
      {/* The soft palate drops for a nasal sound. */}
      <path d={nasal ? 'M128 42 C142 56, 150 72, 152 96' : 'M128 42 C142 46, 152 52, 156 66'} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      {/* The lower lip and the jaw. */}
      <path d={`M${rounded ? 12 : 20} 84 C30 90, 40 96, 56 100 L74 118`} fill="none" stroke="var(--ink-soft)" strokeWidth="1.8" strokeLinecap="round" />
      <path d={tonguePath(tip, high)} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.8" />
      {/* Where it happens. */}
      <circle cx={point.x} cy={point.y} r="5" fill="var(--accent)" opacity="0.85" />
      {/* The vocal folds, humming when the voice is on. */}
      <g transform="translate(164 126)" stroke={voiced ? 'var(--accent)' : 'var(--ink-faint)'} fill="none" strokeWidth="1.8" strokeLinecap="round">
        {voiced ? <path d="M-6 0 q2 -6 4 0 t4 0 t4 0" /> : <path d="M-6 0 h12" strokeDasharray="2 3" />}
      </g>
      <text x="170" y="144" fontSize="8" fill="var(--ink-faint)" textAnchor="end">
        {voiced ? 'voice on' : 'voice off'}
      </text>
      <text x="22" y="150" fontSize="8" fill="var(--ink-faint)">
        lips
      </text>
    </svg>
  );
}
