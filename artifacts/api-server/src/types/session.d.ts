import "express-session";

declare module "express-session" {
  interface SessionData {
    isManager?: boolean;
    /** true = logged in with MANAGER_PASSWORD (admin). false = regular manager user. */
    isAdmin?: boolean;
    /** DB id of the logged-in manager user (null for admin). */
    managerId?: number;
    /** Login of the logged-in manager user (null for admin). */
    managerLogin?: string;
    /** Per-section permissions for regular manager users. */
    managerPerms?: Record<string, { canRead: boolean; canEdit: boolean; canDelete: boolean }>;
  }
}
