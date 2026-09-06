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
