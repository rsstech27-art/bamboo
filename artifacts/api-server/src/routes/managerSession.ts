import { Router, type IRouter } from "express";
import { requireManagerSession } from "../middleware/managerAuth";

const router: IRouter = Router();

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

  const { password } = req.body as { password?: string };

  if (!password || password !== MANAGER_PASSWORD) {
    return void res.status(401).json({ error: "Invalid password." });
  }

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
