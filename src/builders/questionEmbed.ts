import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { Question, QuizAttempt } from '../types/index.js';
import { CustomIds, isMultiSelectQuestion } from '../types/index.js';
import { buildNavigationRow } from './navigationRow.js';
import { seededShuffle, generateShuffleSeed } from '../utils/shuffle.js';

export function buildQuestionMessage(
  question: Question,
  attempt: QuizAttempt,
  totalQuestions: number,
) {
  const index = attempt.currentIndex;
  const currentAnswer = attempt.answers[String(question.id)] ?? null;
  const isMultiSelect = isMultiSelectQuestion(question);

  const embed = new EmbedBuilder()
    .setTitle(
      `Question ${index + 1} of ${totalQuestions}${isMultiSelect ? ' (Select all that apply)' : ''}`,
    )
    .setColor(0x5865f2);

  if (question.type === 'multiple_choice' && question.choices) {
    // Shuffle choices deterministically based on attempt and question ID
    const seed = generateShuffleSeed(attempt.id, question.id);
    const shuffledChoices = seededShuffle(question.choices, seed);

    // Fixed emojis for display (1️⃣ 2️⃣ 3️⃣ 4️⃣)
    const displayEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

    const choiceLines = shuffledChoices
      .map((c, i) => {
        const selected = isMultiSelect
          ? Array.isArray(currentAnswer) && currentAnswer.includes(String(i))
          : currentAnswer === String(i);
        const prefix = selected ? '**>' : ' ';
        const emoji = displayEmojis[i] || `${i + 1}️⃣`;
        return `${prefix} ${emoji} ${c.label}${selected ? ' <**' : ''}`;
      })
      .join('\n');

    embed.setDescription(`${question.questionText}\n\n${choiceLines}`);

    const answerButtons = shuffledChoices.map((choice, i) => {
      const selected = isMultiSelect
        ? Array.isArray(currentAnswer) && currentAnswer.includes(String(i))
        : currentAnswer === String(i);

      const emoji = displayEmojis[i] || `${i + 1}️⃣`;

      const btn = new ButtonBuilder()
        .setCustomId(`${CustomIds.QUIZ_ANSWER_PREFIX}${i}`)
        .setStyle(
          selected
            ? ButtonStyle.Success
            : isMultiSelect
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary,
        )
        .setEmoji(emoji)
        .setLabel(' '); // Space required when emoji is present

      return btn;
    });

    const answerRow = new ActionRowBuilder<ButtonBuilder>().addComponents(answerButtons);
    const navRow = buildNavigationRow(attempt);

    return { embeds: [embed], components: [answerRow, navRow] };
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
  const navRow = buildNavigationRow(attempt);

  return { embeds: [embed], components: [answerRow, navRow] };
}
