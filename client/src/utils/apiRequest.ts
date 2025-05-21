import { tryRefreshSession } from '../auth/refresh';

export async function apiRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
  async function doFetch(): Promise<Response> {
    return fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  let res = await doFetch();

  // If the session expired, try to refresh silently once, then retry the original call.
  if (res.status === 401) {
    const refreshOK = await tryRefreshSession();
    if (refreshOK) res = await doFetch();
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