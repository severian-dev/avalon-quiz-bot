import type { ModalSubmitInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotConfig } from '../types/index.js';
import { CustomIds } from '../types/index.js';
import * as attemptRepo from '../database/repositories/attemptRepo.js';
import { getQuestionAtIndex, isExpired } from '../services/quizService.js';
import { buildQuestionMessage } from '../builders/questionEmbed.js';

export async function handleQuizModal(
  interaction: ModalSubmitInteraction,
  db: Database.Database,
  config: BotConfig,
): Promise<void> {
  const attempt = attemptRepo.getActiveByUser(db, interaction.user.id, interaction.guildId!);
  if (!attempt) {
    await interaction.reply({
      content: 'No active quiz found. Please start a new one.',
      flags: 64,
    });
    return;
  }

  if (isExpired(attempt, config)) {
    attemptRepo.complete(db, attempt.id, 'abandoned');
    await interaction.reply({
      content: 'Your quiz has timed out. Please start a new one.',
      flags: 64,
    });
    return;
  }

  const answer = interaction.fields.getTextInputValue(CustomIds.QUIZ_MODAL_INPUT);
  const questionId = attempt.questionIds[attempt.currentIndex];

  attemptRepo.saveAnswer(db, attempt.id, questionId, answer);

  const updatedAttempt = attemptRepo.getById(db, attempt.id)!;
  const question = getQuestionAtIndex(db, updatedAttempt);
  if (!question) {
    await interaction.reply({
      content: 'Failed to load question. Please contact an admin.',
      flags: 64,
    });
    return;
  }

  const message = buildQuestionMessage(question, updatedAttempt, updatedAttempt.questionIds.length);
  // Modal submit edits the original message via deferUpdate + editReply
  await interaction.deferUpdate();
  await interaction.editReply(message);
}
