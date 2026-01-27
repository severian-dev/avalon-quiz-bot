import type { ButtonInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotConfig } from '../types/index.js';
import { checkCooldown, formatDuration } from '../services/cooldownService.js';
import { startOrResumeQuiz, getQuestionAtIndex } from '../services/quizService.js';
import { buildQuestionMessage } from '../builders/questionEmbed.js';

export async function handleQuizStart(
  interaction: ButtonInteraction,
  db: Database.Database,
  config: BotConfig,
): Promise<void> {
  const userId = interaction.user.id;
  const guildId = interaction.guildId!;

  // Check cooldown
  const cooldown = checkCooldown(db, userId, guildId);
  if (cooldown.blocked) {
    const timestamp = Math.floor(cooldown.retryAfter!.getTime() / 1000);
    await interaction.reply({
      content: `You're on cooldown. You can try again <t:${timestamp}:R>.`,
      ephemeral: true,
    });
    return;
  }

  // Start or resume quiz
  const result = startOrResumeQuiz(db, userId, guildId, config);
  if ('error' in result) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  const { attempt } = result;
  const question = getQuestionAtIndex(db, attempt);
  if (!question) {
    await interaction.reply({
      content: 'Failed to load quiz question. Please contact an admin.',
      ephemeral: true,
    });
    return;
  }

  const message = buildQuestionMessage(question, attempt, attempt.questionIds.length);
  await interaction.reply({ ...message, ephemeral: true });
}
