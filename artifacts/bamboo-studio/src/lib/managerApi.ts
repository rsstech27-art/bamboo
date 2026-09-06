/**
 * Manager API helpers — session-based authentication.
 *
 * The server issues an HttpOnly session cookie on login (POST /api/manager/login).
 * All write requests simply include credentials: 'include' so the browser
 * sends the cookie automatically. No password or token is stored client-side
 * after the login call completes.
 */

/** Send the manager password to the server; returns true on success. */
export async function managerLogin(password: string): Promise<boolean> {
  try {
    const r = await fetch('/api/manager/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Destroy the server-side session. */
export async function managerLogout(): Promise<void> {
  try {
    await fetch('/api/manager/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch { /* best-effort */ }
}

/**
 * Check whether the browser already has an active manager session
 * (used on page reload to skip re-login).
 */
export async function checkManagerSession(): Promise<boolean> {
  try {
    const r = await fetch('/api/manager/session', { credentials: 'include' });
    if (!r.ok) return false;
    const data = await r.json() as { isManager?: boolean };
    return data.isManager === true;
  } catch {
    return false;
  }
}

/**
 * Fetch wrapper that sends the session cookie with every request.
 * Use for all manager write API calls.
 */
export function managerFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, credentials: 'include' });
}
