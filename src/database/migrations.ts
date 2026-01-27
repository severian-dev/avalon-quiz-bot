import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      type           TEXT NOT NULL CHECK(type IN ('multiple_choice', 'text_input')),
      question_text  TEXT NOT NULL,
      choices        TEXT,
      correct_answer TEXT,
      explanation    TEXT,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        TEXT NOT NULL,
      guild_id       TEXT NOT NULL,
      question_ids   TEXT NOT NULL,
      answers        TEXT DEFAULT '{}',
      current_index  INTEGER DEFAULT 0,
      status         TEXT DEFAULT 'in_progress'
                       CHECK(status IN ('in_progress', 'passed', 'failed', 'abandoned')),
      started_at     TEXT DEFAULT (datetime('now')),
      finished_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS cooldowns (
      user_id        TEXT NOT NULL,
      guild_id       TEXT NOT NULL,
      fail_count     INTEGER DEFAULT 0,
      last_fail_at   TEXT,
      cooldown_until TEXT,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_user_status
      ON quiz_attempts(user_id, guild_id, status);
  `);
}
