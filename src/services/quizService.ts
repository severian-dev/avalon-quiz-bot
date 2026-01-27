import type Database from 'better-sqlite3';
import type { BotConfig, Question, QuizAttempt } from '../types/index.js';
import * as questionRepo from '../database/repositories/questionRepo.js';
import * as attemptRepo from '../database/repositories/attemptRepo.js';

export function drawQuestions(db: Database.Database, config: BotConfig): Question[] {
  return questionRepo.getRandom(db, config.quiz.questionsPerQuiz);
}

export function getQuestionAtIndex(
  db: Database.Database,
  attempt: QuizAttempt,
): Question | null {
  const questionId = attempt.questionIds[attempt.currentIndex];
  if (questionId === undefined) return null;
  return questionRepo.getById(db, questionId);
}

export interface ScoreResult {
  correct: number;
  total: number;
  passed: boolean;
  details: Array<{
    questionId: number;
    questionText: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
}

export function scoreAttempt(
  db: Database.Database,
  attempt: QuizAttempt,
  config: BotConfig,
): ScoreResult {
  const details: ScoreResult['details'] = [];
  let correct = 0;

  for (const qId of attempt.questionIds) {
    const question = questionRepo.getById(db, qId);
    if (!question) continue;

    const userAnswer = attempt.answers[String(qId)] ?? null;
    let expectedAnswer: string;
    let isCorrect = false;

    if (question.type === 'multiple_choice' && question.choices) {
      const correctChoice = question.choices.find((c) => c.isCorrect);
      expectedAnswer = correctChoice?.label ?? 'Unknown';
      if (userAnswer !== null) {
        const chosenIndex = parseInt(userAnswer, 10);
        const chosen = question.choices[chosenIndex];
        isCorrect = chosen?.isCorrect ?? false;
      }
    } else {
      expectedAnswer = question.correctAnswer ?? '';
      if (userAnswer !== null) {
        isCorrect = userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();
      }
    }

    if (isCorrect) correct++;

    details.push({
      questionId: qId,
      questionText: question.questionText,
      userAnswer,
      correctAnswer: expectedAnswer,
      isCorrect,
    });
  }

  return {
    correct,
    total: attempt.questionIds.length,
    passed: correct >= config.quiz.passThreshold,
    details,
  };
}

export function isExpired(attempt: QuizAttempt, config: BotConfig): boolean {
  const started = new Date(attempt.startedAt + 'Z');
  const expiresAt = new Date(started.getTime() + config.quiz.timeoutMinutes * 60_000);
  return new Date() > expiresAt;
}

export function startOrResumeQuiz(
  db: Database.Database,
  userId: string,
  guildId: string,
  config: BotConfig,
): { attempt: QuizAttempt; isNew: boolean } | { error: string } {
  // Check existing in-progress attempt
  const existing = attemptRepo.getActiveByUser(db, userId, guildId);
  if (existing) {
    if (isExpired(existing, config)) {
      attemptRepo.complete(db, existing.id, 'abandoned');
    } else {
      return { attempt: existing, isNew: false };
    }
  }

  // Check question pool size
  const poolSize = questionRepo.count(db);
  if (poolSize < config.quiz.questionsPerQuiz) {
    return {
      error: `Not enough questions in the pool. Need ${config.quiz.questionsPerQuiz}, have ${poolSize}. Please contact an admin.`,
    };
  }

  const questions = drawQuestions(db, config);
  const questionIds = questions.map((q) => q.id);
  const attempt = attemptRepo.create(db, userId, guildId, questionIds);
  return { attempt, isNew: true };
}
