import { vi, expect, test } from 'vitest';
import { apiRequest } from '../../client/src/utils/apiRequest';
import { tryRefreshSession } from '../../client/src/auth/refresh';

// Mock the refresh module
vi.mock('../../client/src/auth/refresh', () => ({
  tryRefreshSession: vi.fn()
}));

// Mock fetch globally
const originalFetch = global.fetch;

test('retries once on 401 then succeeds', async () => {
  // 1st call -> 401
  global.fetch = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'AUTH_EXPIRED' }), { 
      status: 401, 
      headers: { 'Content-Type': 'application/json' } 
    }))
    // retry -> 200
    .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }));
  
  vi.mocked(tryRefreshSession).mockResolvedValue(true);

  const data = await apiRequest('PUT', '/any');
  expect(data).toEqual({ ok: true });
  expect(tryRefreshSession).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('throws after failed refresh', async () => {
  global.fetch = vi.fn().mockResolvedValue(new Response(null, { 
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  }));
  
  vi.mocked(tryRefreshSession).mockResolvedValue(false);

  await expect(apiRequest('GET', '/any')).rejects.toThrow(/401/);
});

test('throws on non-JSON response with 200 status', async () => {
  global.fetch = vi.fn().mockResolvedValue(new Response('<html><body>Error page</body></html>', { 
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  }));

  await expect(apiRequest('GET', '/any')).rejects.toThrow(/Expected JSON/);
});

test('throws on any non-2xx status after retry', async () => {
  global.fetch = vi.fn().mockResolvedValue(new Response('Not found', { 
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  }));

  await expect(apiRequest('GET', '/any')).rejects.toThrow(/404/);
});

// Restore original fetch after all tests
afterAll(() => {
  global.fetch = originalFetch;
});