/** Rumbo mark: a compass needle on a river-green tile, pointing the way ahead. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="var(--river)" />
      <path d="M24 7 L30.5 24 L24 41 L17.5 24 Z" fill="var(--surface)" opacity="0.28" />
      <path d="M24 7 L30.5 24 L17.5 24 Z" fill="var(--ruby)" transform="rotate(35 24 24)" />
      <path d="M17.5 24 L30.5 24 L24 41 Z" fill="var(--on-river)" transform="rotate(35 24 24)" />
      <circle cx="24" cy="24" r="2.6" fill="var(--river)" />
    </svg>
  );
}
