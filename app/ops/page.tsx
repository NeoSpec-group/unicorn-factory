'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { OpsProjectSummary, OpsProjectsResponse, RealityMapEntry, RealityStatus } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';

function money(n: number | null): string {
  return n === null ? '—' : `$${n.toLocaleString()}`;
}

export default function OpsPage() {
  const [projects, setProjects] = useState<OpsProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/projects');
      if (res.status === 401 || res.status === 403) {
        setAuthorized(false);
        return;
      }
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to load queue.');
        return;
      }
      const data = (await res.json()) as OpsProjectsResponse;
      setAuthorized(true);
      setProjects(data.projects);
    } catch {
      setError('Network error loading queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial queue load on mount; state is set after the async fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function runAction(id: string, payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/ops/projects/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? 'Action failed.');
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">Ops access required</h1>
        <p className="text-sm text-gray-500">Your account doesn&apos;t have the ops role.</p>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Ops console</h1>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            Home
          </Link>
        </div>

        <ErrorBanner message={error} />

        {projects.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-600">The queue is empty. Nothing needs ops attention.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <OpsCard key={p.id} project={p} onAction={runAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OpsCard({
  project,
  onAction,
}: {
  project: OpsProjectSummary;
  onAction: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [firmPrice, setFirmPrice] = useState(
    project.estimateHigh ? String(project.estimateHigh) : '',
  );
  const [repoUrl, setRepoUrl] = useState('');
  const [stagingUrl, setStagingUrl] = useState('');
  const [handoverDoc, setHandoverDoc] = useState('');
  const [realityMap, setRealityMap] = useState<RealityMapEntry[]>([
    { feature: '', status: 'real', note: '' },
  ]);

  async function run(payload: Record<string, unknown>) {
    setBusy(true);
    await onAction(project.id, payload);
    setBusy(false);
  }

  function updateRow(i: number, patch: Partial<RealityMapEntry>) {
    setRealityMap((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-mono text-gray-400">{project.id.slice(0, 8)}</p>
          <p className="text-sm text-gray-800 line-clamp-2">{project.ideaText}</p>
          <p className="mt-1 text-xs text-gray-500">
            {project.tier ?? '—'} · est {money(project.estimateLow)}–{money(project.estimateHigh)}
            {project.firmPrice !== null && <> · firm {money(project.firmPrice)}</>}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          {project.status}
        </span>
      </div>

      {project.status === 'commissioned' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input value={firmPrice} onChange={setFirmPrice} placeholder="Firm price (USD)" type="number" />
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={busy || !firmPrice}
              onClick={() => run({ action: 'approve', firmPrice: Number(firmPrice) })}
              className="py-2"
            >
              Approve
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => run({ action: 'decline' })} className="py-2">
              Decline
            </Button>
          </div>
        </div>
      )}

      {project.status === 'approved' && (
        <p className="text-sm text-gray-500">Awaiting payment ({money(project.firmPrice)}).</p>
      )}

      {project.status === 'paid' && (
        <Button variant="primary" disabled={busy} onClick={() => run({ action: 'forge' })} className="py-2">
          Start The Forge
        </Button>
      )}

      {project.status === 'building' && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <Input value={repoUrl} onChange={setRepoUrl} placeholder="Repo URL (their GitHub)" />
          <Input value={stagingUrl} onChange={setStagingUrl} placeholder="Staging URL (required)" />
          <Textarea
            value={handoverDoc}
            onChange={setHandoverDoc}
            placeholder="Handover guide (Markdown)"
            rows={3}
          />
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Reality Map</p>
            {realityMap.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={row.feature}
                  onChange={(e) => updateRow(i, { feature: e.target.value })}
                  placeholder="Feature"
                />
                <select
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={row.status}
                  onChange={(e) => updateRow(i, { status: e.target.value as RealityStatus })}
                >
                  <option value="real">real</option>
                  <option value="limited">limited</option>
                  <option value="mocked">mocked</option>
                  <option value="excluded">excluded</option>
                </select>
                <input
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={row.note}
                  onChange={(e) => updateRow(i, { note: e.target.value })}
                  placeholder="Note"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRealityMap((prev) => [...prev, { feature: '', status: 'real', note: '' }])}
              className="text-xs text-indigo-600 hover:underline"
            >
              + Add row
            </button>
          </div>
          <Button
            variant="primary"
            disabled={busy || !stagingUrl}
            onClick={() =>
              run({
                action: 'deliver',
                repoUrl,
                stagingUrl,
                handoverDoc,
                realityMap: realityMap.filter((r) => r.feature.trim()),
              })
            }
            className="py-2"
          >
            Mark delivered
          </Button>
        </div>
      )}

      {project.status === 'uat' && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500">
            In Proving Ground with the founder.{' '}
            {project.stagingUrl && (
              <a href={project.stagingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                staging ↗
              </a>
            )}
          </p>
          {project.issueNote && (
            <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              <span className="font-semibold">Reported issue:</span> {project.issueNote}
            </div>
          )}
          <Button variant="secondary" disabled={busy} onClick={() => run({ action: 'reforge' })} className="py-2">
            Re-forge (revision)
          </Button>
        </div>
      )}

      {project.status === 'handover' && (
        <p className="text-sm text-gray-500">With the founder (handover — awaiting their choice).</p>
      )}
    </Card>
  );
}
