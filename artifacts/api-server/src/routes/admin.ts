/**
 * Admin routes — user management for the manager cabinet.
 * All endpoints require an admin session (MANAGER_PASSWORD login).
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { requireAdminSession } from "../middleware/managerAuth";

const router = Router();

function hashPassword(pw: string): string {
  return createHash("sha256").update(pw, "utf8").digest("hex");
}

/** 12-char random password: upper+lower+digits, avoiding ambiguous chars */
function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes)
    .map(b => chars[b % chars.length])
    .join("");
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/admin/users", requireAdminSession, async (_req, res) => {
  try {
    const users = await db.execute(sql`
      SELECT id, login, created_at FROM manager_users ORDER BY created_at
    `);
    const perms = await db.execute(sql`
      SELECT user_id, section, can_read, can_edit, can_delete
      FROM manager_permissions
    `);

    // Group permissions by user_id
    const permsByUser: Record<number, Record<string, { canRead: boolean; canEdit: boolean; canDelete: boolean }>> = {};
    for (const p of perms.rows) {
      const uid = p.user_id as number;
      if (!permsByUser[uid]) permsByUser[uid] = {};
      permsByUser[uid][p.section as string] = {
        canRead:   Boolean(p.can_read),
        canEdit:   Boolean(p.can_edit),
        canDelete: Boolean(p.can_delete),
      };
    }

    res.json(
      users.rows.map(u => ({
        id:          u.id,
        login:       u.login,
        createdAt:   u.created_at,
        permissions: permsByUser[u.id as number] ?? {},
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to load users." });
  }
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────
router.post("/admin/users", requireAdminSession, async (req, res) => {
  const { login } = req.body as { login?: string };
  if (!login?.trim()) {
    return void res.status(400).json({ error: "Login is required." });
  }

  const password     = generatePassword();
  const passwordHash = hashPassword(password);

  try {
    const result = await db.execute(sql`
      INSERT INTO manager_users (login, password_hash)
      VALUES (${login.trim()}, ${passwordHash})
      RETURNING id, login, created_at
    `);
    const user = result.rows[0];
    // Return the plain-text password ONCE — it will not be stored or shown again.
    res.status(201).json({ id: user.id, login: user.login, createdAt: user.created_at, password });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return void res.status(409).json({ error: "Пользователь с таким логином уже существует." });
    }
    res.status(500).json({ error: "Failed to create user." });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete("/admin/users/:id", requireAdminSession, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id." });
  await db.execute(sql`DELETE FROM manager_users WHERE id = ${id}`);
  res.json({ ok: true });
});

// ── POST /api/admin/users/:id/reset-password ──────────────────────────────────
router.post("/admin/users/:id/reset-password", requireAdminSession, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id." });

  const password     = generatePassword();
  const passwordHash = hashPassword(password);
  await db.execute(sql`
    UPDATE manager_users SET password_hash = ${passwordHash} WHERE id = ${id}
  `);
  res.json({ password });
});

// ── PUT /api/admin/users/:id/permissions ─────────────────────────────────────
router.put("/admin/users/:id/permissions", requireAdminSession, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid id." });

  const { section, canRead, canEdit, canDelete } = req.body as {
    section?: string;
    canRead?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  };

  if (!section) return void res.status(400).json({ error: "section is required." });

  await db.execute(sql`
    INSERT INTO manager_permissions (user_id, section, can_read, can_edit, can_delete)
    VALUES (${id}, ${section}, ${Boolean(canRead)}, ${Boolean(canEdit)}, ${Boolean(canDelete)})
    ON CONFLICT (user_id, section) DO UPDATE SET
      can_read   = EXCLUDED.can_read,
      can_edit   = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete
  `);
  res.json({ ok: true });
});

export default router;
