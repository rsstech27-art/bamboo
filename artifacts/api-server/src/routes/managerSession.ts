import { Router, type IRouter } from "express";
import { timingSafeEqual, createHash } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
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
 * Body: { login?: string, password: string }
 *
 * Two login modes:
 *  • Admin — login omitted or empty → validates against MANAGER_PASSWORD.
 *  • User  — login provided → validates against manager_users table.
 */
router.post("/manager/login", async (req, res) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return void res.status(429).json({
      error: "Too many failed login attempts. Please try again later.",
    });
  }

  const { login, password } = req.body as { login?: string; password?: string };

  if (!password) {
    recordFailure(ip);
    return void res.status(400).json({ error: "Password required." });
  }

  // ── Admin login (no login field, or login = "admin") ────────────────────────
  if (!login || login.trim() === "" || login.trim().toLowerCase() === "admin") {
    const MANAGER_PASSWORD = process.env["MANAGER_PASSWORD"];
    if (!MANAGER_PASSWORD) {
      return void res.status(503).json({
        error: "Manager access is not configured on this server.",
      });
    }
    if (!safePasswordEqual(password, MANAGER_PASSWORD)) {
      recordFailure(ip);
      return void res.status(401).json({ error: "Неверные учётные данные." });
    }
    clearAttempts(ip);
    return void req.session.regenerate((regenErr) => {
      if (regenErr) return void res.status(500).json({ error: "Session error." });
      req.session.isManager = true;
      req.session.isAdmin   = true;
      req.session.save((saveErr) => {
        if (saveErr) return void res.status(500).json({ error: "Session save failed." });
        res.json({ ok: true, isAdmin: true });
      });
    });
  }

  // ── Manager user login ────────────────────────────────────────────────────
  try {
    const userResult = await db.execute(sql`
      SELECT id, password_hash FROM manager_users WHERE login = ${login.trim()}
    `);

    if (userResult.rows.length === 0) {
      recordFailure(ip);
      return void res.status(401).json({ error: "Неверные учётные данные." });
    }

    const user = userResult.rows[0];
    const inputHash = createHash("sha256").update(password, "utf8").digest("hex");
    const storedHash = user.password_hash as string;

    if (!timingSafeEqual(
      Buffer.from(inputHash,  "utf8"),
      Buffer.from(storedHash, "utf8"),
    )) {
      recordFailure(ip);
      return void res.status(401).json({ error: "Неверные учётные данные." });
    }

    // Load permissions for this user
    const permsResult = await db.execute(sql`
      SELECT section, can_read, can_edit, can_delete
      FROM manager_permissions WHERE user_id = ${user.id}
    `);
    const permissions: Record<string, { canRead: boolean; canEdit: boolean; canDelete: boolean }> = {};
    for (const p of permsResult.rows) {
      permissions[p.section as string] = {
        canRead:   Boolean(p.can_read),
        canEdit:   Boolean(p.can_edit),
        canDelete: Boolean(p.can_delete),
      };
    }

    clearAttempts(ip);
    return void req.session.regenerate((regenErr) => {
      if (regenErr) return void res.status(500).json({ error: "Session error." });
      req.session.isManager    = true;
      req.session.isAdmin      = false;
      req.session.managerId    = user.id as number;
      req.session.managerLogin = login.trim();
      req.session.managerPerms = permissions;
      req.session.save((saveErr) => {
        if (saveErr) return void res.status(500).json({ error: "Session save failed." });
        res.json({ ok: true, isAdmin: false, login: login.trim(), permissions });
      });
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
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
 * Returns the current session info (used on page reload).
 */
router.get("/manager/session", (req, res) => {
  if (!req.session?.isManager) {
    return void res.json({ isManager: false });
  }
  res.json({
    isManager:    true,
    // Old sessions without isAdmin are treated as admin (backward compat)
    isAdmin:      req.session.isAdmin ?? true,
    managerId:    req.session.managerId ?? null,
    managerLogin: req.session.managerLogin ?? null,
    permissions:  req.session.managerPerms ?? null,
  });
});

export default router;
