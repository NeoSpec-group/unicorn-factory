'use client';

import { useState } from 'react';
import type { ProjectResponse, ProjectStatus, CheckoutResponse } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Notice from '@/components/Notice';

interface StageProps {
  project: ProjectResponse;
  reload: () => void | Promise<void>;
}

function money(n: number | null): string {
  return n === null ? '—' : `$${n.toLocaleString()}`;
}

export default function JourneyStage({ project, reload }: StageProps) {
  const s: ProjectStatus = project.status;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Could not start checkout.');
        setBusy(false);
        return;
      }
      const data = (await res.json()) as CheckoutResponse;
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  }

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Could not accept right now.');
        return;
      }
      await reload();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/report-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Could not report the issue.');
        return;
      }
      setReported(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const heading: Record<ProjectStatus, string> = {
    intake: 'The Workshop',
    blueprint_ready: 'Your Blueprint is ready',
    commissioned: 'In review — Green-Light',
    approved: 'Approved — ready for Ignition',
    declined: 'Not a fit right now',
    paid: 'Ignition — your clock has started',
    building: 'In The Forge',
    uat: 'Proving Ground',
    handover: 'Handover',
    launched: 'Launched',
    managed: 'Managed by us',
    parked: 'Parked',
  };

  return (
    <Card>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">{heading[s]}</h1>
        <ErrorBanner message={error} />

        {s === 'commissioned' && (
          <p className="text-sm text-foreground-muted">
            We&apos;re validating your scope, feasibility, and price. You&apos;ll get a firm quote at
            Green-Light before anything is charged.
          </p>
        )}

        {s === 'approved' && (
          <div className="space-y-3">
            <p className="text-sm text-foreground-muted">
              Approved. Your firm price is{' '}
              <strong className="text-foreground">{money(project.estimate.firmPrice)}</strong>. Pay to
              start the 72-hour clock — nothing else to decide.
            </p>
            <Button variant="primary" onClick={pay} disabled={busy} className="py-2.5">
              {busy ? 'Starting checkout…' : `Pay ${money(project.estimate.firmPrice)} & ignite`}
            </Button>
          </div>
        )}

        {s === 'declined' && (
          <p className="text-sm text-foreground-muted">
            We couldn&apos;t take this build on right now. Your Blueprint stays yours — you can refine the
            idea and try again anytime.
          </p>
        )}

        {s === 'paid' && (
          <Notice tone="success">
            Payment received — igniting your build. Your 72-hour clock is
            {project.paidAt ? ` starting (paid ${new Date(project.paidAt).toLocaleString()}).` : ' starting.'}
            {' '}We&apos;ll begin building shortly.
          </Notice>
        )}

        {s === 'building' && (
          <p className="text-sm text-foreground-muted">
            Our factory is building your MVP. You&apos;ll be able to test-drive it at Proving Ground when
            it&apos;s ready.
          </p>
        )}

        {s === 'uat' && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Your MVP is ready to test-drive. Try it, then accept to move to Handover — or report an issue
              and we&apos;ll fix it (defects-only revision round).
            </p>
            {project.stagingUrl && (
              <a
                href={project.stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded font-mono text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open your MVP ↗
              </a>
            )}
            <div>
              <Button variant="primary" onClick={accept} disabled={busy} className="py-2.5">
                {busy ? 'Working…' : 'Accept & continue'}
              </Button>
            </div>
            <div className="border-t border-border pt-3">
              {reported ? (
                <Notice tone="success">Thanks — we&apos;ve logged the issue and will get on it.</Notice>
              ) : (
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-foreground-muted">
                      Something not right? Report an issue.
                    </span>
                    <Textarea value={note} onChange={setNote} placeholder="Describe what's wrong…" rows={3} />
                  </label>
                  <Button variant="secondary" onClick={report} disabled={busy || !note.trim()} className="py-2">
                    Report issue
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {s === 'parked' && (
          <p className="text-sm text-foreground-muted">Parked. Your Blueprint is saved — this idea is on hold.</p>
        )}
      </div>
    </Card>
  );
}
