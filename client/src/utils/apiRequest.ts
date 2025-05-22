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

  // If the session expired, try to refresh silently up to 3 times, then retry the original call.
  if (res.status === 401) {
    console.log(`[API] Received 401 from ${url}, attempting session refresh`);
    
    // Multiple retry attempts with exponential backoff
    let retryAttempt = 0;
    const maxRetries = 3;
    let refreshOK = false;
    
    while (!refreshOK && retryAttempt < maxRetries) {
      try {
        // Direct approach to refresh the session
        const refreshResponse = await fetch('/api/auth/refresh-session', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        refreshOK = refreshResponse.ok;
        
        if (refreshOK) {
          console.log(`[API] Session refresh successful on attempt ${retryAttempt + 1}, retrying request`);
          break;
        } else {
          retryAttempt++;
          if (retryAttempt < maxRetries) {
            const delayMs = Math.min(1000 * Math.pow(2, retryAttempt), 5000); // Exponential backoff with 5s max
            console.log(`[API] Session refresh attempt ${retryAttempt} failed, retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      } catch (err) {
        console.error(`[API] Session refresh error on attempt ${retryAttempt + 1}:`, err);
        retryAttempt++;
        if (retryAttempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
          console.log(`[API] Retrying session refresh in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    if (refreshOK) {
      // Retry the original request if refresh was successful
      try {
        console.log(`[API] Retrying original request to ${url} after session refresh`);
        res = await doFetch();
        console.log(`[API] Retry result status: ${res.status}`);
      } catch (retryErr: any) {
        console.error(`[API] Failed to retry request after refresh:`, retryErr);
        throw new Error(`Failed to complete request after session refresh: ${retryErr?.message || 'Unknown error'}`);
      }
    } else {
      console.error('[API] Session refresh failed after all attempts');
      // Still allow the original error to propagate
    }
  }

  // Any non-2xx after retry is an error.
  if (!res.ok) {
    const text = await res.text();
    
    // Special handling for task-related endpoints
    if (url.includes('/tasks/')) {
      // Customize error messages based on status codes for task operations
      switch (res.status) {
        case 404:
          console.error(`[API] Task not found error for ${method} ${url}`, { response: text });
          throw new Error(`Task not found - the ID may have changed or the task has been deleted`);
        
        case 400:
          console.error(`[API] Invalid task state change for ${method} ${url}`, { response: text });
          throw new Error(`Cannot update task: ${text}`);
        
        case 409:
          console.error(`[API] Task already in requested state for ${method} ${url}`, { response: text });
          throw new Error(`Task is already in that state`);
        
        case 403:
          console.error(`[API] Permission denied for task operation ${method} ${url}`, { response: text });
          throw new Error(`You don't have permission to perform this action on the task`);
          
        case 500:
          console.error(`[API] Server error in task operation ${method} ${url}`, { response: text });
          throw new Error(`Server error while processing task - please try again later`);
          
        case 422:
          console.error(`[API] Validation error in task operation ${method} ${url}`, { response: text });
          throw new Error(`Invalid task data: ${text}`);
          
        default:
          console.error(`[API] Unexpected error ${res.status} for task operation ${method} ${url}`, { response: text });
          throw new Error(`Error updating task (${res.status}): ${text.slice(0,100)}`);
      }
    }
    
    // Handle other errors with detailed logs
    console.error(`API Error (${res.status}) for ${method} ${url}:`, text);
    throw new Error(`[API] ${method} ${url} failed ${res.status}: ${text.slice(0,200)}`);
  }

  // Guard against HTML fallback accidentally being served with 200
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error(`[API] Expected JSON but got ${ct}`);
  }

  return res.json() as Promise<T>;
}