'use client';

import { useState } from 'react';
import type { SVGProps } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Notice from '@/components/Notice';
import { Wordmark, landing, nav } from '@/lib/brand';

// ux-spec.md §4.1 refinement: no exclamation-point enthusiasm in success/done
// copy (brand.md voice: "un-hyped"). `lib/brand/copy.ts` is the single source
// of copy strings — this only strips a trailing "!" to the calmer "." called
// out as an explicit, signed-off delta in ux-spec.md §4.1 ("Done!" → "Done.").
function calm(s: string): string {
  return s.replace(/!+$/, '.');
}

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

  // ux-spec.md §4.1: accent the "72 hours" portion of the headline. The
  // headline string always comes from `landing.headline` (brand copy
  // source) — this only locates the substring to re-wrap in an accent-tinted
  // span; it does not invent new copy.
  const headlineParts = landing.headline.split('72 hours');
  const hasAccentSplit = headlineParts.length === 2;
  const [headlineBefore, headlineAfter] = hasAccentSplit ? headlineParts : [landing.headline, ''];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <Wordmark className="text-lg" />
        <Button variant="secondary" onClick={() => router.push('/auth')}>
          {nav.signIn}
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-accent-fg">
            {landing.eyebrow}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {headlineBefore}
            {hasAccentSplit && <span className="text-accent-fg">72 hours</span>}
            {headlineAfter}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground-muted">{landing.subhead}</p>

          <div className="mt-10 flex justify-center">
            <Button variant="primary" onClick={() => router.push('/auth')} className="px-8 py-3 text-base">
              {landing.primaryCta}
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <h2 className="mb-8 text-center text-xl font-semibold">{landing.howItWorksTitle}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FeatureCard icon={<RefineIcon />} title={landing.steps[0].title} description={landing.steps[0].description} />
            <FeatureCard icon={<ForgeIcon />} title={landing.steps[1].title} description={landing.steps[1].description} />
            <FeatureCard icon={<KeyIcon />} title={landing.steps[2].title} description={landing.steps[2].description} />
          </div>
        </section>

        {/* Email capture */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-md px-6 py-12 text-center">
            <h2 className="text-lg font-semibold">{landing.emailCapture.title}</h2>
            <p className="mt-1 text-sm text-foreground-muted">{landing.emailCapture.subhead}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label className="flex-1 text-left">
                <span className="sr-only">Email address</span>
                <Input
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder={landing.emailCapture.placeholder}
                  disabled={notifyLoading || notifySuccess}
                />
              </label>
              <Button
                variant="primary"
                onClick={handleNotifyMe}
                disabled={notifyLoading || notifySuccess}
                className="shrink-0"
              >
                {notifyLoading
                  ? landing.emailCapture.ctaLoading
                  : notifySuccess
                    ? calm(landing.emailCapture.ctaDone)
                    : landing.emailCapture.ctaIdle}
              </Button>
            </div>
            {notifySuccess && (
              <div className="mt-3">
                <Notice tone="success">{calm(landing.emailCapture.successMessage)}</Notice>
              </div>
            )}
            <div className="mt-3">
              <ErrorBanner message={notifyError} />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 text-center text-xs text-foreground-muted">
        {landing.footer(new Date().getFullYear())}
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-left shadow-sm">
      <div className="mb-3 text-accent">{icon}</div>
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <p className="text-sm text-foreground-muted">{description}</p>
    </div>
  );
}

// Token-tinted inline SVG marks (ux-spec.md §4.1 refinement 2 / Open UX
// Question 3, recommended path): replace the emoji feature bullets with
// self-contained SVGs (`currentColor` strokes, no external asset/CDN) styled
// via the `accent` token, consistent with `LogoMark`'s treatment. These are
// large decorative marks (not body text), so the full-saturation `accent`
// token is appropriate here per DA-4 (accent.700/`accent-fg` is reserved for
// small accent *text*).
function iconProps(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    width: 32,
    height: 32,
    ...props,
  };
}

function RefineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 20 L4 16.5 L15.5 5 A2.1 2.1 0 0 1 18.5 8 L7 19.5 Z" />
      <path d="M14 6.5 L17.5 10" />
    </svg>
  );
}

function ForgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 21 L21 21" />
      <path d="M6 21 V13 L18 13 V21" />
      <path d="M9 13 L9 8 L15 8 L15 13" />
      <path d="M12 8 L12 3" />
      <path d="M9.5 5 L14.5 5" />
    </svg>
  );
}

function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11 L20 20" />
      <path d="M15 16 L18 13" />
      <path d="M17.5 18.5 L20.5 15.5" />
    </svg>
  );
}
