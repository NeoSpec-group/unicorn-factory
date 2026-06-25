'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateProjectResponse } from '@/types';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Spinner from '@/components/ui/Spinner';

const MIN_CHARS = 20;
const MAX_CHARS = 500;

export default function IdeaPage() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (ideaText.trim().length < MIN_CHARS) {
      setError(`Please describe your idea in at least ${MIN_CHARS} characters.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaText: ideaText.trim() }),
      });

      const body = (await res.json()) as CreateProjectResponse | { error: string };

      if (!res.ok) {
        const errBody = body as { error: string };
        setError(errBody.error ?? 'Something went wrong. Please try again.');
        return;
      }

      const data = body as CreateProjectResponse;

      if (data.verdict === 'decline') {
        setError(data.reason);
        return;
      }

      // Accept path
      sessionStorage.setItem('uf_project_id', data.projectId);
      router.push('/questions');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const charCount = ideaText.length;
  const isAtMin = charCount >= MIN_CHARS;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <a href="/" className="text-xl font-bold text-indigo-600">
            Unicorn Factory
          </a>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">What&apos;s your idea?</h1>
          <p className="text-sm text-gray-500 mb-6">
            Describe your product idea in a few sentences. Our AI will evaluate whether it can
            be built as a software MVP.
          </p>

          <div className="space-y-4">
            <div>
              <Textarea
                value={ideaText}
                onChange={setIdeaText}
                placeholder="Describe your product idea in a few sentences..."
                minLength={MIN_CHARS}
                maxLength={MAX_CHARS}
                rows={6}
                disabled={loading}
              />
              <div className="mt-1 flex justify-end">
                <span
                  className={[
                    'text-xs',
                    charCount > MAX_CHARS
                      ? 'text-red-500'
                      : charCount < MIN_CHARS
                      ? 'text-gray-400'
                      : 'text-green-600',
                  ].join(' ')}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>

            {error && (
              <div>
                <ErrorBanner message={error} />
                {error && (
                  <button
                    onClick={() => {
                      setError(null);
                      setIdeaText('');
                    }}
                    className="mt-2 text-xs text-indigo-600 hover:underline"
                  >
                    Try a different idea
                  </button>
                )}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || !isAtMin || charCount > MAX_CHARS}
              className="w-full py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Analysing your idea…
                </span>
              ) : (
                'Submit Idea'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
