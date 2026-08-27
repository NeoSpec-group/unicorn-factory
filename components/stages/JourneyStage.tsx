'use client';

import { useState, useEffect } from 'react';
import type { ProjectResponse, ProjectStatus, CheckoutResponse } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import ErrorBanner from '@/components/ui/ErrorBanner';

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
  const [justPaid, setJustPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustPaid(new URLSearchParams(window.location.search).get('paid') === '1');
    }
  }, []);

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
        const body = (await res.json()) as { error?: string };
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
    const res = await fetch(`/api/projects/${project.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (res.ok) await reload();
  }

  async function report() {
    if (!note.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${project.id}/report-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setBusy(false);
    if (res.ok) setReported(true);
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
        {justPaid && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium">
            Payment received — igniting your build. Your 72-hour clock is starting.
          </div>
        )}
        <h1 className="text-xl font-bold text-gray-900">{heading[s]}</h1>
        <ErrorBanner message={error} />

        {s === 'commissioned' && (
          <p className="text-sm text-gray-600">
            We&apos;re validating your scope, feasibility, and price. You&apos;ll get a firm quote at
            Green-Light before anything is charged.
          </p>
        )}

        {s === 'approved' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Approved. Your firm price is{' '}
              <strong className="text-gray-900">{money(project.estimate.firmPrice)}</strong>. Pay to start
              the 72-hour clock.
            </p>
            <Button variant="primary" onClick={pay} disabled={busy} className="py-2.5">
              {busy ? 'Starting checkout…' : `Pay ${money(project.estimate.firmPrice)} & ignite`}
            </Button>
          </div>
        )}

        {s === 'declined' && (
          <p className="text-sm text-gray-600">
            We couldn&apos;t take this build on right now. Your Blueprint stays yours — you can refine the
            idea and try again anytime.
          </p>
        )}

        {s === 'paid' && (
          <p className="text-sm text-gray-600">
            Payment confirmed{project.paidAt ? ` at ${new Date(project.paidAt).toLocaleString()}` : ''}.
            The 72-hour clock is running — we&apos;ll begin building shortly.
          </p>
        )}

        {s === 'building' && (
          <p className="text-sm text-gray-600">
            Our factory is building your MVP. You&apos;ll be able to test-drive it at Proving Ground when
            it&apos;s ready.
          </p>
        )}

        {s === 'uat' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your MVP is ready to test-drive. Try it, then accept to move to Handover — or report an issue
              and we&apos;ll fix it (defects-only revision round).
            </p>
            {project.stagingUrl && (
              <a
                href={project.stagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-indigo-600 hover:underline"
              >
                Open your MVP ↗
              </a>
            )}
            <div>
              <Button variant="primary" onClick={accept} disabled={busy} className="py-2.5">
                {busy ? 'Working…' : 'Accept & continue'}
              </Button>
            </div>
            <div className="border-t border-gray-100 pt-3">
              {reported ? (
                <p className="text-sm text-green-700 font-medium">
                  Thanks — we&apos;ve logged the issue and will get on it.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Something not right? Report an issue.</p>
                  <Textarea value={note} onChange={setNote} placeholder="Describe what's wrong…" rows={3} />
                  <Button variant="secondary" onClick={report} disabled={busy || !note.trim()} className="py-2">
                    Report issue
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {s === 'parked' && (
          <p className="text-sm text-gray-600">
            Parked. Your Blueprint is saved — this idea is on hold.
          </p>
        )}
      </div>
    </Card>
  );
}
