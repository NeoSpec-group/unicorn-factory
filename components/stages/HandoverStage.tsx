'use client';

import { useState } from 'react';
import type { ProjectResponse, RealityStatus, FinishRequest } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Notice from '@/components/Notice';
import DeliverableCard from '@/components/DeliverableCard';

interface StageProps {
  project: ProjectResponse;
  reload: () => void | Promise<void>;
}

const REALITY_STYLES: Record<RealityStatus, string> = {
  real: 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)]',
  limited: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)]',
  mocked: 'bg-surface-muted text-foreground-muted',
  excluded: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-fg)]',
};

export default function HandoverStage({ project, reload }: StageProps) {
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deliverables = project.outputs?.deliverables ?? null;

  async function finish(choice: FinishRequest['choice']) {
    setFinishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice } satisfies FinishRequest),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Could not complete handover.');
        return;
      }
      await reload();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Handover</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Your MVP, the keys to it, and an honest map of what&apos;s real.
        </p>
      </div>

      <ErrorBanner message={error} />

      {project.status === 'handover' && (
        <Card className="mb-6 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Make it yours</h2>
          <p className="text-sm text-foreground-muted">
            Take full ownership — we transfer the code, app, database, keys, and IP to your accounts — or
            have us keep running and growing it for you.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={() => finish('launch')} disabled={finishing} className="py-2.5">
              {finishing ? 'Working…' : 'Take full ownership'}
            </Button>
            <Button variant="secondary" onClick={() => finish('managed')} disabled={finishing} className="py-2.5">
              Have us run it (managed)
            </Button>
          </div>
        </Card>
      )}

      {project.status === 'launched' && (
        <div className="mb-6">
          <Notice tone="success" className="text-center">
            It&apos;s all yours. Everything below has been transferred to your accounts.
          </Notice>
        </div>
      )}
      {project.status === 'managed' && (
        <div className="mb-6">
          <Notice tone="info" className="text-center">
            We&apos;re running it for you. Your handover package is below for full transparency.
          </Notice>
        </div>
      )}

      {!deliverables ? (
        <Card>
          <p className="text-sm text-foreground-muted">
            Your handover package will appear here once your build is delivered.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {project.stagingUrl && <DeliverableCard title="Live app" type="link" content={project.stagingUrl} />}
            {project.repoUrl && <DeliverableCard title="Code repository" type="link" content={project.repoUrl} />}
          </div>

          {deliverables.handoverDoc && (
            <DeliverableCard title="Handover guide" type="markdown" content={deliverables.handoverDoc} />
          )}

          {deliverables.realityMap.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-base font-semibold text-foreground">Reality Map</h2>
                <p className="text-xs text-foreground-muted">What&apos;s real, limited, mocked, or excluded.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-surface-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        Feature
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {deliverables.realityMap.map((entry, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 font-medium text-foreground">{entry.feature}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${REALITY_STYLES[entry.status]}`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-foreground-muted">{entry.note}</td>
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
  );
}
