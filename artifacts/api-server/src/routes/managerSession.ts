import { Router, type IRouter } from "express";
import { timingSafeEqual, createHash } from "crypto";
import { requireManagerSession } from "../middleware/managerAuth";

const router: IRouter = Router();

// ── Brute-force protection ────────────────────────────────────────────────────
// Simple in-memory rate limiter: max 10 failed attempts per IP per 15 minutes.
// Intentionally shared across all instances in the same process.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now >= entry.resetAt) {
    loginAttempts.delete(ip);
    return true; // allow
  }
  return entry.count < MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// ── Timing-safe password comparison ──────────────────────────────────────────
function hashBuffer(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

function safePasswordEqual(a: string, b: string): boolean {
  return timingSafeEqual(hashBuffer(a), hashBuffer(b));
}

/**
 * POST /api/manager/login
 * Body: { password: string }
 * Verifies the password against MANAGER_PASSWORD env var and sets an
 * HttpOnly session cookie on success.
 */
router.post("/manager/login", (req, res) => {
  const MANAGER_PASSWORD = process.env["MANAGER_PASSWORD"];

  if (!MANAGER_PASSWORD) {
    // Server is not configured — fail closed, never let anyone in
    return void res.status(503).json({
      error: "Manager access is not configured on this server.",
    });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return void res.status(429).json({
      error: "Too many failed login attempts. Please try again later.",
    });
  }

  const { password } = req.body as { password?: string };

  if (!password || !safePasswordEqual(password, MANAGER_PASSWORD)) {
    recordFailure(ip);
    return void res.status(401).json({ error: "Invalid password." });
  }

  clearAttempts(ip);
  req.session.isManager = true;
  req.session.save((err) => {
    if (err) {
      return void res
        .status(500)
        .json({ error: "Session save failed.", detail: String(err) });
    }
    res.json({ ok: true });
  });
});

/**
 * POST /api/manager/logout
 * Destroys the manager session.
 */
router.post("/manager/logout", requireManagerSession, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return void res.status(500).json({ error: "Logout failed.", detail: String(err) });
    }
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

/**
 * GET /api/manager/session
 * Returns whether the caller has an active manager session (used on page reload).
 */
router.get("/manager/session", (req, res) => {
  res.json({ isManager: req.session?.isManager === true });
});

export default router;
