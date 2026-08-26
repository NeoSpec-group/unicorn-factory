'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectResponse, DeliverableOutputs, RealityStatus } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import DeliverableCard from '@/components/DeliverableCard';
import JourneyTracker from '@/components/JourneyTracker';
import type { FinishRequest } from '@/types';

const REALITY_STYLES: Record<RealityStatus, string> = {
  real: 'bg-green-100 text-green-800',
  limited: 'bg-yellow-100 text-yellow-800',
  mocked: 'bg-gray-100 text-gray-700',
  excluded: 'bg-red-100 text-red-700',
};

export default function HandoverPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [deliverables, setDeliverables] = useState<DeliverableOutputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(choice: FinishRequest['choice']) {
    if (!project) return;
    setFinishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice } satisfies FinishRequest),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Could not complete handover. Please try again.');
        return;
      }
      setProject({ ...project, status: choice === 'launch' ? 'launched' : 'managed' });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setFinishing(false);
    }
  }

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
          setError(body.error ?? 'Failed to load your handover.');
          return;
        }
        const data = (await res.json()) as ProjectResponse;
        setProject(data);
        if (data.outputs?.deliverables) setDeliverables(data.outputs.deliverables);
      } catch {
        setError('Network error loading your handover.');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">Unicorn Factory</Link>
        </div>

        {project && <JourneyTracker status={project.status} className="mb-10" />}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Handover</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your MVP, the keys to it, and an honest map of what&apos;s real.
          </p>
        </div>

        <ErrorBanner message={error} />

        {project?.status === 'handover' && (
          <Card className="mb-6 space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Make it yours</h2>
            <p className="text-sm text-gray-600">
              Take full ownership — we transfer the code, app, database, keys, and IP to your accounts —
              or have us keep running and growing it for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="primary" onClick={() => finish('launch')} disabled={finishing} className="py-2.5">
                {finishing ? 'Working…' : 'Take full ownership'}
              </Button>
              <Button variant="secondary" onClick={() => finish('managed')} disabled={finishing} className="py-2.5">
                Have us run it (managed)
              </Button>
            </div>
          </Card>
        )}

        {project?.status === 'launched' && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-6 py-4 text-sm text-green-800 font-medium text-center">
            🎉 It&apos;s all yours. Everything below has been transferred to your accounts.
          </div>
        )}
        {project?.status === 'managed' && (
          <div className="mb-6 rounded-lg bg-indigo-50 border border-indigo-200 px-6 py-4 text-sm text-indigo-800 font-medium text-center">
            We&apos;re running it for you. Your handover package is below for full transparency.
          </div>
        )}

        {!deliverables ? (
          <Card>
            <p className="text-sm text-gray-600">
              Your handover package will appear here once your build is delivered and accepted.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Live app + repo */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {project?.stagingUrl && (
                <DeliverableCard title="Live app" type="link" content={project.stagingUrl} />
              )}
              {project?.repoUrl && (
                <DeliverableCard title="Code repository" type="link" content={project.repoUrl} />
              )}
            </div>

            {/* Plain-language handover doc */}
            {deliverables.handoverDoc && (
              <DeliverableCard title="Handover guide" type="markdown" content={deliverables.handoverDoc} />
            )}

            {/* Reality Map */}
            {deliverables.realityMap.length > 0 && (
              <Card className="p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900">Reality Map</h2>
                  <p className="text-xs text-gray-500">What&apos;s real, limited, mocked, or excluded.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Feature</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {deliverables.realityMap.map((entry, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 font-medium text-gray-900">{entry.feature}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${REALITY_STYLES[entry.status]}`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{entry.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
