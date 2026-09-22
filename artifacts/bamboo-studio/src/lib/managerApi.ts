/**
 * Manager API helpers — session-based authentication.
 *
 * The server issues an HttpOnly session cookie on login (POST /api/manager/login).
 * All write requests simply include credentials: 'include' so the browser
 * sends the cookie automatically. No password or token is stored client-side
 * after the login call completes.
 */

export interface ManagerSession {
  isManager: boolean;
  /** true = admin (MANAGER_PASSWORD); false = regular manager user. Old sessions without the field → treated as admin. */
  isAdmin: boolean;
  managerId: number | null;
  managerLogin: string | null;
  /** Per-section permissions; null for admin (all allowed). */
  permissions: Record<string, { canRead: boolean; canEdit: boolean; canDelete: boolean }> | null;
}

/**
 * Login to the manager cabinet.
 * Leave login empty (or pass "admin") to log in as the master administrator.
 * Pass a user login + password to log in as a regular manager user.
 */
export async function managerLogin(login: string, password: string): Promise<boolean> {
  try {
    const r = await fetch('/api/manager/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ login: login.trim() || undefined, password }),
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
 * Check whether the browser already has an active manager session.
 * Returns the full session info, or null if not authenticated.
 */
export async function checkManagerSession(): Promise<ManagerSession | null> {
  try {
    const r = await fetch('/api/manager/session', { credentials: 'include' });
    if (!r.ok) return null;
    const data = await r.json() as {
      isManager?: boolean;
      isAdmin?: boolean;
      managerId?: number | null;
      managerLogin?: string | null;
      permissions?: Record<string, { canRead: boolean; canEdit: boolean; canDelete: boolean }> | null;
    };
    if (!data.isManager) return null;
    return {
      isManager:    true,
      isAdmin:      data.isAdmin ?? true, // old sessions without field → treat as admin
      managerId:    data.managerId ?? null,
      managerLogin: data.managerLogin ?? null,
      permissions:  data.permissions ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper that sends the session cookie with every request.
 * Use for all manager write API calls.
 */
export function managerFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, credentials: 'include' });
}
