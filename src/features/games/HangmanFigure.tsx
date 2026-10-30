// The drawing of hangman: the gallows stand from the start, and the figure comes one stroke a wrong letter.
const PARTS = [
  <circle key="head" cx="120" cy="62" r="14" />,
  <path key="body" d="M120 76v44" />,
  <path key="left-arm" d="M120 88l-22 18" />,
  <path key="right-arm" d="M120 88l22 18" />,
  <path key="left-leg" d="M120 120l-18 28" />,
  <path key="right-leg" d="M120 120l18 28" />,
];

export function HangmanFigure({ wrong, max }: { wrong: number; max: number }) {
  return (
    <svg viewBox="0 0 180 170" className="h-44 w-40 shrink-0" role="img" aria-label={`${wrong} of ${max} wrong letters`} fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <g className="stroke-line-strong">
        <path d="M24 160h96M52 160V16h68v30" />
        <path d="M52 44l24-28" />
      </g>
      <g className="stroke-accent-text">
        {PARTS.map((part, i) => (
          <g key={i} style={{ opacity: i < wrong ? 1 : 0, transition: 'opacity 160ms ease-out' }}>
            {part}
          </g>
        ))}
      </g>
    </svg>
  );
}
