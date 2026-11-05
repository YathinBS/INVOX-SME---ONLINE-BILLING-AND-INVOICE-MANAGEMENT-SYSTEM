import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'invox_supabase_url';
const STORAGE_ANON_KEY = 'invox_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  // Check localStorage first (user-configured in UI), then environment variables
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ANON_KEY) : null;

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    anonKey &&
    anonKey.length > 20
  );
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return clientInstance;
}

export function configureSupabase(url: string, anonKey: string): { success: boolean; message: string } {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
    return {
      success: false,
      message: 'Invalid Supabase URL. It must be in the format: https://[your-project-id].supabase.co'
    };
  }

  if (cleanKey.length < 20) {
    return {
      success: false,
      message: 'Invalid Supabase Publishable Key. Please copy the anon key from Project Settings -> API.'
    };
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
    localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
  }

  // Re-create client instance
  clientInstance = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return { success: true, message: 'Supabase configuration saved successfully!' };
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_ANON_KEY);
  }
  clientInstance = null;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase is not configured. Please supply your Project URL and Publishable Anon Key.'
    };
  }

  try {
    const { error } = await client
      .from('businesses')
      .select('id', { count: 'exact', head: true });

    if (error) {
      // If table doesn't exist yet, but connection succeeded
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase! The database tables need to be created using schema.sql.'
        };
      }
      return {
        success: false,
        message: `Supabase connection error: ${error.message} (${error.code || 'UNKNOWN'})`
      };
    }

    return {
      success: true,
      message: 'Connected to Supabase PostgreSQL database successfully!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to Supabase: ${err.message || 'Network error'}`
    };
  }
}

export const supabase = getSupabaseClient();
