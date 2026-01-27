import type { ButtonInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotConfig } from '../types/index.js';
import { CustomIds } from '../types/index.js';
import * as attemptRepo from '../database/repositories/attemptRepo.js';
import { getQuestionAtIndex, isExpired } from '../services/quizService.js';
import { buildQuestionMessage } from '../builders/questionEmbed.js';

export async function handleQuizAnswer(
  interaction: ButtonInteraction,
  db: Database.Database,
  config: BotConfig,
): Promise<void> {
  const attempt = attemptRepo.getActiveByUser(db, interaction.user.id, interaction.guildId!);
  if (!attempt) {
    await interaction.update({
      content: 'No active quiz found. Please start a new one.',
      embeds: [],
      components: [],
    });
    return;
  }

  if (isExpired(attempt, config)) {
    attemptRepo.complete(db, attempt.id, 'abandoned');
    await interaction.update({
      content: 'Your quiz has timed out. Please start a new one.',
      embeds: [],
      components: [],
    });
    return;
  }

  // Extract choice index from custom ID: "quiz:answer:2" -> "2"
  const choiceIndex = interaction.customId.slice(CustomIds.QUIZ_ANSWER_PREFIX.length);
  const questionId = attempt.questionIds[attempt.currentIndex];

  attemptRepo.saveAnswer(db, attempt.id, questionId, choiceIndex);

  const updatedAttempt = attemptRepo.getById(db, attempt.id)!;
  const question = getQuestionAtIndex(db, updatedAttempt);
  if (!question) {
    await interaction.update({
      content: 'Failed to load question. Please contact an admin.',
      embeds: [],
      components: [],
    });
    return;
  }

  const message = buildQuestionMessage(question, updatedAttempt, updatedAttempt.questionIds.length);
  await interaction.update(message);
}
