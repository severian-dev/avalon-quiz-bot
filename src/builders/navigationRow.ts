import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { QuizAttempt } from '../types/index.js';
import { CustomIds } from '../types/index.js';

export function buildNavigationRow(
  attempt: QuizAttempt,
): ActionRowBuilder<ButtonBuilder> {
  const currentIndex = attempt.currentIndex;
  const totalQuestions = attempt.questionIds.length;

  // Check if all questions have been answered
  const allAnswered = attempt.questionIds.every((qId) => {
    const answer = attempt.answers[String(qId)];
    // Answer exists and is not empty
    if (answer === null || answer === undefined) return false;
    // For arrays (multi-select), check if at least one choice is selected
    if (Array.isArray(answer)) return answer.length > 0;
    // For strings, check if not empty
    return answer.trim().length > 0;
  });

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
    .setStyle(ButtonStyle.Danger)
    .setDisabled(!allAnswered);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next, submit);
}
