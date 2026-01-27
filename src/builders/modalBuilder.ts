import {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { QuizAttempt } from '../types/index.js';
import { CustomIds } from '../types/index.js';

export function buildTextInputModal(attempt: QuizAttempt): ModalBuilder {
  const rawAnswer = attempt.answers[String(attempt.questionIds[attempt.currentIndex])] ?? '';
  // Text input questions always store string answers, not arrays
  const currentAnswer = typeof rawAnswer === 'string' ? rawAnswer : '';

  const modal = new ModalBuilder()
    .setCustomId(CustomIds.QUIZ_MODAL_SUBMIT)
    .setTitle('Enter Your Answer');

  const input = new TextInputBuilder()
    .setCustomId(CustomIds.QUIZ_MODAL_INPUT)
    .setLabel('Your answer')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  if (currentAnswer) {
    input.setValue(currentAnswer);
  }

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
  modal.addComponents(row);

  return modal;
}
