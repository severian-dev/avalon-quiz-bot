import type Database from 'better-sqlite3';
import type { QuizAttempt } from '../../types/index.js';

interface AttemptRow {
  id: number;
  user_id: string;
  guild_id: string;
  question_ids: string;
  answers: string;
  current_index: number;
  status: string;
  started_at: string;
  finished_at: string | null;
}

function rowToAttempt(row: AttemptRow): QuizAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    guildId: row.guild_id,
    questionIds: JSON.parse(row.question_ids) as number[],
    answers: JSON.parse(row.answers) as Record<string, string>,
    currentIndex: row.current_index,
    status: row.status as QuizAttempt['status'],
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export function create(
  db: Database.Database,
  userId: string,
  guildId: string,
  questionIds: number[],
): QuizAttempt {
  const stmt = db.prepare(`
    INSERT INTO quiz_attempts (user_id, guild_id, question_ids)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, guildId, JSON.stringify(questionIds));
  return getById(db, result.lastInsertRowid as number)!;
}

export function getById(db: Database.Database, id: number): QuizAttempt | null {
  const stmt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?');
  const row = stmt.get(id) as AttemptRow | undefined;
  return row ? rowToAttempt(row) : null;
}

export function getActiveByUser(
  db: Database.Database,
  userId: string,
  guildId: string,
): QuizAttempt | null {
  const stmt = db.prepare(`
    SELECT * FROM quiz_attempts
    WHERE user_id = ? AND guild_id = ? AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1
  `);
  const row = stmt.get(userId, guildId) as AttemptRow | undefined;
  return row ? rowToAttempt(row) : null;
}

export function updateIndex(db: Database.Database, attemptId: number, index: number): void {
  db.prepare('UPDATE quiz_attempts SET current_index = ? WHERE id = ?').run(index, attemptId);
}

export function saveAnswer(
  db: Database.Database,
  attemptId: number,
  questionId: number,
  answer: string,
): void {
  const attempt = getById(db, attemptId);
  if (!attempt) return;
  const answers = { ...attempt.answers, [String(questionId)]: answer };
  db.prepare('UPDATE quiz_attempts SET answers = ? WHERE id = ?').run(
    JSON.stringify(answers),
    attemptId,
  );
}

export function complete(
  db: Database.Database,
  attemptId: number,
  status: 'passed' | 'failed' | 'abandoned',
): void {
  db.prepare(`
    UPDATE quiz_attempts
    SET status = ?, finished_at = datetime('now')
    WHERE id = ?
  `).run(status, attemptId);
}

export function abandonExpired(db: Database.Database, timeoutMinutes: number): number {
  const result = db.prepare(`
    UPDATE quiz_attempts
    SET status = 'abandoned', finished_at = datetime('now')
    WHERE status = 'in_progress'
      AND datetime(started_at, '+' || ? || ' minutes') < datetime('now')
  `).run(timeoutMinutes);
  return result.changes;
}
