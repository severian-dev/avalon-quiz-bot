import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CustomIds } from '../types/index.js';

export function buildNavigationRow(
  currentIndex: number,
  totalQuestions: number,
): ActionRowBuilder<ButtonBuilder> {
  const prev = new ButtonBuilder()
    .setCustomId(CustomIds.QUIZ_PREV)
    .setLabel('<< Prev')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentIndex === 0);

  const next = new ButtonBuilder()
    .setCustomId(CustomIds.QUIZ_NEXT)
    .setLabel('Next >>')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentIndex >= totalQuestions - 1);

  const submit = new ButtonBuilder()
    .setCustomId(CustomIds.QUIZ_SUBMIT)
    .setLabel('Submit Quiz')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next, submit);
}
