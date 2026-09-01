'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { nav } from '@/lib/brand';

/**
 * Persistent account chip (fixed top-right). Shows the signed-in email and a
 * Sign out button; renders nothing when there's no session. Mounted once in the
 * root layout so it appears on every page.
 */
export default function UserNav() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (active) setEmail(data.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') sessionStorage.removeItem('uf_project_id');
    setEmail(null);
    router.push('/auth');
  }

  if (!email) return null;

  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 shadow-sm backdrop-blur">
      <span className="max-w-[160px] truncate text-xs text-foreground-muted">{email}</span>
      <button
        onClick={signOut}
        className="rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {nav.signOut}
      </button>
    </div>
  );
}
