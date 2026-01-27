import type { BotClient, Command } from '../client.js';
import * as setupVerification from './setup-verification.js';
import * as quizAdmin from './quiz-admin.js';

const commands: Command[] = [
  setupVerification as unknown as Command,
  quizAdmin as unknown as Command,
];

export async function loadCommands(client: BotClient): Promise<void> {
  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }
}

export function getCommandData(): unknown[] {
  return commands.map((c) => c.data.toJSON());
}
