/**
 * Unicorn Factory — Logo mark (self-contained, no external asset pipeline).
 *
 * A faceted-prism glyph: rare/precious (the "unicorn") cut with straight,
 * engineered edges (the "factory"). Single inline SVG, no external font or
 * image request — safe for a standalone-rendering ux-review.html and for
 * Vercel deploy with no CDN dependency.
 *
 * Usage: `<LogoMark className="h-6 w-6 text-[var(--color-primary)]" />`
 * paired with the `product.name` wordmark from './copy'. Frontend wires
 * this into `app/layout.tsx` / the landing header / `UserNav` — this file
 * only defines the mark, it does not decide where it is placed.
 */
import type { SVGProps } from 'react';
import { product } from './copy';

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2 L21 8.5 L17.5 20 H6.5 L3 8.5 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 2 L12 20" stroke="currentColor" strokeWidth="1.25" opacity="0.6" />
      <path d="M3 8.5 L21 8.5" stroke="currentColor" strokeWidth="1.25" opacity="0.6" />
    </svg>
  );
}

/**
 * Full wordmark lockup (mark + name). Purely presentational; consumes
 * `product.name` from './copy' so the two never drift.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-5 w-5 shrink-0 text-[var(--color-primary,#4f46e5)]" />
      <span className="font-bold tracking-tight">{product.name}</span>
    </span>
  );
}
