'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Spinner from '@/components/ui/Spinner';
import Notice from '@/components/Notice';
import { Wordmark, product } from '@/lib/brand';

type Tab = 'sign-up' | 'sign-in';

function isUnconfirmedEmailError(message: string): boolean {
  return /email not confirmed/i.test(message);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground-muted">{label}</span>
      {children}
    </label>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedNotice, setUnconfirmedNotice] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // `/auth/callback` redirects back here on a failed/expired confirmation link.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('error') === 'confirm') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('sign-in');
      setError("That confirmation link didn't work — it may have expired. Sign in to resend.");
    }
  }, []);

  // On mount: check if user is already authenticated
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      } else {
        setCheckingSession(false);
      }
    }
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setError(null);
    setUnconfirmedNotice(false);
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
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          // Email confirmation is off — we're signed in immediately.
          router.push('/dashboard');
        } else {
          // Email confirmation is on — no session yet. Guide the user.
          setConfirmingEmail(email.trim());
          setAwaitingConfirmation(true);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          if (isUnconfirmedEmailError(signInError.message)) {
            setUnconfirmedNotice(true);
          } else {
            setError(signInError.message);
          }
          return;
        }
        if (data.session) {
          router.push('/dashboard');
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex justify-center">
            <Wordmark className="text-lg" />
          </Link>
          <p className="mt-1 text-sm text-foreground-muted">{product.tagline}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          <div role="tablist" aria-label="Auth mode" className="mb-6 flex rounded-lg bg-surface-muted p-1">
            {(['sign-up', 'sign-in'] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => {
                  setActiveTab(tab);
                  setError(null);
                  setUnconfirmedNotice(false);
                  setAwaitingConfirmation(false);
                }}
                className={[
                  'flex-1 rounded-md py-2 text-sm font-medium transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  activeTab === tab
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-foreground-muted hover:text-foreground',
                ].join(' ')}
              >
                {tab === 'sign-up' ? 'Sign Up' : 'Sign In'}
              </button>
            ))}
          </div>

          {awaitingConfirmation ? (
            <div className="space-y-4">
              <Notice tone="info">
                We sent a confirmation link to <strong>{confirmingEmail}</strong>. Click it to activate your
                account, then you&apos;ll land on your dashboard.
              </Notice>
              <div aria-hidden="true" className="space-y-4 opacity-50">
                <Field label="Email address">
                  <Input type="email" value={email} onChange={() => {}} disabled />
                </Field>
                <Field label="Password">
                  <Input type="password" value={password} onChange={() => {}} disabled />
                </Field>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Email address">
                <Input
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={activeTab === 'sign-up' ? 'Create a password' : 'Your password'}
                  disabled={loading}
                />
              </Field>

              {unconfirmedNotice && (
                <Notice tone="warning">
                  Please confirm your email first — check your inbox for the link we sent.
                </Notice>
              )}

              <ErrorBanner message={error} />

              <Button variant="primary" onClick={handleSubmit} disabled={loading} className="w-full py-2.5">
                {loading ? 'Please wait…' : activeTab === 'sign-up' ? 'Create Account' : 'Sign In'}
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-foreground-muted">
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
