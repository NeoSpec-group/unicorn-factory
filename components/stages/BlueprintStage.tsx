'use client';

import { useState } from 'react';
import type { ProjectResponse } from '@/types';
import { TIER_BANDS } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ErrorBanner from '@/components/ui/ErrorBanner';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface StageProps {
  project: ProjectResponse;
  reload: () => void | Promise<void>;
}

function money(n: number | null): string {
  return n === null ? '—' : `$${n.toLocaleString()}`;
}

export default function BlueprintStage({ project, reload }: StageProps) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blueprint = project.outputs?.blueprint ?? null;
  const estimate = project.estimate;
  const band = estimate.tier ? TIER_BANDS[estimate.tier] : null;

  async function act(path: 'commission' | 'park') {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Something went wrong. Please try again.');
        return;
      }
      await reload();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadBlueprint() {
    if (!blueprint) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;
    // jsPDF draws to a canvas-like surface and cannot consume CSS custom
    // properties — these RGB tuples mirror lib/brand/tokens.ts `primary[600]`
    // (#4f46e5), `lightTheme.foreground` (#111827), and `lightTheme.foregroundMuted`
    // (#6b7280) 1:1; keep in sync with that module if the brand palette changes.
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
      for (const l of doc.splitTextToSize(content, width)) {
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
    text(`Estimated range: ${money(estimate.low)}–${money(estimate.high)}`, { bold: true });
    doc.save('blueprint.pdf');
  }

  // Commission confirmation sub-view.
  if (confirming) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Commission the build</h1>
          <p className="mt-1 text-sm text-foreground-muted">Nothing is charged yet — we review first.</p>
        </div>
        <ErrorBanner message={error} />
        <div className="space-y-6">
          <Card className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">
              Estimated {band ? band.label : ''} build
            </p>
            <p className="text-2xl font-bold text-foreground">
              {money(estimate.low)}
              <span className="text-foreground-muted"> – </span>
              {money(estimate.high)}
            </p>
            <p className="text-xs text-foreground-muted">
              Cash. A firm price is set at Green-Light before you pay.
            </p>
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-foreground">What happens next</h2>
            <ol className="list-inside list-decimal space-y-2 text-sm text-foreground-muted">
              <li>
                <strong className="text-foreground">Green-Light</strong> — we review scope &amp; set your
                firm price.
              </li>
              <li>
                <strong className="text-foreground">Ignition</strong> — you pay the firm price; the 72-hour
                clock starts.
              </li>
              <li>
                <strong className="text-foreground">The Forge</strong> — we build your MVP.
              </li>
              <li>
                <strong className="text-foreground">Proving Ground → Handover</strong> — you test-drive it,
                then it&apos;s yours.
              </li>
            </ol>
          </Card>
          <label className="flex items-start gap-3 text-sm text-foreground-muted">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border-strong text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>I understand this submits my build request for review. I&apos;m not charged until Ignition.</span>
          </label>
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => act('commission')} disabled={busy || !agreed} className="flex-1 py-3">
              {busy ? 'Submitting…' : 'Submit build request'}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy} className="py-3">
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Your Blueprint</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          A validated shape of your idea, a build roadmap, and an estimate — free.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="mt-4 space-y-6">
        {blueprint && (
          <Card>
            <h2 className="mb-3 text-base font-semibold text-foreground">Refined idea</h2>
            <MarkdownRenderer content={blueprint.refinedIdea} />
          </Card>
        )}

        {blueprint?.targetUsers && blueprint.targetUsers !== 'Not specified.' && (
          <Card>
            <h2 className="mb-2 text-base font-semibold text-foreground">Who it&apos;s for</h2>
            <p className="text-sm leading-relaxed text-foreground-muted">{blueprint.targetUsers}</p>
          </Card>
        )}

        {blueprint && blueprint.keyFeatures.length > 0 && (
          <Card>
            <h2 className="mb-3 text-base font-semibold text-foreground">What we&apos;ll build</h2>
            <ul className="space-y-2">
              {blueprint.keyFeatures.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground-muted">
                  <span className="mt-0.5 text-primary">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {blueprint && blueprint.roadmap.length > 0 && (
          <Card>
            <h2 className="mb-3 text-base font-semibold text-foreground">Roadmap</h2>
            <ol className="space-y-3">
              {blueprint.roadmap.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-hover">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-foreground-muted">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {!blueprint && (
          <Card>
            <p className="text-sm text-foreground-muted">
              Your written Blueprint is still being finalized — the estimate below is authoritative and you
              can commission the build now.
            </p>
          </Card>
        )}

        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">Estimate</h2>
            {band && <Badge label={band.label} variant="neutral" />}
          </div>
          <p className="text-2xl font-bold text-foreground">
            {money(estimate.low)}
            <span className="text-foreground-muted"> – </span>
            {money(estimate.high)}
          </p>
          <p className="text-xs text-foreground-muted">
            A range, not a bill. We confirm a firm price at the internal Green-Light review before you pay
            anything.
          </p>
        </Card>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={() => setConfirming(true)} disabled={busy} className="flex-1 py-3">
              Commission the build
            </Button>
            <Button variant="secondary" onClick={() => act('park')} disabled={busy} className="flex-1 py-3">
              Park for now
            </Button>
          </div>
          <button
            onClick={downloadBlueprint}
            className="self-center rounded text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Download this Blueprint as PDF (free)
          </button>
        </div>
      </div>
    </div>
  );
}
