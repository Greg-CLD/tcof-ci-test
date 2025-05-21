import { tryRefreshSession } from '../auth/refresh';

/**
 * Enhanced API request function with session refresh and content validation
 * 
 * This function provides:
 * 1. Automatic session refresh on 401 responses
 * 2. Content-type validation to prevent treating HTML as JSON
 * 3. Detailed error information when requests fail
 * 
 * @param method HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param url API endpoint URL
 * @param body Optional request body
 * @returns Parsed JSON response
 */
export async function apiRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
  async function doFetch(): Promise<Response> {
    return fetch(url, {
      method,
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  let res = await doFetch();

  // If the session expired, try to refresh silently once, then retry the original call.
  if (res.status === 401) {
    console.log(`[API] Received 401 from ${url}, attempting session refresh`);
    const refreshOK = await tryRefreshSession();
    if (refreshOK) {
      console.log('[API] Session refresh successful, retrying request');
      res = await doFetch();
    } else {
      console.log('[API] Session refresh failed');
    }
  }

  // Any non-2xx after retry is an error.
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[API] ${method} ${url} failed ${res.status}: ${text.slice(0,200)}`);
  }

  // Guard against HTML fallback accidentally being served with 200
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error(`[API] Expected JSON but got ${ct}`);
  }

  return res.json() as Promise<T>;
}