import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Add cache-busting for development mode
  const isDev = import.meta.env.DEV;
  let requestUrl = url;
  
  if (isDev) {
    // Add cache-busting query param for GET requests in dev mode
    if (method.toUpperCase() === 'GET') {
      const separator = url.includes('?') ? '&' : '?';
      requestUrl = `${url}${separator}_t=${Date.now()}`;
    }
    console.log(`🔄 ${method} request to ${requestUrl} (dev mode, cache-busting enabled)`);
  }
  
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {})
  };
  
  // Add cache control headers in development mode
  if (isDev) {
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
  }
  
  const res = await fetch(requestUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    // Add cache: 'no-store' in development mode
    ...(isDev ? { cache: 'no-store' } : {})
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const isDev = import.meta.env.DEV;
    const baseUrl = queryKey[0] as string;
    
    // Add cache-busting for GET requests in development mode
    let url = baseUrl;
    if (isDev) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}_t=${Date.now()}`;
    }
    
    const fetchOptions: RequestInit = {
      credentials: "include",
      // Add cache: 'no-store' in development mode to prevent caching
      ...(isDev ? { 
        cache: 'no-store',
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        } 
      } : {})
    };
    
    if (isDev) {
      console.log(`🔍 Fetching data from: ${url} (cache-busting enabled)`);
    }
    
    const res = await fetch(url, fetchOptions);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      if (isDev) console.log(`🔒 Unauthorized request to ${url}, returning null as configured`);
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    
    // In dev mode, log the first few items of data to help with debugging
    if (isDev) {
      const preview = typeof data === 'object' && data !== null
        ? (Array.isArray(data) 
            ? `Array[${data.length}]` 
            : `Object with keys: ${Object.keys(data).join(', ').substring(0, 100)}`)
        : String(data);
      console.log(`✅ Data received from ${baseUrl}: ${preview}`);
    }
    
    return data;
  };

// Configure different Query Client options for development vs production
const isDev = import.meta.env.DEV;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: isDev ? 30000 : false, // In dev mode, refetch every 30 seconds to ensure fresh data
      refetchOnWindowFocus: isDev, // In dev mode, refetch on window focus for latest data
      staleTime: isDev ? 10000 : Infinity, // In dev mode, data becomes stale after 10 seconds
      retry: false,
      gcTime: isDev ? 60000 : 5 * 60 * 1000, // Garbage collection time - shorter in dev mode
    },
    mutations: {
      retry: false,
    },
  },
  // Enable dev tools in development mode for better debugging
  ...(isDev ? { 
    logger: {
      log: (...args) => console.log('[React Query]', ...args),
      warn: (...args) => console.warn('[React Query]', ...args),
      error: (...args) => console.error('[React Query]', ...args),
    }
  } : {})
});
