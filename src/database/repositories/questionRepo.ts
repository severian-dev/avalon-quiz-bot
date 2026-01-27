import type Database from 'better-sqlite3';
import type { Question, Choice } from '../../types/index.js';

interface QuestionRow {
  id: number;
  type: string;
  question_text: string;
  choices: string | null;
  correct_answer: string | null;
  explanation: string | null;
  created_at: string;
}

function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    type: row.type as Question['type'],
    questionText: row.question_text,
    choices: row.choices ? JSON.parse(row.choices) as Choice[] : null,
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    createdAt: row.created_at,
  };
}

export function add(
  db: Database.Database,
  type: Question['type'],
  questionText: string,
  choices: Choice[] | null,
  correctAnswer: string | null,
  explanation: string | null,
): number {
  const stmt = db.prepare(`
    INSERT INTO questions (type, question_text, choices, correct_answer, explanation)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    type,
    questionText,
    choices ? JSON.stringify(choices) : null,
    correctAnswer,
    explanation,
  );
  return result.lastInsertRowid as number;
}

export function remove(db: Database.Database, id: number): boolean {
  const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getById(db: Database.Database, id: number): Question | null {
  const stmt = db.prepare('SELECT * FROM questions WHERE id = ?');
  const row = stmt.get(id) as QuestionRow | undefined;
  return row ? rowToQuestion(row) : null;
}

export function getAll(db: Database.Database, limit = 50, offset = 0): Question[] {
  const stmt = db.prepare('SELECT * FROM questions ORDER BY id LIMIT ? OFFSET ?');
  const rows = stmt.all(limit, offset) as QuestionRow[];
  return rows.map(rowToQuestion);
}

export function getRandom(db: Database.Database, count: number): Question[] {
  const stmt = db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT ?');
  const rows = stmt.all(count) as QuestionRow[];
  return rows.map(rowToQuestion);
}

export function count(db: Database.Database): number {
  const stmt = db.prepare('SELECT COUNT(*) as cnt FROM questions');
  const row = stmt.get() as { cnt: number };
  return row.cnt;
}

export function addMany(
  db: Database.Database,
  questions: Array<{
    type: Question['type'];
    questionText: string;
    choices?: Choice[] | null;
    correctAnswer?: string | null;
    explanation?: string | null;
  }>,
): number {
  const stmt = db.prepare(`
    INSERT INTO questions (type, question_text, choices, correct_answer, explanation)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: typeof questions) => {
    let inserted = 0;
    for (const q of items) {
      stmt.run(
        q.type,
        q.questionText,
        q.choices ? JSON.stringify(q.choices) : null,
        q.correctAnswer ?? null,
        q.explanation ?? null,
      );
      inserted++;
    }
    return inserted;
  });

  return insertMany(questions);
}
