/**
 * Unicorn Factory — Brand Tokens (single source of truth)
 *
 * This module is the ONLY place brand values (color, type, radius, shadow, spacing)
 * are defined. Screens and components must never hardcode a brand literal
 * (hex value, font name, radius, etc.) — they consume these tokens instead,
 * either directly (import from '@/lib/brand') or via the CSS custom properties
 * this module's `cssVariables` map is meant to seed into `app/globals.css`
 * (owned by frontend-1 — see brand.md "Configurable Source of Truth").
 *
 * Do not edit `app/globals.css` or `components/ui/*` from this file's owners —
 * this module is consumed READ-ONLY by both frontend lanes.
 */

// ---------------------------------------------------------------------------
// Color ramps
// ---------------------------------------------------------------------------
// "Blueprint" indigo — primary. Values match the indigo ramp already in use
// across components/ui/* (Button, Input, Spinner, Badge, UserNav) so wiring
// these tokens in is a like-for-like refinement, not a visual regression.
// Re-skinning the product = editing this ramp only.
export const primary = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5', // base — current Button/UserNav/focus-ring color
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
} as const;

// "Forge" amber/copper — accent. New addition: ties the palette to the
// product's own manufacturing metaphor (Ignition, The Forge, Green-Light)
// and gives the brand a warm counterpoint to the cool primary so it reads
// as an engineering studio, not a generic SaaS purple.
export const accent = {
  50: '#fffbeb',
  100: '#fef3c7',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b', // base — sparing use: highlights, hero underline, Forge/Ignition badges
  600: '#d97706',
  700: '#b45309',
} as const;

// Neutral ramp — matches the Tailwind gray scale already used throughout
// (bg-gray-50, text-gray-900, border-gray-200, etc). Named here so a future
// re-skin (e.g. to a cooler slate) is a one-line change instead of a
// find-and-replace across every screen.
export const neutral = {
  0: '#ffffff',
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
} as const;

// Semantic colors — status/feedback. `success` is deliberately the same
// green already used for the "Green-Light" approval stage badge; the brand
// leans into the product's own stage vocabulary rather than fighting it.
export const semantic = {
  success: { bg: '#dcfce7', fg: '#166534', solid: '#16a34a' },
  warning: { bg: accent[100], fg: accent[700], solid: accent[500] },
  danger: { bg: '#fee2e2', fg: '#991b1b', solid: '#dc2626' },
  info: { bg: '#e0f2fe', fg: '#075985', solid: '#0284c7' },
} as const;

// ---------------------------------------------------------------------------
// Light theme (shipped in V1 — the app is intentionally light-only today;
// see app/globals.css comment). Dark tokens are defined below so the brand
// is dark-mode-ready without forcing V1 to implement it.
// ---------------------------------------------------------------------------
export const lightTheme = {
  background: neutral[50], // app shell background (matches body bg-gray-50)
  surface: neutral[0], // card/panel background (matches bg-white)
  surfaceMuted: neutral[100],
  foreground: neutral[900], // primary text — canonical value; reconcile
  // app/globals.css `--foreground` (currently #171717, a create-next-app
  // leftover) to this value when wiring tokens in, so there is a single
  // declared foreground instead of two slightly different near-blacks.
  foregroundMuted: neutral[500],
  border: neutral[200],
  borderStrong: neutral[300],
  primary: primary[600],
  primaryHover: primary[700],
  primarySoft: primary[50],
  accent: accent[500],
  accentSoft: accent[100],
  ring: primary[500],
} as const;

// Dark theme — NOT wired into the shipped app in V1 (existing decision:
// "we do NOT flip to a dark palette on prefers-color-scheme"). Provided so
// the brand source is complete and a future dark-mode pass is a token swap,
// not a redesign.
export const darkTheme = {
  background: neutral[900],
  surface: neutral[800],
  surfaceMuted: neutral[700],
  foreground: neutral[50],
  foregroundMuted: neutral[400],
  border: neutral[700],
  borderStrong: neutral[600],
  primary: primary[400],
  primaryHover: primary[300],
  primarySoft: primary[900],
  accent: accent[400],
  accentSoft: accent[700],
  ring: primary[400],
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
// Self-hostable only (no runtime CDN): Inter is already wired via
// `next/font/google` in app/layout.tsx, which self-hosts the font at build
// time (no client-side Google Fonts request) — kept as-is, refined here as
// the declared brand font rather than replaced.
export const typography = {
  fontSans:
    "var(--font-inter), Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontMono:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  scale: {
    xs: { size: '0.75rem', lineHeight: '1rem' },
    sm: { size: '0.875rem', lineHeight: '1.25rem' },
    base: { size: '1rem', lineHeight: '1.5rem' },
    lg: { size: '1.125rem', lineHeight: '1.75rem' },
    xl: { size: '1.25rem', lineHeight: '1.75rem' },
    '2xl': { size: '1.5rem', lineHeight: '2rem' },
    '3xl': { size: '1.875rem', lineHeight: '2.25rem' },
    '4xl': { size: '2.25rem', lineHeight: '2.5rem' },
    '5xl': { size: '3rem', lineHeight: '1.1' },
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

// ---------------------------------------------------------------------------
// Radius / shadow / layout tokens
// ---------------------------------------------------------------------------
export const radius = {
  sm: '0.375rem', // inputs/buttons — matches existing rounded-md
  md: '0.5rem', // cards — matches existing rounded-lg
  lg: '0.75rem', // marketing/hero surfaces
  full: '9999px', // pills, badges, UserNav chip
} as const;

export const shadow = {
  sm: '0 1px 2px 0 rgba(17, 24, 39, 0.05)', // matches existing shadow-sm
  md: '0 4px 6px -1px rgba(17, 24, 39, 0.08), 0 2px 4px -2px rgba(17, 24, 39, 0.06)',
} as const;

export const layout = {
  containerNarrow: '48rem', // max-w-3xl — copy-heavy marketing sections
  containerWide: '80rem', // max-w-7xl — dashboard/ops/app screens
  sectionYDesktop: '5rem',
  sectionYMobile: '3rem',
} as const;

// ---------------------------------------------------------------------------
// CSS custom properties — the exact set frontend-1 seeds into
// `app/globals.css` `:root` (and `@theme inline`) so Tailwind utilities and
// arbitrary-value classes read from these variables instead of literals.
// This object is generated FROM the token values above — editing the tokens
// above is the single edit needed to re-skin the product.
// ---------------------------------------------------------------------------
type ThemeTokens = Record<keyof typeof lightTheme, string>;

export function toCssVariables(theme: ThemeTokens = lightTheme): Record<string, string> {
  return {
    '--background': theme.background,
    '--surface': theme.surface,
    '--surface-muted': theme.surfaceMuted,
    '--foreground': theme.foreground,
    '--foreground-muted': theme.foregroundMuted,
    '--border': theme.border,
    '--border-strong': theme.borderStrong,
    '--color-primary': theme.primary,
    '--color-primary-hover': theme.primaryHover,
    '--color-primary-soft': theme.primarySoft,
    '--color-accent': theme.accent,
    '--color-accent-soft': theme.accentSoft,
    '--ring': theme.ring,
    '--color-success': semantic.success.solid,
    '--color-warning': semantic.warning.solid,
    '--color-danger': semantic.danger.solid,
    '--color-info': semantic.info.solid,
    '--font-sans': typography.fontSans,
    '--font-mono': typography.fontMono,
    '--radius-sm': radius.sm,
    '--radius-md': radius.md,
    '--radius-lg': radius.lg,
    '--radius-full': radius.full,
    '--shadow-sm': shadow.sm,
    '--shadow-md': shadow.md,
  };
}

export const cssVariablesLight = toCssVariables(lightTheme);
export const cssVariablesDark = toCssVariables(darkTheme);
