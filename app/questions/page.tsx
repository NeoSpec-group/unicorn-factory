'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { QuestionsResponse, SubmitAnswersResponse } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      const projectId = sessionStorage.getItem('uf_project_id');
      if (!projectId) {
        router.push('/idea');
        return;
      }
      try {
        const res = await fetch(`/api/projects/${projectId}/questions`);
        if (!res.ok) {
          const body = await res.json() as { error?: string };
          setError(body.error ?? 'Failed to load questions. Please try again.');
          setLoadingQuestions(false);
          return;
        }
        const data = (await res.json()) as QuestionsResponse;
        setQuestions(data.questions);
        setAnswers(data.questions.map(() => ''));
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoadingQuestions(false);
      }
    }
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAnswerChange(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const allAnswered = answers.length > 0 && answers.every((a) => a.trim().length > 0);

  async function handleSubmit() {
    const projectId = sessionStorage.getItem('uf_project_id');
    if (!projectId) {
      router.push('/idea');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        answers: questions.map((q, i) => ({
          question: q,
          answer: answers[i],
        })),
      };
      const res = await fetch(`/api/projects/${projectId}/submit-answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Failed to submit answers. Please try again.');
        return;
      }
      const data = (await res.json()) as SubmitAnswersResponse;
      if (data.success) {
        router.push('/research');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingQuestions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-gray-500">Generating questions…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gray-50 px-4 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <a href="/" className="text-xl font-bold text-indigo-600">
            Unicorn Factory
          </a>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">A few quick questions</h1>
          <p className="mt-1 text-sm text-gray-500">Help us understand your idea better.</p>
        </div>

        <ErrorBanner message={error} />

        {questions.length > 0 && (
          <div className="space-y-4 mt-4">
            {questions.map((question, index) => (
              <Card key={index}>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {index + 1}. {question}
                </label>
                <Input
                  value={answers[index] ?? ''}
                  onChange={(value) => handleAnswerChange(index, value)}
                  placeholder="Your answer…"
                  disabled={submitting}
                />
              </Card>
            ))}

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="w-full py-2.5 mt-2"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Submitting…
                </span>
              ) : (
                'Submit Answers'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
