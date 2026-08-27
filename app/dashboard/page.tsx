'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { JOURNEY_STAGES } from '@/types';
import type { PortfolioWithIdeas, PortfoliosResponse, IdeaSummary } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';

const TOTAL_STAGES = JOURNEY_STAGES.length;

export default function DashboardPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<PortfolioWithIdeas[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolios');
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to load your portfolios.');
        return;
      }
      const data = (await res.json()) as PortfoliosResponse;
      setPortfolios(data.portfolios);
    } catch {
      setError('Network error loading your portfolios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function createPortfolio() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to create portfolio.');
        return;
      }
      setNewName('');
      await load();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
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
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Unicorn Factory
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your portfolios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Group your product ideas into portfolios and track each idea&apos;s progress.
          </p>
        </div>

        <ErrorBanner message={error} />

        {/* New portfolio */}
        <Card className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input value={newName} onChange={setNewName} placeholder="New portfolio name (e.g. EdTech bets)" />
          <Button variant="primary" onClick={createPortfolio} disabled={creating || !newName.trim()} className="py-2 shrink-0">
            {creating ? 'Creating…' : 'New portfolio'}
          </Button>
        </Card>

        <div className="space-y-6">
          {portfolios.map((pf) => (
            <PortfolioBlock key={pf.id} portfolio={pf} onNewIdea={() => router.push(`/intake?portfolio=${pf.id}`)} onOpenIdea={(id) => router.push(`/projects/${id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PortfolioBlock({
  portfolio,
  onNewIdea,
  onOpenIdea,
}: {
  portfolio: PortfolioWithIdeas;
  onNewIdea: () => void;
  onOpenIdea: (id: string) => void;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{portfolio.name}</h2>
        <button onClick={onNewIdea} className="text-sm font-medium text-indigo-600 hover:underline">
          + New idea
        </button>
      </div>

      {portfolio.ideas.length === 0 ? (
        <p className="text-sm text-gray-400">No ideas yet. Start one with “New idea”.</p>
      ) : (
        <ul className="space-y-2">
          {portfolio.ideas.map((idea) => (
            <IdeaRow key={idea.id} idea={idea} onOpen={() => onOpenIdea(idea.id)} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function IdeaRow({ idea, onOpen }: { idea: IdeaSummary; onOpen: () => void }) {
  const pct = Math.round(((idea.stageIndex + 1) / TOTAL_STAGES) * 100);
  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{idea.title}</span>
          <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            {idea.stageLabel}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
        </div>
      </button>
    </li>
  );
}
