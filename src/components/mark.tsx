/** Sextante mark: a sextant's arc and arms, drawn in the brand brass. */
export function SextanteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#141a25" />
      <g stroke="#E2B355" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 25a13 13 0 0 1 18 0" />
        <path d="M16 6 7 25" />
        <path d="M16 6l9 19" />
        <path d="M16 6v15" />
      </g>
      <circle cx="16" cy="6" r="2" fill="#E2B355" />
    </svg>
  );
}
