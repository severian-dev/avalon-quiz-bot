import { EmbedBuilder } from 'discord.js';
import type { ScoreResult } from '../services/quizService.js';

export function buildResultEmbed(
  result: ScoreResult,
  passThreshold: number,
  passTitle: string,
  passMessage: string,
  passThumbnail?: string,
  cooldownUntil?: Date,
) {
  const embed = new EmbedBuilder();

  if (result.passed) {
    // Replace template variables in pass message
    const message = passMessage
      .replace(/{correct}/g, String(result.correct))
      .replace(/{total}/g, String(result.total));

    embed
      .setTitle(passTitle)
      .setDescription(message)
      .setColor(0x57f287);

    // Add thumbnail if configured
    if (passThumbnail && passThumbnail.trim() !== '') {
      embed.setThumbnail(passThumbnail);
    }
  } else {
    let description = `You answered **${result.correct}/${result.total}** questions correctly. You needed at least **${passThreshold}** to pass.`;

    if (cooldownUntil) {
      const timestamp = Math.floor(cooldownUntil.getTime() / 1000);
      description += `\n\nYou can try again <t:${timestamp}:R>.`;
    }

    embed
      .setTitle('Quiz Failed')
      .setDescription(description)
      .setColor(0xed4245);
  }

  return { embeds: [embed], components: [] };
}
