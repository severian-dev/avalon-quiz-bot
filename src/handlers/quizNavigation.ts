import type { ButtonInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotConfig } from '../types/index.js';
import { CustomIds } from '../types/index.js';
import * as attemptRepo from '../database/repositories/attemptRepo.js';
import { getQuestionAtIndex, isExpired } from '../services/quizService.js';
import { buildQuestionMessage } from '../builders/questionEmbed.js';

export async function handleQuizNavigation(
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

  const direction = interaction.customId === CustomIds.QUIZ_NEXT ? 1 : -1;
  const newIndex = Math.max(0, Math.min(attempt.questionIds.length - 1, attempt.currentIndex + direction));

  attemptRepo.updateIndex(db, attempt.id, newIndex);

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
