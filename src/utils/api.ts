/**
 * Centralized API & WebSocket Configuration for ERROREN CHAT
 * Supports seamless transitions between:
 * - AI Studio preview (same-origin relative paths)
 * - GitHub Pages static deployment (connects to Cloud Run live production backend)
 * - Custom self-hosted full-stack deployments (via VITE_API_URL or runtime override)
 */

export const DEFAULT_PRODUCTION_BACKEND_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ''
).trim();

/**
 * Resolves the active backend base URL without trailing slash.
 */
export function getBackendBaseUrl(): string {
  // 1. Explicit build-time or environment override
  const envUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    ''
  ).trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. Client-side runtime or local storage override (if user specified a custom server in settings)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('erroren_backend_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch {
      // ignore
    }

    // 3. Global window variable override if injected
    const windowOverride = (window as any).__ERROREN_BACKEND_URL__;
    if (windowOverride && typeof windowOverride === 'string' && windowOverride.trim()) {
      return windowOverride.trim().replace(/\/+$/, '');
    }
  }

  // 4. Default: same-origin relative path for AI Studio preview or standalone full-stack server
  return '';
}

/**
 * Returns a fully-qualified or relative API URL for the given endpoint path.
 */
export function apiUrl(path: string): string {
  const base = getBackendBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}

/**
 * Wrapper around standard fetch that automatically resolves the correct API base URL
 * and ensures proper headers, HTML 404 fallback, and error resilience.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  try {
    const res = await fetch(url, init);
    // Wrap res.json so calling it on 404 HTML responses (e.g. static GitHub Pages) never crashes
    const originalJson = res.json.bind(res);
    res.json = async () => {
      try {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html') || !res.ok) {
          if (contentType.includes('text/html')) {
            return { error: 'Endpoint route not found on static host', success: false, offline: true };
          }
        }
        return await originalJson();
      } catch {
        return { error: 'Invalid JSON response from server', success: false, offline: true };
      }
    };
    return res;
  } catch (err) {
    // Return a safe 503 synthetic response so caller logic (.then or .json) doesn't unhandled-reject
    return new Response(
      JSON.stringify({ error: 'Network request unreachable', success: false, offline: true }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Resolves the WebSocket URL based on current environment and backend configuration.
 */
export function getWebSocketUrl(): string {
  // 1. Explicit WS environment variable
  const envWs = (import.meta.env.VITE_WS_URL || '').trim();
  if (envWs) return envWs;

  // 2. If a backend URL is configured or defaulted
  const backend = getBackendBaseUrl();
  if (backend) {
    const isSecure = backend.startsWith('https:');
    const host = backend.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return `${isSecure ? 'wss:' : 'ws:'}//${host}/ws`;
  }

  // 3. Fallback to active browser location
  if (typeof window !== 'undefined') {
    // On static hosting like GitHub Pages, no WebSocket server exists on github.io
    if (window.location.hostname.endsWith('github.io')) {
      return '';
    }
    const isSecure = window.location.protocol === 'https:';
    return `${isSecure ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  }

  return 'ws://localhost:3000/ws';
}

/**
 * Fast network/backend health check
 */
export async function checkBackendHealth(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await apiFetch('/api/health', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}
