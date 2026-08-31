'use client';

import type { ReactNode } from 'react';

/**
 * A non-error informational/positive banner (info / success / warning) — the
 * platform-wide alternative to `ErrorBanner` for expected, non-failure
 * outcomes: "check your email", "payment received", a decline verdict, a
 * reported-issue acknowledgement. An expected or positive outcome must never
 * wear `ErrorBanner`'s red/alert styling (ux-spec §3.2, §4.7 — DA-2).
 *
 * `role="status"` (implicit polite live region) — distinct from
 * `ErrorBanner`'s `role="alert"`.
 */
export type NoticeTone = 'info' | 'success' | 'warning';

const TONE_CLASSES: Record<NoticeTone, string> = {
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info-fg)] border-[var(--color-info-fg)]/20',
  success:
    'bg-[var(--color-success-bg)] text-[var(--color-success-fg)] border-[var(--color-success-fg)]/20',
  warning:
    'bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)] border-[var(--color-warning-fg)]/20',
};

interface NoticeProps {
  tone: NoticeTone;
  children: ReactNode;
  className?: string;
}

export default function Notice({ tone, children, className = '' }: NoticeProps) {
  return (
    <div
      role="status"
      className={['rounded-md border px-4 py-3 text-sm font-medium', TONE_CLASSES[tone], className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
