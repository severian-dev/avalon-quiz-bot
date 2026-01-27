import { ActivityType } from 'discord.js';
import type { Client } from 'discord.js';
import type Database from 'better-sqlite3';

interface PresenceStats {
  activeQuizzes: number;
  totalPassed: number;
}

function getStats(db: Database.Database): PresenceStats {
  const active = db.prepare(
    `SELECT COUNT(*) as cnt FROM quiz_attempts WHERE status = 'in_progress'`,
  ).get() as { cnt: number };

  const passed = db.prepare(
    `SELECT COUNT(*) as cnt FROM quiz_attempts WHERE status = 'passed'`,
  ).get() as { cnt: number };

  return {
    activeQuizzes: active.cnt,
    totalPassed: passed.cnt,
  };
}

function formatPresenceText(stats: PresenceStats): string {
  const parts: string[] = [];

  if (stats.activeQuizzes > 0) {
    parts.push(`${stats.activeQuizzes} active quiz${stats.activeQuizzes === 1 ? '' : 'zes'}`);
  }

  parts.push(`${stats.totalPassed} verified`);

  return parts.join(' | ');
}

export function updatePresence(client: Client, db: Database.Database): void {
  if (!client.user) return;

  const stats = getStats(db);

  client.user.setPresence({
    status: 'online',
    activities: [
      {
        name: formatPresenceText(stats),
        type: ActivityType.Watching,
      },
    ],
  });
}
