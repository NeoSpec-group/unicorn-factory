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

  async function downloadBlueprint() {
    if (!blueprint || !estimate) return;
    const { jsPDF } = await import('jspdf');
    const band = estimate.tier ? TIER_BANDS[estimate.tier] : null;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const width = pageW - margin * 2;
    let y = margin;

    const INDIGO: [number, number, number] = [79, 70, 229];
    const DARK: [number, number, number] = [17, 24, 39];
    const GRAY: [number, number, number] = [107, 114, 128];

    function ensure(space: number) {
      if (y + space > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    }
    function text(
      content: string,
      opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {},
    ) {
      const { size = 11, bold = false, color = DARK, gap = 6 } = opts;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(content, width);
      for (const l of lines) {
        ensure(size + 4);
        doc.text(l, margin, y);
        y += size + 4;
      }
      y += gap;
    }
    function heading(content: string) {
      ensure(24);
      y += 6;
      text(content, { size: 13, bold: true, color: INDIGO, gap: 4 });
    }

    text('UNICORN FACTORY', { size: 9, bold: true, color: INDIGO, gap: 2 });
    text('Your Blueprint', { size: 22, bold: true, gap: 10 });

    heading('Refined idea');
    text(blueprint.refinedIdea);

    if (blueprint.targetUsers && blueprint.targetUsers !== 'Not specified.') {
      heading('Who it’s for');
      text(blueprint.targetUsers);
    }

    if (blueprint.keyFeatures.length > 0) {
      heading('What we’ll build');
      for (const f of blueprint.keyFeatures) text(`•  ${f}`, { gap: 2 });
      y += 4;
    }

    heading('Roadmap');
    blueprint.roadmap.forEach((r, i) => {
      text(`${i + 1}.  ${r.title}`, { bold: true, gap: 1 });
      text(r.detail, { color: GRAY, gap: 6 });
    });

    heading('Estimate');
    text(`Tier: ${band?.label ?? '—'}`, { gap: 1 });
    text(`Estimated range: ${money(estimate.low)}–${money(estimate.high)}`, { bold: true, gap: 4 });
    text('A range, not a bill. We confirm a firm price at the internal Green-Light review before you pay.', {
      size: 9,
      color: GRAY,
    });

    doc.save('blueprint.pdf');
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

          {blueprint?.targetUsers && blueprint.targetUsers !== 'Not specified.' && (
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Who it&apos;s for</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{blueprint.targetUsers}</p>
            </Card>
          )}

          {blueprint && blueprint.keyFeatures.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-gray-900 mb-3">What we&apos;ll build</h2>
              <ul className="space-y-2">
                {blueprint.keyFeatures.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-indigo-500">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
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
                Download this Blueprint as PDF (free)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
