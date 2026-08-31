'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { ProjectResponse } from '@/types';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import JourneyTracker from '@/components/JourneyTracker';
import WorkshopStage from '@/components/stages/WorkshopStage';
import BlueprintStage from '@/components/stages/BlueprintStage';
import JourneyStage from '@/components/stages/JourneyStage';
import HandoverStage from '@/components/stages/HandoverStage';
import { Wordmark } from '@/lib/brand';

// Single canonical URL per idea. The stage shown is driven entirely by the
// project's server-verified status — there are no per-stage URLs to navigate to,
// so a founder cannot manually jump into a concluded or paid stage.
export default function ProjectPage() {
  const params = useParams();
  const id = String(params.id);
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Failed to load this idea.');
        return;
      }
      setProject((await res.json()) as ProjectResponse);
    } catch {
      setError('Network error loading this idea.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">We couldn&apos;t find this idea</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            It may have been removed, or it belongs to a different account.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const s = project?.status;

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Wordmark />
          </Link>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            ← Dashboard
          </Link>
        </div>

        <ErrorBanner message={error} />

        {project && (
          <>
            <JourneyTracker status={project.status} className="mb-10" />
            {s === 'intake' && <WorkshopStage project={project} reload={load} />}
            {s === 'blueprint_ready' && <BlueprintStage project={project} reload={load} />}
            {(s === 'commissioned' ||
              s === 'approved' ||
              s === 'declined' ||
              s === 'paid' ||
              s === 'building' ||
              s === 'uat' ||
              s === 'parked') && <JourneyStage project={project} reload={load} />}
            {(s === 'handover' || s === 'launched' || s === 'managed') && (
              <HandoverStage project={project} reload={load} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
