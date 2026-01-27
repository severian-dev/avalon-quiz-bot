export interface Choice {
  emoji: string;
  label: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  type: 'multiple_choice' | 'text_input';
  questionText: string;
  choices: Choice[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  createdAt: string;
}

export interface QuizAttempt {
  id: number;
  userId: string;
  guildId: string;
  questionIds: number[];
  answers: Record<string, string | string[]>;
  currentIndex: number;
  status: 'in_progress' | 'passed' | 'failed' | 'abandoned';
  startedAt: string;
  finishedAt: string | null;
}

export interface CooldownRecord {
  userId: string;
  guildId: string;
  failCount: number;
  lastFailAt: string | null;
  cooldownUntil: string | null;
}

/**
 * Determines if a question requires multiple selections.
 * A question is multi-select if it has more than one correct choice.
 */
export function isMultiSelectQuestion(question: Question): boolean {
  if (question.type !== 'multiple_choice' || !question.choices) {
    return false;
  }
  const correctCount = question.choices.filter((c) => c.isCorrect).length;
  return correctCount > 1;
}
