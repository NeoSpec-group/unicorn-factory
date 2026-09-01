'use client';

import { useState, useEffect } from 'react';
import type { ProjectResponse, QuestionsResponse, SubmitAnswersResponse } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';

interface StageProps {
  project: ProjectResponse;
  reload: () => void | Promise<void>;
}

export default function WorkshopStage({ project, reload }: StageProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/projects/${project.id}/questions`);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? 'Failed to load questions.');
          return;
        }
        const data = (await res.json()) as QuestionsResponse;
        setQuestions(data.questions);
        setAnswers(data.questions.map(() => ''));
      } catch {
        setError('Network error loading questions.');
      } finally {
        setLoadingQuestions(false);
      }
    }
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allAnswered = answers.length > 0 && answers.every((a) => a.trim().length > 0);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = { answers: questions.map((q, i) => ({ question: q, answer: answers[i] })) };
      const res = await fetch(`/api/projects/${project.id}/submit-answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Failed to submit answers.');
        return;
      }
      const data = (await res.json()) as SubmitAnswersResponse;
      if (data.success) await reload();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingQuestions) {
    return (
      <div className="py-10 text-center">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-foreground-muted">Generating questions…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">The Workshop</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Let&apos;s shape your idea together — a few quick questions.
        </p>
      </div>

      <ErrorBanner message={error} />

      {questions.length > 0 && (
        <div className="mt-4 space-y-4">
          {questions.map((question, index) => (
            <Card key={index}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {index + 1}. {question}
                </span>
                <Input
                  value={answers[index] ?? ''}
                  onChange={(value) =>
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[index] = value;
                      return next;
                    })
                  }
                  placeholder="Your answer…"
                  disabled={submitting}
                />
              </label>
            </Card>
          ))}

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="mt-2 w-full py-2.5"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                Building your Blueprint…
              </span>
            ) : (
              'Generate my Blueprint'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
