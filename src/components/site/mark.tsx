// Pawperwork's mark: a cat and a dog peeking over a form.
// Inline SVG with currentColor so it inherits text color (next/image can't).
// The paper-colored stroke on the form separates it from the heads behind it.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="-6 -6 132 110" width={(size * 132) / 110} height={size} aria-hidden="true">
      <g fill="currentColor">
        <polygon points="22,40 24,20 36,32" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <polygon points="44,32 56,20 58,40" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="40" cy="47" rx="20" ry="18" />
        <ellipse cx="80" cy="46" rx="19" ry="18" />
        <ellipse cx="63" cy="46" rx="6.5" ry="13" transform="rotate(18 63 46)" />
        <ellipse cx="97" cy="46" rx="6.5" ry="13" transform="rotate(-18 97 46)" />
        <rect x="10" y="56" width="100" height="40" className="stroke-paper" strokeWidth="5" />
      </g>
      <g className="fill-paper">
        <circle cx="33" cy="45" r="3" />
        <circle cx="47" cy="45" r="3" />
        <circle cx="73" cy="44" r="3" />
        <circle cx="87" cy="44" r="3" />
        <rect x="22" y="70" width="48" height="5" />
        <rect x="22" y="82" width="34" height="5" />
      </g>
    </svg>
  );
}
