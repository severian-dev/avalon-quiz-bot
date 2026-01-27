import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { Question, QuizAttempt } from '../types/index.js';
import { CustomIds } from '../types/index.js';
import { buildNavigationRow } from './navigationRow.js';

export function buildQuestionMessage(
  question: Question,
  attempt: QuizAttempt,
  totalQuestions: number,
) {
  const index = attempt.currentIndex;
  const currentAnswer = attempt.answers[String(question.id)] ?? null;

  const embed = new EmbedBuilder()
    .setTitle(`Question ${index + 1} of ${totalQuestions}`)
    .setColor(0x5865f2);

  if (question.type === 'multiple_choice' && question.choices) {
    const choiceLines = question.choices
      .map((c, i) => {
        const selected = currentAnswer === String(i);
        const prefix = selected ? '**>' : ' ';
        return `${prefix} ${c.emoji} ${c.label}${selected ? ' <**' : ''}`;
      })
      .join('\n');

    embed.setDescription(`${question.questionText}\n\n${choiceLines}`);

    const answerButtons = question.choices.map((choice, i) => {
      const btn = new ButtonBuilder()
        .setCustomId(`${CustomIds.QUIZ_ANSWER_PREFIX}${i}`)
        .setLabel(choice.label)
        .setStyle(
          currentAnswer === String(i) ? ButtonStyle.Success : ButtonStyle.Secondary,
        );
      if (choice.emoji) {
        try {
          btn.setEmoji(choice.emoji);
        } catch {
          // Emoji not valid, skip
        }
      }
      return btn;
    });

    const answerRow = new ActionRowBuilder<ButtonBuilder>().addComponents(answerButtons);
    const navRow = buildNavigationRow(index, totalQuestions);

    return { embeds: [embed], components: [answerRow, navRow], ephemeral: true };
  }

  // Text input question
  let description = question.questionText;
  if (currentAnswer) {
    description += `\n\n**Your answer:** ${currentAnswer}`;
  }
  embed.setDescription(description);

  const modalButton = new ButtonBuilder()
    .setCustomId(CustomIds.QUIZ_MODAL_OPEN)
    .setLabel(currentAnswer ? 'Change Your Answer' : 'Type Your Answer')
    .setStyle(currentAnswer ? ButtonStyle.Success : ButtonStyle.Primary);

  const answerRow = new ActionRowBuilder<ButtonBuilder>().addComponents(modalButton);
  const navRow = buildNavigationRow(index, totalQuestions);

  return { embeds: [embed], components: [answerRow, navRow], ephemeral: true };
}
