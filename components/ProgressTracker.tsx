'use client';

import { useEffect, useState, useRef } from 'react';
import type { MockStep } from '@/types';

interface ProgressTrackerProps {
  steps: MockStep[];
  onComplete: () => void;
  title: string;
  subtitle?: string;
}

type StepStatus = 'pending' | 'running' | 'complete';

export default function ProgressTracker({
  steps,
  onComplete,
  title,
  subtitle,
}: ProgressTrackerProps) {
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    steps.map(() => 'pending'),
  );
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    let cumulativeDelay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    steps.forEach((step, index) => {
      // Mark step as running after cumulative delay from previous steps
      const startDelay = cumulativeDelay;
      const t1 = setTimeout(() => {
        setStepStatuses((prev) => {
          const next = [...prev];
          next[index] = 'running';
          return next;
        });
      }, startDelay);
      timeouts.push(t1);

      // Mark step as complete after its durationMs elapses
      const completeDelay = cumulativeDelay + step.durationMs;
      const t2 = setTimeout(() => {
        setStepStatuses((prev) => {
          const next = [...prev];
          next[index] = 'complete';
          return next;
        });
      }, completeDelay);
      timeouts.push(t2);

      cumulativeDelay += step.durationMs;
    });

    // Fire onComplete 500ms after last step completes
    const completionTimeout = setTimeout(() => {
      onComplete();
    }, cumulativeDelay + 500);
    timeouts.push(completionTimeout);

    return () => {
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-foreground-muted">{subtitle}</p>}
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = stepStatuses[index];
          return (
            <div
              key={index}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <StepIcon status={status} />
              <div className="flex-1 min-w-0">
                <p
                  className={[
                    'text-sm font-medium truncate',
                    status === 'complete'
                      ? 'text-foreground'
                      : status === 'running'
                      ? 'text-primary-hover'
                      : 'text-foreground-muted',
                  ].join(' ')}
                >
                  {step.name}
                </p>
              </div>
              <span className="text-xs text-foreground-muted shrink-0">
                {formatDuration(step.durationMs)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'complete') {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-bg)]">
        <svg
          className="h-4 w-4 text-[var(--color-success-fg)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  // pending
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted">
      <div className="h-2 w-2 rounded-full bg-border-strong" />
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `~${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `~${minutes}m ${remaining}s` : `~${minutes}m`;
}
