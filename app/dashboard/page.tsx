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
import StageChip, { STAGE_CHIP_LABEL } from '@/components/StageChip';
import { Wordmark } from '@/lib/brand';

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
        const body = (await res.json().catch(() => ({}))) as { error?: string };
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
        const body = (await res.json().catch(() => ({}))) as { error?: string };
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

  const hasPortfolios = portfolios.length > 0;

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Wordmark className="text-xl" />
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Your portfolios</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Group your product ideas into portfolios and track each idea&apos;s progress.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} />
          </div>
        )}

        {/* New portfolio */}
        <Card className="mb-8">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground-muted">Portfolio name</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={newName}
                onChange={setNewName}
                placeholder="New portfolio name (e.g. EdTech bets)"
                className="flex-1"
              />
              <Button
                variant="primary"
                onClick={createPortfolio}
                disabled={creating || !newName.trim()}
                className="py-2 shrink-0"
              >
                {creating ? 'Creating…' : 'New portfolio'}
              </Button>
            </div>
          </label>
        </Card>

        {!hasPortfolios ? (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <Wordmark className="mb-2 justify-center text-lg opacity-70" />
            <p className="text-sm font-medium text-foreground">Create your first portfolio to start an idea.</p>
            <p className="max-w-sm text-sm text-foreground-muted">
              Portfolios group your product ideas — use the field above to create one, then add your first
              idea to it.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {portfolios.map((pf) => (
              <PortfolioBlock
                key={pf.id}
                portfolio={pf}
                onNewIdea={() => router.push(`/intake?portfolio=${pf.id}`)}
                onOpenIdea={(id) => router.push(`/projects/${id}`)}
              />
            ))}
          </div>
        )}
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
        <h2 className="text-base font-semibold text-foreground">{portfolio.name}</h2>
        <button
          onClick={onNewIdea}
          className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          + New idea
        </button>
      </div>

      {portfolio.ideas.length === 0 ? (
        <p className="text-sm text-foreground-muted">No ideas yet. Start one with &ldquo;New idea&rdquo;.</p>
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
  const humanStage = STAGE_CHIP_LABEL[idea.status] ?? idea.stageLabel;
  return (
    <li>
      <button
        onClick={onOpen}
        aria-label={`Open ${idea.title} — ${humanStage}`}
        className="w-full rounded-lg border border-border px-4 py-3 text-left transition-colors duration-150 hover:border-primary hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{idea.title}</span>
          <StageChip status={idea.status} />
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={idea.stageIndex + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STAGES}
          aria-label={`${humanStage} progress`}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </button>
    </li>
  );
}
