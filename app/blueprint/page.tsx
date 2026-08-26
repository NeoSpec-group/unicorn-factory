'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectResponse, BlueprintOutputs, EstimateView } from '@/types';
import { TIER_BANDS } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import JourneyTracker from '@/components/JourneyTracker';

function money(n: number | null): string {
  return n === null ? '—' : `$${n.toLocaleString()}`;
}

export default function BlueprintPage() {
  const router = useRouter();
  const [blueprint, setBlueprint] = useState<BlueprintOutputs | null>(null);
  const [estimate, setEstimate] = useState<EstimateView | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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
          setError(body.error ?? 'Failed to load your Blueprint.');
          return;
        }
        const data = (await res.json()) as ProjectResponse;
        setStatus(data.status);
        setEstimate(data.estimate);
        if (data.outputs?.blueprint) setBlueprint(data.outputs.blueprint);
      } catch {
        setError('Network error loading your Blueprint.');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(path: 'commission' | 'park', onOk: () => void) {
    const projectId = sessionStorage.getItem('uf_project_id');
    if (!projectId) return;
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Something went wrong. Please try again.');
        return;
      }
      onOk();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  function downloadBlueprint() {
    if (!blueprint || !estimate) return;
    const band = estimate.tier ? TIER_BANDS[estimate.tier] : null;
    const lines = [
      '# Your Blueprint — Unicorn Factory',
      '',
      '## Refined idea',
      blueprint.refinedIdea,
      '',
      '## Roadmap',
      ...blueprint.roadmap.map((r) => `- **${r.title}** — ${r.detail}`),
      '',
      '## Estimate',
      `- Tier: ${band?.label ?? '—'}`,
      `- Estimated range: ${money(estimate.low)}–${money(estimate.high)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blueprint.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-gray-500">Loading your Blueprint…</p>
        </div>
      </div>
    );
  }

  const band = estimate?.tier ? TIER_BANDS[estimate.tier] : null;
  const alreadyMoved = status !== 'blueprint_ready';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">Unicorn Factory</Link>
        </div>

        <JourneyTracker status="blueprint_ready" className="mb-10" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Blueprint</h1>
          <p className="mt-1 text-sm text-gray-500">
            A validated shape of your idea, a build roadmap, and an estimate — free.
          </p>
        </div>

        <ErrorBanner message={error} />

        <div className="space-y-6 mt-4">
          {blueprint && (
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Refined idea</h2>
              <MarkdownRenderer content={blueprint.refinedIdea} />
            </Card>
          )}

          {blueprint && blueprint.roadmap.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Roadmap</h2>
              <ol className="space-y-3">
                {blueprint.roadmap.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {estimate && (
            <Card className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-gray-900">Estimate</h2>
                {band && <Badge label={band.label} variant="neutral" />}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {money(estimate.low)}
                <span className="text-gray-400"> – </span>
                {money(estimate.high)}
              </p>
              <p className="text-xs text-gray-500">
                A range, not a bill. We confirm a firm price at the internal Green-Light review before
                you pay anything.
              </p>
            </Card>
          )}

          {alreadyMoved ? (
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-6 py-4 text-sm text-indigo-800 font-medium text-center">
              You&apos;ve already moved this Blueprint forward.{' '}
              <button onClick={() => router.push('/status')} className="underline">
                View status
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  onClick={() => router.push('/commission')}
                  disabled={actionLoading}
                  className="flex-1 py-3"
                >
                  Commission the build
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => act('park', () => router.push('/status'))}
                  disabled={actionLoading}
                  className="flex-1 py-3"
                >
                  Park for now
                </Button>
              </div>
              <button
                onClick={downloadBlueprint}
                className="text-xs text-indigo-600 hover:underline self-center"
              >
                Download this Blueprint (free)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
