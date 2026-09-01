'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CreateProjectResponse } from '@/types';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Spinner from '@/components/ui/Spinner';
import Notice from '@/components/Notice';
import { Wordmark } from '@/lib/brand';

const MIN_CHARS = 20;
const MAX_CHARS = 500;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function IntakePage() {
  const router = useRouter();
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [ideaText, setIdeaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pid = new URLSearchParams(window.location.search).get('portfolio');
    if (!pid) {
      router.replace('/dashboard');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortfolioId(pid);
  }, [router]);

  function reset() {
    setError(null);
    setDeclineReason(null);
    setIdeaText('');
  }

  async function handleSubmit() {
    setError(null);
    setDeclineReason(null);
    if (!portfolioId) return;
    if (ideaText.trim().length < MIN_CHARS) {
      setError(`Please describe your idea in at least ${MIN_CHARS} characters.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaText: ideaText.trim(), portfolioId }),
      });
      const body = (await res.json()) as CreateProjectResponse | { error: string };
      if (!res.ok) {
        setError((body as { error: string }).error ?? 'Something went wrong. Please try again.');
        return;
      }
      const data = body as CreateProjectResponse;
      if (data.verdict === 'decline') {
        setDeclineReason(data.reason);
        return;
      }
      router.push(`/projects/${data.projectId}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const charCount = ideaText.length;
  const isAtMin = charCount >= MIN_CHARS;
  const isOverMax = charCount > MAX_CHARS;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Wordmark />
          </Link>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            ← Dashboard
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-foreground">What&apos;s your idea?</h1>
          <p className="mb-6 text-sm text-foreground-muted">
            Describe your product idea in a few sentences. Our AI will evaluate whether it can be built as a
            software MVP, then shape it with you.
          </p>

          <div className="space-y-4">
            <div>
              <Field label="Describe your idea">
                <Textarea
                  value={ideaText}
                  onChange={setIdeaText}
                  placeholder="Describe your product idea in a few sentences..."
                  minLength={MIN_CHARS}
                  maxLength={MAX_CHARS}
                  rows={6}
                  disabled={loading}
                />
              </Field>
              <div className="mt-1 flex justify-end">
                <span
                  aria-live="polite"
                  className={[
                    'text-xs',
                    isOverMax
                      ? 'text-[var(--color-danger-fg)]'
                      : !isAtMin
                      ? 'text-foreground-muted'
                      : 'text-[var(--color-success-fg)]',
                  ].join(' ')}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>

            {declineReason && (
              <div>
                <Notice tone="warning">
                  Not a fit for a software MVP right now — here&apos;s why: {declineReason}
                </Notice>
                <button
                  onClick={reset}
                  className="mt-2 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Try a different idea
                </button>
              </div>
            )}

            {error && (
              <div>
                <ErrorBanner message={error} />
                <button
                  onClick={reset}
                  className="mt-2 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Try a different idea
                </button>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || !isAtMin || isOverMax || !portfolioId}
              className="w-full py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Analysing your idea…
                </span>
              ) : (
                'Submit Idea'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
