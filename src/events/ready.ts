import { Events } from 'discord.js';
import type { BotClient } from '../client.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: BotClient): void {
  console.log(`Ready! Logged in as ${client.user?.tag}`);
}
