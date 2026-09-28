import { env } from "../config/env.js";
import {
  getStoredUserRole,
  saveUserRole,
  type DatabaseRole,
} from "../database/db.js";

export type Role =
  | "owner"
  | "admin"
  | "viewer";

export interface UserIdentity {
  telegramId: number;
  role: Role;
}

/**
 * Get the role of a Telegram user.
 *
 * Owner is always determined by OWNER_TELEGRAM_ID.
 * Admin and Viewer roles are stored in SQLite.
 */
export function getUserRole(
  telegramId: number,
): Role | null {
  if (telegramId === env.owner.telegramId) {
    return "owner";
  }

  const storedRole =
    getStoredUserRole(telegramId);

  if (!storedRole) {
    return null;
  }

  return storedRole;
}

/**
 * Check whether a Telegram user
 * has any registered role.
 */
export function isAuthorized(
  telegramId: number,
): boolean {
  const role =
    getUserRole(telegramId);

  return (
    role === "owner" ||
    role === "admin"
  );
}

/**
 * Check whether a role has enough
 * permission for the requested role.
 *
 * viewer < admin < owner
 */
export function hasPermission(
  role: Role | null,
  requiredRole: Role,
): boolean {
  if (!role) {
    return false;
  }

  const hierarchy: Record<Role, number> = {
    viewer: 1,
    admin: 2,
    owner: 3,
  };

  return (
    hierarchy[role] >=
    hierarchy[requiredRole]
  );
}

/**
 * Add or update a user's role.
 *
 * The Owner role cannot be changed through
 * this function.
 */
export function setUserRole(
  telegramId: number,
  role: DatabaseRole,
): void {
  if (
    telegramId ===
    env.owner.telegramId
  ) {
    throw new Error(
      "The owner role cannot be changed.",
    );
  }

  saveUserRole(
    telegramId,
    role,
  );
}