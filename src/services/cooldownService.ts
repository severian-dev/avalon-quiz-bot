import type Database from 'better-sqlite3';
import type { BotConfig } from '../types/index.js';
import * as cooldownRepo from '../database/repositories/cooldownRepo.js';

export interface CooldownCheck {
  blocked: boolean;
  retryAfter?: Date;
}

export function checkCooldown(
  db: Database.Database,
  userId: string,
  guildId: string,
): CooldownCheck {
  const record = cooldownRepo.get(db, userId, guildId);
  if (!record?.cooldownUntil) return { blocked: false };

  const cooldownEnd = new Date(record.cooldownUntil + 'Z');
  if (cooldownEnd > new Date()) {
    return { blocked: true, retryAfter: cooldownEnd };
  }
  return { blocked: false };
}

export function recordFailure(
  db: Database.Database,
  userId: string,
  guildId: string,
  config: BotConfig,
): Date {
  const record = cooldownRepo.get(db, userId, guildId);
  const newFailCount = (record?.failCount ?? 0) + 1;
  const cooldownMinutes = calculateCooldownMinutes(newFailCount, config);
  const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60_000);
  cooldownRepo.upsert(db, userId, guildId, newFailCount, cooldownUntil.toISOString().replace('Z', ''));
  return cooldownUntil;
}

export function resetCooldown(
  db: Database.Database,
  userId: string,
  guildId: string,
): void {
  cooldownRepo.reset(db, userId, guildId);
}

function calculateCooldownMinutes(failCount: number, config: BotConfig): number {
  const minutes = config.cooldown.baseMinutes * Math.pow(2, failCount - 1);
  return Math.min(minutes, config.cooldown.maxMinutes);
}

export function formatDuration(until: Date): string {
  const diffMs = until.getTime() - Date.now();
  if (diffMs <= 0) return 'now';

  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${hours}h ${minutes}m`;
}
