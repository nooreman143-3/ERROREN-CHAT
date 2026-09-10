import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'erroren_supabase_config';

export interface SupabaseConfig {
  url: string;
  key: string;
  isConfigured: boolean;
}

let cachedClient: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseConfig(): SupabaseConfig {
  // 1. Check environment variables
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (envUrl && envKey) {
    return {
      url: envUrl,
      key: envKey,
      isConfigured: true,
    };
  }

  // 2. Check localStorage configuration
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.key) {
        return {
          url: parsed.url.trim(),
          key: parsed.key.trim(),
          isConfigured: true,
        };
      }
    }
  } catch (e) {
    console.warn('[Supabase Config] Error reading local config:', e);
  }

  return {
    url: '',
    key: '',
    isConfigured: false,
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    cachedClient = null;
    currentConfigKey = '';
    return null;
  }

  const keyId = `${config.url}::${config.key}`;
  if (cachedClient && currentConfigKey === keyId) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
    currentConfigKey = keyId;
    return cachedClient;
  } catch (err) {
    console.error('[Supabase Client] Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveSupabaseConfig(url: string, key: string): boolean {
  try {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();

    if (!cleanUrl || !cleanKey) return false;

    // Validate URL format
    new URL(cleanUrl);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url: cleanUrl,
        key: cleanKey,
        configuredAt: Date.now(),
      })
    );

    // Reset cached client
    cachedClient = null;
    currentConfigKey = '';

    return true;
  } catch (err) {
    console.error('[Supabase Config] Save error:', err);
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedClient = null;
    currentConfigKey = '';
  } catch (err) {
    console.warn('[Supabase Config] Clear error:', err);
  }
}
