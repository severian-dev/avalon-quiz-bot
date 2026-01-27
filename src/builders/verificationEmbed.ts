import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { BotConfig } from '../types/index.js';
import { CustomIds } from '../types/index.js';

export function buildVerificationEmbed(config: BotConfig) {
  const embed = new EmbedBuilder()
    .setTitle(config.verification.embedTitle)
    .setDescription(config.verification.embedDescription)
    .setColor(parseInt(config.verification.embedColor.replace('#', ''), 16));

  // Add thumbnail if configured
  if (config.verification.embedThumbnail && config.verification.embedThumbnail.trim() !== '') {
    embed.setThumbnail(config.verification.embedThumbnail);
  }

  const button = new ButtonBuilder()
    .setCustomId(CustomIds.VERIFY_START)
    .setLabel(config.verification.buttonLabel)
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  return { embeds: [embed], components: [row] };
}
