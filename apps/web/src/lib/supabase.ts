/**
 * Stockly WMS Supabase Database Client & Adapter
 * Provides PostgreSQL connection layer for commercial deployments.
 */

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  };
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

/**
 * Lightweight fetch-based client for Supabase REST API (PostgREST)
 * 100% dependency-free, operates completely offline without external npm packages.
 */
export async function supabaseRestQuery<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    return { data: null, error: new Error('Supabase credentials are not configured in .env') };
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${endpoint.replace(/^\//, '')}`;

  const headers: Record<string, string> = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers as any)
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errText = await res.text();
      return { data: null, error: new Error(`Supabase query failed (${res.status}): ${errText}`) };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
