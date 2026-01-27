import { Events } from 'discord.js';
import type { Interaction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotClient } from '../client.js';
import type { BotConfig } from '../types/index.js';
import { CustomIds } from '../types/index.js';
import { handleQuizStart } from '../handlers/quizStart.js';
import { handleQuizNavigation } from '../handlers/quizNavigation.js';
import { handleQuizAnswer } from '../handlers/quizAnswer.js';
import { handleQuizSubmit } from '../handlers/quizSubmit.js';
import { handleQuizModal } from '../handlers/quizModal.js';
import { buildTextInputModal } from '../builders/modalBuilder.js';
import * as attemptRepo from '../database/repositories/attemptRepo.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(
  interaction: Interaction,
  db: Database.Database,
  config: BotConfig,
): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      const client = interaction.client as BotClient;
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, db, config);
      return;
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === CustomIds.VERIFY_START) {
        return await handleQuizStart(interaction, db, config);
      }
      if (id === CustomIds.QUIZ_PREV || id === CustomIds.QUIZ_NEXT) {
        return await handleQuizNavigation(interaction, db, config);
      }
      if (id.startsWith(CustomIds.QUIZ_ANSWER_PREFIX)) {
        return await handleQuizAnswer(interaction, db, config);
      }
      if (id === CustomIds.QUIZ_SUBMIT) {
        return await handleQuizSubmit(interaction, db, config);
      }
      if (id === CustomIds.QUIZ_MODAL_OPEN) {
        const attempt = attemptRepo.getActiveByUser(db, interaction.user.id, interaction.guildId!);
        if (!attempt) return;
        const modal = buildTextInputModal(attempt);
        await interaction.showModal(modal);
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === CustomIds.QUIZ_MODAL_SUBMIT) {
        return await handleQuizModal(interaction, db, config);
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    const reply = { content: 'Something went wrong. Please try again.', flags: 64 };
    try {
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    } catch {
      // Interaction may have expired
    }
  }
}
