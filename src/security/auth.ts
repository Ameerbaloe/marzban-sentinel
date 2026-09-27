import { env } from "../config/env.js";

export type Role = "owner" | "admin" | "viewer";

export interface UserIdentity {
  telegramId: number;
  role: Role;
}

export function getUserRole(
  telegramId: number,
): Role | null {
  if (telegramId === env.owner.telegramId) {
    return "owner";
  }

  return null;
}

export function isAuthorized(
  telegramId: number,
): boolean {
  return getUserRole(telegramId) !== null;
}

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

  return hierarchy[role] >= hierarchy[requiredRole];
}