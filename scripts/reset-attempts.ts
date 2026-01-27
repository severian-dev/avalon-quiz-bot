#!/usr/bin/env node
import { initDatabase } from '../src/database/connection.js';

const db = initDatabase();

console.log('Resetting quiz attempts and cooldowns...');

// Abandon all in-progress attempts
const abandonResult = db.prepare(`
  UPDATE quiz_attempts
  SET status = 'abandoned', finished_at = datetime('now')
  WHERE status = 'in_progress'
`).run();

console.log(`✓ Abandoned ${abandonResult.changes} in-progress quiz attempts`);

// Clear all cooldowns
const cooldownResult = db.prepare(`
  DELETE FROM cooldowns
`).run();

console.log(`✓ Cleared ${cooldownResult.changes} cooldown records`);

db.close();
console.log('✓ Done! All attempts reset.');
