'use client';

// MOCK: Research agent pipeline — replace with real agent orchestration calls.

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_RESEARCH_STEPS } from '@/lib/mock-data';
import ProgressTracker from '@/components/ProgressTracker';

export default function ResearchPage() {
  const router = useRouter();
  const hasStarted = useRef(false);

  useEffect(() => {
    const projectId = sessionStorage.getItem('uf_project_id');
    if (!projectId) {
      router.push('/idea');
      return;
    }

    if (hasStarted.current) return;
    hasStarted.current = true;

    // Signal research start to the backend
    fetch(`/api/projects/${projectId}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'start' }),
    }).catch(() => {
      // Non-blocking: progress tracker still runs even if start call fails
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleComplete() {
    const projectId = sessionStorage.getItem('uf_project_id');
    if (!projectId) {
      router.push('/idea');
      return;
    }
    try {
      await fetch(`/api/projects/${projectId}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'complete' }),
      });
    } catch {
      // Non-blocking: navigate regardless
    }
    router.push('/checkpoint');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <a href="/" className="text-xl font-bold text-indigo-600">
            Unicorn Factory
          </a>
        </div>
        <ProgressTracker
          steps={MOCK_RESEARCH_STEPS}
          onComplete={handleComplete}
          title="Researching your market..."
          subtitle="Our AI agents are scanning the landscape for your idea."
        />
      </div>
    </div>
  );
}
