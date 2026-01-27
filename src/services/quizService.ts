import type Database from 'better-sqlite3';
import type { BotConfig, Question, QuizAttempt } from '../types/index.js';
import { isMultiSelectQuestion } from '../types/index.js';
import * as questionRepo from '../database/repositories/questionRepo.js';
import * as attemptRepo from '../database/repositories/attemptRepo.js';
import { seededShuffle, generateShuffleSeed } from '../utils/shuffle.js';

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
    userAnswer: string | string[] | null;
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
      // Shuffle choices the same way they were displayed to the user
      const seed = generateShuffleSeed(attempt.id, question.id);
      const shuffledChoices = seededShuffle(question.choices, seed);

      const isMultiSelect = isMultiSelectQuestion(question);

      if (isMultiSelect) {
        // Multi-select: must select ALL correct and NO incorrect
        // Find correct indices in the SHUFFLED array
        const correctIndices = shuffledChoices
          .map((c, i) => (c.isCorrect ? String(i) : null))
          .filter((i): i is string => i !== null)
          .sort();

        expectedAnswer = correctIndices
          .map((i) => shuffledChoices[parseInt(i, 10)].label)
          .join(', ');

        if (userAnswer !== null && Array.isArray(userAnswer)) {
          const userIndices = [...userAnswer].sort();
          isCorrect =
            userIndices.length === correctIndices.length &&
            userIndices.every((val, idx) => val === correctIndices[idx]);
        }
      } else {
        // Single-select: check if the shuffled choice at user's index is correct
        const correctChoice = shuffledChoices.find((c) => c.isCorrect);
        expectedAnswer = correctChoice?.label ?? 'Unknown';
        if (userAnswer !== null && typeof userAnswer === 'string') {
          const chosenIndex = parseInt(userAnswer, 10);
          const chosen = shuffledChoices[chosenIndex];
          isCorrect = chosen?.isCorrect ?? false;
        }
      }
    } else {
      expectedAnswer = question.correctAnswer ?? '';
      if (userAnswer !== null && typeof userAnswer === 'string') {
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
