'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorBanner from '@/components/ui/ErrorBanner';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifySuccess, setNotifySuccess] = useState(false);

  async function handleNotifyMe() {
    if (!email.trim()) {
      setNotifyError('Please enter your email address.');
      return;
    }
    setNotifyError(null);
    setNotifyLoading(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json();
        setNotifyError((body as { error?: string }).error ?? 'Something went wrong. Please try again.');
        return;
      }
      setNotifySuccess(true);
      setEmail('');
    } catch {
      setNotifyError('Network error. Please try again.');
    } finally {
      setNotifyLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <span className="text-lg font-bold text-indigo-600">Unicorn Factory</span>
        <Button variant="secondary" onClick={() => router.push('/auth')}>
          Sign In
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Turn your idea into a working MVP —{' '}
            <span className="text-indigo-600">in 72 hours.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            Refine your idea with us for free. When the Blueprint is right, we engineer your MVP —
            delivered in under 72 hours — then hand it over, or keep running it for you.
          </p>

          <div className="mt-10 flex justify-center">
            <Button variant="primary" onClick={() => router.push('/auth')} className="px-8 py-3 text-base">
              Get Started
            </Button>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <h2 className="text-center text-xl font-semibold text-gray-800 mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FeatureBullet
              icon="✏️"
              title="Refine for free"
              description="Shape your idea with us in The Workshop and get a Blueprint — a validated idea, a build roadmap, and a cost estimate. Free, no commitment."
            />
            <FeatureBullet
              icon="🏭"
              title="We build it"
              description="Commission the build. After a quick review to set a firm price, we engineer your MVP and ship it to a live URL — in under 72 hours."
            />
            <FeatureBullet
              icon="🔑"
              title="It's yours"
              description="Test-drive it, then take full ownership — code, app, database, and IP transferred to your accounts — or have us keep running it for you."
            />
          </div>
        </section>

        {/* Email capture */}
        <section className="bg-white border-t border-gray-200">
          <div className="mx-auto max-w-md px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Stay in the loop</h2>
            <p className="mt-1 text-sm text-gray-500">
              Get notified when we launch new features.
            </p>
            <div className="mt-4 flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                disabled={notifyLoading || notifySuccess}
              />
              <Button
                variant="primary"
                onClick={handleNotifyMe}
                disabled={notifyLoading || notifySuccess}
                className="shrink-0"
              >
                {notifyLoading ? 'Saving…' : notifySuccess ? 'Done!' : 'Notify Me'}
              </Button>
            </div>
            {notifySuccess && (
              <p className="mt-3 text-sm text-green-600 font-medium">
                You&apos;re on the list. We&apos;ll be in touch!
              </p>
            )}
            <div className="mt-3">
              <ErrorBanner message={notifyError} />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Unicorn Factory. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureBullet({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-white border border-gray-200 p-6 shadow-sm text-left">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
