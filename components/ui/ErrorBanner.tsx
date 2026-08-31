'use client';

interface ErrorBannerProps {
  message: string | null;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-md bg-[var(--color-danger-bg)] border border-[var(--color-danger-fg)]/20 px-4 py-3 text-sm text-[var(--color-danger-fg)]"
    >
      {message}
    </div>
  );
}
