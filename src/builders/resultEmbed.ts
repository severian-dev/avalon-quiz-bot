import { EmbedBuilder } from 'discord.js';
import type { ScoreResult } from '../services/quizService.js';

export function buildResultEmbed(
  result: ScoreResult,
  passThreshold: number,
  cooldownUntil?: Date,
) {
  const embed = new EmbedBuilder();

  if (result.passed) {
    embed
      .setTitle('Quiz Passed!')
      .setDescription(
        `You answered **${result.correct}/${result.total}** questions correctly. You have been assigned the verification role.`,
      )
      .setColor(0x57f287);
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

  return { embeds: [embed], components: [], ephemeral: true };
}
