'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectResponse, EstimateView } from '@/types';
import { TIER_BANDS } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import JourneyTracker from '@/components/JourneyTracker';

function money(n: number | null): string {
  return n === null ? '—' : `$${n.toLocaleString()}`;
}

export default function CommissionPage() {
  const router = useRouter();
  const [estimate, setEstimate] = useState<EstimateView | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      const projectId = sessionStorage.getItem('uf_project_id');
      if (!projectId) {
        router.push('/intake');
        return;
      }
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          setError(body.error ?? 'Failed to load your request.');
          return;
        }
        const data = (await res.json()) as ProjectResponse;
        setStatus(data.status);
        setEstimate(data.estimate);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCommission() {
    const projectId = sessionStorage.getItem('uf_project_id');
    if (!projectId) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/commission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to submit build request. Please try again.');
        return;
      }
      router.push('/status');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const band = estimate?.tier ? TIER_BANDS[estimate.tier] : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">Unicorn Factory</Link>
        </div>

        <JourneyTracker status="blueprint_ready" activeStageIndex={3} className="mb-10" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Commission the build</h1>
          <p className="mt-1 text-sm text-gray-500">
            Request your MVP build. Nothing is charged yet — we review first.
          </p>
        </div>

        <ErrorBanner message={error} />

        {status !== 'blueprint_ready' ? (
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-6 py-4 text-sm text-indigo-800 font-medium text-center">
            This build is already in progress.{' '}
            <button onClick={() => router.push('/status')} className="underline">
              View status
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Estimated {band ? band.label : ''} build
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {money(estimate?.low ?? null)}
                <span className="text-gray-400"> – </span>
                {money(estimate?.high ?? null)}
              </p>
              <p className="text-xs text-gray-500">Cash. A firm price is set at Green-Light before you pay.</p>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">What happens next</h2>
              <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                <li><strong>Green-Light</strong> — we review scope &amp; feasibility and set your firm price.</li>
                <li><strong>Ignition</strong> — you pay the firm price; the 72-hour clock starts.</li>
                <li><strong>The Forge</strong> — we build your MVP.</li>
                <li><strong>Proving Ground → Handover</strong> — you test-drive it, then it&apos;s yours.</li>
              </ol>
            </Card>

            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <span>
                I understand this submits my build request for review. I&apos;m not charged until I approve
                the firm price at Ignition.
              </span>
            </label>

            <Button
              variant="primary"
              onClick={handleCommission}
              disabled={submitting || !agreed}
              className="w-full py-3"
            >
              {submitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <Spinner size="sm" />
                  Submitting…
                </span>
              ) : (
                'Submit build request'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
