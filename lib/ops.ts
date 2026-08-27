import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export type OpsAuth = { userId: string } | { error: string; status: number };

/**
 * Verify the requester is authenticated AND has the 'ops' role. The role is read
 * from the requester's own profile (RLS-allowed). Ops routes then use the service
 * client for cross-user reads/writes. Returns the userId or an error+status.
 */
export async function getOpsUser(request: NextRequest): Promise<OpsAuth> {
  const supabase = createServerClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { error: 'Unauthorized', status: 401 };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'ops') {
    return { error: 'Forbidden — ops access required.', status: 403 };
  }

  return { userId: user.id };
}

export function isOpsError(auth: OpsAuth): auth is { error: string; status: number } {
  return 'error' in auth;
}
