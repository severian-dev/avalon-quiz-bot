import { createClient } from './client.js';
import { loadConfig } from './config/loader.js';
import { initDatabase } from './database/connection.js';
import { registerEvents } from './events/index.js';
import { loadCommands } from './commands/index.js';
import * as attemptRepo from './database/repositories/attemptRepo.js';

// Load config (fails fast if invalid)
const config = loadConfig();

// Initialize database
const db = initDatabase();

// Abandon any expired in-progress quizzes from before restart
attemptRepo.abandonExpired(db, config.quiz.timeoutMinutes);

// Create client and register commands + events
const client = createClient();
await loadCommands(client);
registerEvents(client, db, config);

// Graceful shutdown
function shutdown() {
  console.log('Shutting down...');
  client.destroy();
  db.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Login
await client.login(process.env.DISCORD_TOKEN);
