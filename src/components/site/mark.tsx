// Pawperwork's mark: a cat and a dog peeking over a form.
// Inline SVG with currentColor so it inherits text color (next/image can't).
// Paper-colored strokes separate the form and the dog's floppy ears from the
// shapes behind them. The favicon set in src/app and public/ is the same drawing,
// inverted on an ink square.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="-6 -6 132 110" width={(size * 132) / 110} height={size} aria-hidden="true">
      <g fill="currentColor">
        <polygon points="22,40 24,20 36,32" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <polygon points="44,32 56,20 58,40" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="40" cy="47" rx="20" ry="18" />
        <ellipse cx="84" cy="47" rx="17" ry="17" />
        <path
          d="M72 32 C60 30 58 46 62 58 C68 58 72 50 74 40 Z"
          className="stroke-paper"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M96 32 C108 30 110 46 106 58 C100 58 96 50 94 40 Z"
          className="stroke-paper"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="10" y="56" width="100" height="40" className="stroke-paper" strokeWidth="5" />
      </g>
      <g className="fill-paper">
        <circle cx="33" cy="45" r="3" />
        <circle cx="47" cy="45" r="3" />
        <circle cx="78" cy="46" r="3" />
        <circle cx="90" cy="46" r="3" />
        <rect x="22" y="70" width="48" height="5" />
        <rect x="22" y="82" width="34" height="5" />
      </g>
    </svg>
  );
}
