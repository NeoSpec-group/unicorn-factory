'use client';

interface ErrorBannerProps {
  message: string | null;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
    >
      {message}
    </div>
  );
}
