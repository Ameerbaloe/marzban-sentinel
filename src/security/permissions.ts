import type { Role } from "./auth.js";

export type Permission =
  | "users.view"
  | "users.details"
  | "stats.view"
  | "backup.use"
  | "settings.view"
  | "access.manage";

const rolePermissions: Record<
  Role,
  readonly Permission[]
> = {
  owner: [
    "users.view",
    "users.details",
    "stats.view",
    "backup.use",
    "settings.view",
    "access.manage",
  ],

  admin: [
    "users.view",
    "users.details",
    "stats.view",
    "backup.use",
    "settings.view",
  ],

  viewer: [
    "users.view",
    "users.details",
    "stats.view",
    "settings.view",
  ],
};

export function can(
  role: Role | null,
  permission: Permission,
): boolean {
  if (!role) {
    return false;
  }

  return rolePermissions[role].includes(
    permission,
  );
}