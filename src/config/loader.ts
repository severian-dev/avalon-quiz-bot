import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configSchema } from './schema.js';
import type { BotConfig } from '../types/index.js';

export function loadConfig(path?: string): BotConfig {
  const configPath = path ?? resolve(process.cwd(), 'config.json');
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch {
    throw new Error(`Could not read config file at ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`config.json is not valid JSON`);
  }

  const result = configSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Config validation failed:\n${issues}`);
  }

  return result.data as BotConfig;
}
