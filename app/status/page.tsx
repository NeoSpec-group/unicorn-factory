'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectResponse, ProjectStatus, CheckoutResponse } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import JourneyTracker from '@/components/JourneyTracker';

function money(n: number | null): string {
  return n === null ? '—' : `$${n.toLocaleString()}`;
}

export default function StatusPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // One-shot read of the Stripe redirect flag after mount (avoids SSR mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustPaid(new URLSearchParams(window.location.search).get('paid') === '1');
    }
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
          setError(body.error ?? 'Failed to load your project.');
          return;
        }
        setProject((await res.json()) as ProjectResponse);
      } catch {
        setError('Network error loading your project.');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay() {
    const projectId = sessionStorage.getItem('uf_project_id');
    if (!projectId) return;
    setError(null);
    setPaying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Could not start checkout. Please try again.');
        setPaying(false);
        return;
      }
      const data = (await res.json()) as CheckoutResponse;
      window.location.href = data.url; // redirect to Stripe Checkout
    } catch {
      setError('Network error. Please try again.');
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">Unicorn Factory</Link>
        </div>

        {justPaid && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-6 py-4 text-sm text-green-800 font-medium text-center">
            Payment received — igniting your build. Your 72-hour clock is starting.
          </div>
        )}

        <ErrorBanner message={error} />

        {project && (
          <>
            <JourneyTracker status={project.status} className="mb-10" />
            <Card>
              <Panel
                project={project}
                paying={paying}
                onPay={handlePay}
                onGoto={(r) => router.push(r)}
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Panel({
  project,
  paying,
  onPay,
  onGoto,
}: {
  project: ProjectResponse;
  paying: boolean;
  onPay: () => void;
  onGoto: (route: string) => void;
}) {
  const s: ProjectStatus = project.status;

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
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">{heading[s]}</h1>

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
          <Button variant="primary" onClick={onPay} disabled={paying} className="py-2.5">
            {paying ? 'Starting checkout…' : `Pay ${money(project.estimate.firmPrice)} & ignite`}
          </Button>
        </div>
      )}

      {s === 'declined' && (
        <p className="text-sm text-gray-600">
          We couldn&apos;t take this build on right now. Your Blueprint stays yours — you can revisit or
          refine the idea anytime.
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
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Your MVP is ready to test-drive. Try it, then accept to move to Handover.
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
            <Button variant="primary" disabled className="py-2.5">
              Accept &amp; continue (coming in Proving Ground)
            </Button>
          </div>
        </div>
      )}

      {s === 'parked' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Parked. Your Blueprint is saved — pick it back up whenever you&apos;re ready.
          </p>
          <Button variant="secondary" onClick={() => onGoto('/blueprint')} className="py-2.5">
            Back to Blueprint
          </Button>
        </div>
      )}

      {(s === 'handover' || s === 'launched' || s === 'managed') && (
        <Button variant="primary" onClick={() => onGoto('/handover')} className="py-2.5">
          View handover
        </Button>
      )}

      {(s === 'intake' || s === 'blueprint_ready') && (
        <Button
          variant="primary"
          onClick={() => onGoto(s === 'intake' ? '/workshop' : '/blueprint')}
          className="py-2.5"
        >
          Continue
        </Button>
      )}
    </div>
  );
}
