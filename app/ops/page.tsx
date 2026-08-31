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
import StageChip from '@/components/StageChip';
import Notice from '@/components/Notice';
import { Wordmark } from '@/lib/brand';

function money(n: number | null): string {
  return n === null ? '—' : `$${n.toLocaleString()}`;
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary';
const focusVisibleLink =
  'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function OpsPage() {
  const [projects, setProjects] = useState<OpsProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/projects');
      if (res.status === 401 || res.status === 403) {
        setAuthorized(false);
        return;
      }
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setQueueError(body.error ?? 'Failed to load queue.');
        return;
      }
      const data = (await res.json()) as OpsProjectsResponse;
      setAuthorized(true);
      setProjects(data.projects);
    } catch {
      setQueueError('Network error loading queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial queue load on mount; state is set after the async fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // ux-spec.md §4.6 Refine: surface action failures per card, next to the
  // action that failed, instead of one shared top-level banner — an
  // operator working several cards at once needs to know which one failed.
  async function runAction(id: string, payload: Record<string, unknown>) {
    setActionErrors((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await fetch(`/api/ops/projects/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setActionErrors((prev) => ({ ...prev, [id]: body.error ?? 'Action failed.' }));
        return;
      }
      await load();
    } catch {
      setActionErrors((prev) => ({ ...prev, [id]: 'Network error. Please try again.' }));
    }
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
        <Wordmark className="text-lg" />
        <h1 className="text-xl font-bold text-foreground">Ops access required</h1>
        <p className="text-sm text-foreground-muted">Your account doesn&apos;t have the ops role.</p>
        <Link href="/" className={`text-sm text-primary hover:underline ${focusVisibleLink}`}>
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Wordmark className="shrink-0 text-lg" />
            <h1 className="truncate text-2xl font-bold">Ops console</h1>
          </div>
          <Link href="/" className={`shrink-0 text-sm text-primary hover:underline ${focusVisibleLink}`}>
            Home
          </Link>
        </header>

        <div className="mb-4">
          <ErrorBanner message={queueError} />
        </div>

        {projects.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground-muted">The queue is empty. Nothing needs ops attention.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <OpsCard key={p.id} project={p} error={actionErrors[p.id] ?? null} onAction={runAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OpsCard({
  project,
  error,
  onAction,
}: {
  project: OpsProjectSummary;
  error: string | null;
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
          <p className="font-mono text-xs text-foreground-muted">{project.id.slice(0, 8)}</p>
          <p className="line-clamp-2 text-sm text-foreground">{project.ideaText}</p>
          <p className="mt-1 text-xs text-foreground-muted">
            {project.tier ?? '—'} · est {money(project.estimateLow)}–{money(project.estimateHigh)}
            {project.firmPrice !== null && <> · firm {money(project.firmPrice)}</>}
          </p>
        </div>
        <StageChip status={project.status} />
      </div>

      {project.status === 'commissioned' && (
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-foreground">Firm price (USD)</span>
            <Input value={firmPrice} onChange={setFirmPrice} placeholder="e.g. 4500" type="number" />
          </label>
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={busy || !firmPrice}
              onClick={() => run({ action: 'approve', firmPrice: Number(firmPrice) })}
            >
              Approve
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => run({ action: 'decline' })}>
              Decline
            </Button>
          </div>
        </div>
      )}

      {project.status === 'approved' && (
        <p className="border-t border-border pt-3 text-sm text-foreground-muted">
          Awaiting payment ({money(project.firmPrice)}).
        </p>
      )}

      {project.status === 'paid' && (
        <div className="border-t border-border pt-3">
          <Button variant="primary" disabled={busy} onClick={() => run({ action: 'forge' })}>
            Start The Forge
          </Button>
        </div>
      )}

      {project.status === 'building' && (
        <div className="space-y-3 border-t border-border pt-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Repo URL (their GitHub)</span>
            <Input value={repoUrl} onChange={setRepoUrl} placeholder="https://github.com/…" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Staging URL (required)</span>
            <Input value={stagingUrl} onChange={setStagingUrl} placeholder="https://…" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Handover guide (Markdown)</span>
            <Textarea
              value={handoverDoc}
              onChange={setHandoverDoc}
              placeholder="What's real, what's mocked, how to run it…"
              rows={3}
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground-muted">Reality Map</p>
            <div className="space-y-2 overflow-x-auto">
              {realityMap.map((row, i) => (
                <div key={i} className="flex min-w-[420px] gap-2 sm:min-w-0">
                  <input
                    className={`flex-1 rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-foreground ${focusRing}`}
                    value={row.feature}
                    onChange={(e) => updateRow(i, { feature: e.target.value })}
                    placeholder="Feature"
                    aria-label={`Reality Map feature, row ${i + 1}`}
                  />
                  <select
                    className={`rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-foreground ${focusRing}`}
                    value={row.status}
                    onChange={(e) => updateRow(i, { status: e.target.value as RealityStatus })}
                    aria-label={`Reality Map status, row ${i + 1}`}
                  >
                    <option value="real">real</option>
                    <option value="limited">limited</option>
                    <option value="mocked">mocked</option>
                    <option value="excluded">excluded</option>
                  </select>
                  <input
                    className={`flex-1 rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-foreground ${focusRing}`}
                    value={row.note}
                    onChange={(e) => updateRow(i, { note: e.target.value })}
                    placeholder="Note"
                    aria-label={`Reality Map note, row ${i + 1}`}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRealityMap((prev) => [...prev, { feature: '', status: 'real', note: '' }])}
              className={`text-xs text-primary hover:underline ${focusVisibleLink}`}
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
          >
            Mark delivered
          </Button>
        </div>
      )}

      {project.status === 'uat' && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm text-foreground-muted">
            In Proving Ground with the founder.{' '}
            {project.stagingUrl && (
              <a
                href={project.stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open staging build in a new tab"
                className={`text-primary hover:underline ${focusVisibleLink}`}
              >
                staging ↗
              </a>
            )}
          </p>
          {project.issueNote && (
            <Notice tone="warning">
              <span className="font-semibold">Reported issue: </span>
              {project.issueNote}
            </Notice>
          )}
          <Button variant="secondary" disabled={busy} onClick={() => run({ action: 'reforge' })}>
            Re-forge (revision)
          </Button>
        </div>
      )}

      {project.status === 'handover' && (
        <p className="border-t border-border pt-3 text-sm text-foreground-muted">
          With the founder (handover — awaiting their choice).
        </p>
      )}

      <ErrorBanner message={error} />
    </Card>
  );
}
