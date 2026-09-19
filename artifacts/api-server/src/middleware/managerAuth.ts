import type { Request, Response, NextFunction } from "express";

/**
 * Middleware that allows only requests that carry an authenticated manager
 * session (set by POST /api/manager/login).
 */
export function requireManagerSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.session?.isManager === true) {
    next();
  } else {
    res.status(401).json({ error: "Manager session required. Please log in." });
  }
}

/**
 * Middleware that allows only admin sessions (MANAGER_PASSWORD login).
 * Old sessions without isAdmin field are treated as admin for backward compat.
 */
export function requireAdminSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.session?.isManager === true && (req.session.isAdmin === true || req.session.isAdmin === undefined)) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required." });
  }
}
