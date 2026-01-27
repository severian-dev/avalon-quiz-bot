import { Events } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotClient } from '../client.js';
import { updatePresence } from '../services/presenceService.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: BotClient, db: Database.Database): void {
  console.log(`Ready! Logged in as ${client.user?.tag}`);
  updatePresence(client, db);
}
