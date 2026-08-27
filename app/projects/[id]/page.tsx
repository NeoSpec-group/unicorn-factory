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

// Single canonical URL per idea. The stage shown is driven entirely by the
// project's server-verified status — there are no per-stage URLs to navigate to,
// so a founder cannot manually jump into a concluded or paid stage.
export default function ProjectPage() {
  const params = useParams();
  const id = String(params.id);
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
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

  const s = project?.status;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Unicorn Factory
          </Link>
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
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
