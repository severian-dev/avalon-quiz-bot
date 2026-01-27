import type { ButtonInteraction, GuildMember } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotConfig } from '../types/index.js';
import * as attemptRepo from '../database/repositories/attemptRepo.js';
import { scoreAttempt, isExpired } from '../services/quizService.js';
import { recordFailure, resetCooldown } from '../services/cooldownService.js';
import { assignVerifiedRole } from '../services/roleService.js';
import { buildResultEmbed } from '../builders/resultEmbed.js';
import { updatePresence } from '../services/presenceService.js';

export async function handleQuizSubmit(
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

  const result = scoreAttempt(db, attempt, config);

  if (result.passed) {
    attemptRepo.complete(db, attempt.id, 'passed');

    if (config.cooldown.resetOnPass) {
      resetCooldown(db, interaction.user.id, interaction.guildId!);
    }

    // Assign role
    const member = interaction.member;
    if (member && 'roles' in member && 'cache' in member.roles) {
      const roleResult = await assignVerifiedRole(member as GuildMember, config);
      if (!roleResult.success) {
        console.error('Role assignment failed:', roleResult.error);
      }
    }

    const message = buildResultEmbed(
      result,
      config.quiz.passThreshold,
      config.verification.passTitle,
      config.verification.passMessage,
      config.verification.passThumbnail,
    );
    await interaction.update(message);
    updatePresence(interaction.client, db);
  } else {
    attemptRepo.complete(db, attempt.id, 'failed');

    const cooldownUntil = recordFailure(
      db,
      interaction.user.id,
      interaction.guildId!,
      config,
    );

    const message = buildResultEmbed(
      result,
      config.quiz.passThreshold,
      config.verification.passTitle,
      config.verification.passMessage,
      config.verification.passThumbnail,
      cooldownUntil,
    );
    await interaction.update(message);
    updatePresence(interaction.client, db);
  }
}
