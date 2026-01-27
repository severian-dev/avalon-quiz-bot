import type Database from 'better-sqlite3';
import type { CooldownRecord } from '../../types/index.js';

interface CooldownRow {
  user_id: string;
  guild_id: string;
  fail_count: number;
  last_fail_at: string | null;
  cooldown_until: string | null;
}

function rowToRecord(row: CooldownRow): CooldownRecord {
  return {
    userId: row.user_id,
    guildId: row.guild_id,
    failCount: row.fail_count,
    lastFailAt: row.last_fail_at,
    cooldownUntil: row.cooldown_until,
  };
}

export function get(
  db: Database.Database,
  userId: string,
  guildId: string,
): CooldownRecord | null {
  const stmt = db.prepare('SELECT * FROM cooldowns WHERE user_id = ? AND guild_id = ?');
  const row = stmt.get(userId, guildId) as CooldownRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function upsert(
  db: Database.Database,
  userId: string,
  guildId: string,
  failCount: number,
  cooldownUntil: string,
): void {
  db.prepare(`
    INSERT INTO cooldowns (user_id, guild_id, fail_count, last_fail_at, cooldown_until)
    VALUES (?, ?, ?, datetime('now'), ?)
    ON CONFLICT(user_id, guild_id) DO UPDATE SET
      fail_count = excluded.fail_count,
      last_fail_at = excluded.last_fail_at,
      cooldown_until = excluded.cooldown_until
  `).run(userId, guildId, failCount, cooldownUntil);
}

export function reset(db: Database.Database, userId: string, guildId: string): void {
  db.prepare(`
    DELETE FROM cooldowns WHERE user_id = ? AND guild_id = ?
  `).run(userId, guildId);
}
