import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const databasePath = "data/marzban-sentinel.db";

mkdirSync(dirname(databasePath), {
  recursive: true,
});

export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    role TEXT NOT NULL CHECK (
      role IN ('owner', 'admin', 'viewer')
    ),
    created_at INTEGER NOT NULL
  );
`);

const insertUser = db.prepare(`
  INSERT INTO users (
    telegram_id,
    role,
    created_at
  )
  VALUES (
    @telegramId,
    @role,
    @createdAt
  )
  ON CONFLICT(telegram_id)
  DO UPDATE SET role = excluded.role
`);

const findUser = db.prepare(`
  SELECT
    telegram_id AS telegramId,
    role
  FROM users
  WHERE telegram_id = ?
`);

const deleteUser = db.prepare(`
  DELETE FROM users
  WHERE telegram_id = ?
`);

export type DatabaseRole =
  | "owner"
  | "admin"
  | "viewer";

export interface DatabaseUser {
  telegramId: number;
  role: DatabaseRole;
}

export function saveUserRole(
  telegramId: number,
  role: DatabaseRole,
): void {
  insertUser.run({
    telegramId,
    role,
    createdAt: Math.floor(Date.now() / 1000),
  });
}

export function getStoredUserRole(
  telegramId: number,
): DatabaseRole | null {
  const user = findUser.get(
    telegramId,
  ) as DatabaseUser | undefined;

  return user?.role ?? null;
}

const listAdmins = db.prepare(`
  SELECT
    telegram_id AS telegramId,
    role
  FROM users
  WHERE role = 'admin'
  ORDER BY created_at ASC
`);

export function getAdmins(): DatabaseUser[] {
  return listAdmins.all() as DatabaseUser[];
}


export function removeUser(
  telegramId: number,
): void {
  deleteUser.run(telegramId);
}