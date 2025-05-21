/**
 * Utility to refresh the authentication session
 * Returns true if refresh was successful, false otherwise
 */
export async function tryRefreshSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh-session', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.warn('Session refresh failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Error during auth session refresh:', error);
    return false;
  }
}