'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getRouteForStatus } from '@/types';
import type { ProjectStatus } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Spinner from '@/components/ui/Spinner';

type Tab = 'sign-up' | 'sign-in';

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // On mount: check if user is already authenticated
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await redirectByProjectStatus(session.access_token);
      } else {
        setCheckingSession(false);
      }
    }
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function redirectByProjectStatus(accessToken: string) {
    try {
      const supabase = createClient();
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status')
        .order('created_at', { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        const project = projects[0] as { id: string; status: ProjectStatus };
        sessionStorage.setItem('uf_project_id', project.id);
        router.push(getRouteForStatus(project.status));
      } else {
        router.push('/intake');
      }
    } catch {
      router.push('/intake');
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      if (activeTab === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          // Email confirmation is off — we're signed in immediately.
          router.push('/intake');
        } else {
          // Email confirmation is on — no session yet. Guide the user.
          setNotice(
            'Account created. Confirm your email, then sign in. (For local testing, disable email confirmation in Supabase → Authentication.)',
          );
          setActiveTab('sign-in');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        if (data.session) {
          await redirectByProjectStatus(data.session.access_token);
        } else {
          router.push('/intake');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">Unicorn Factory</Link>
          <p className="mt-1 text-sm text-gray-500">Your autonomous MVP builder</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Tab switcher */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            {(['sign-up', 'sign-in'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setError(null);
                  setNotice(null);
                }}
                className={[
                  'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {tab === 'sign-up' ? 'Sign Up' : 'Sign In'}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Email address
              </label>
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={activeTab === 'sign-up' ? 'Create a password' : 'Your password'}
                disabled={loading}
              />
            </div>

            {notice && (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                {notice}
              </div>
            )}

            <ErrorBanner message={error} />

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5"
            >
              {loading
                ? 'Please wait…'
                : activeTab === 'sign-up'
                ? 'Create Account'
                : 'Sign In'}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/" className="text-indigo-600 hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
