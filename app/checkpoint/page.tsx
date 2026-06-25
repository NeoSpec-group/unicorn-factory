'use client';

// MOCK: Replace pain_point_signal, competitor_map, and recommendation with real research agent output.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectResponse, ResearchOutputs } from '@/types';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import CompetitorTable from '@/components/CompetitorTable';

export default function CheckpointPage() {
  const router = useRouter();
  const [research, setResearch] = useState<ResearchOutputs | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      const projectId = sessionStorage.getItem('uf_project_id');
      if (!projectId) {
        router.push('/idea');
        return;
      }
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          const body = await res.json() as { error?: string };
          setError(body.error ?? 'Failed to load research results.');
          setLoading(false);
          return;
        }
        const data = (await res.json()) as ProjectResponse;
        setProjectStatus(data.status);
        if (data.outputs?.research) {
          setResearch(data.outputs.research);
        }
      } catch {
        setError('Network error loading checkpoint data.');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleProceed() {
    const projectId = sessionStorage.getItem('uf_project_id');
    if (!projectId) return;
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/proceed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Failed to proceed. Please try again.');
        return;
      }
      router.push('/build');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStop() {
    const projectId = sessionStorage.getItem('uf_project_id');
    if (!projectId) return;
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Failed to stop project. Please try again.');
        return;
      }
      setProjectStatus('stopped');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-gray-500">Loading research results…</p>
        </div>
      </div>
    );
  }

  const isStopped = projectStatus === 'stopped';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <a href="/" className="text-xl font-bold text-indigo-600">
            Unicorn Factory
          </a>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Research Complete — Your Checkpoint
        </h1>

        <ErrorBanner message={error} />

        <div className="space-y-6 mt-4">
          {/* Pain Point Signal */}
          {research?.painPointSignal && (
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Pain Point Signal
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                {research.painPointSignal}
              </p>
            </Card>
          )}

          {/* Competitor Map */}
          {research?.competitorMap && research.competitorMap.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Competitor Map</h2>
              <CompetitorTable competitors={research.competitorMap} />
            </div>
          )}

          {/* Recommendation */}
          {research?.recommendation && (
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Go/No-Go Recommendation
              </h2>
              <div className="flex items-start gap-4">
                <Badge
                  label={research.recommendation.verdict}
                  variant={
                    research.recommendation.verdict === 'GO' ? 'success' : 'danger'
                  }
                />
                <p className="text-sm text-gray-700 leading-relaxed flex-1">
                  {research.recommendation.rationale}
                </p>
              </div>
            </Card>
          )}

          {/* Actions */}
          {isStopped ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-6 py-4 text-sm text-amber-800 font-medium text-center">
              Project stopped. Your research report is saved.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleProceed}
                disabled={actionLoading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 focus:ring-green-500"
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Spinner size="sm" />
                    Processing…
                  </span>
                ) : (
                  'Proceed to Build'
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleStop}
                disabled={actionLoading}
                className="flex-1 py-3"
              >
                Stop Here
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
