import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotConfig, Choice } from '../types/index.js';
import * as questionRepo from '../database/repositories/questionRepo.js';

export const data = new SlashCommandBuilder()
  .setName('quiz-admin')
  .setDescription('Manage quiz questions')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('add-mc')
      .setDescription('Add a multiple-choice question')
      .addStringOption((opt) =>
        opt.setName('question').setDescription('The question text').setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('choices')
          .setDescription('Choices as JSON: [{"emoji":"🅰️","label":"Answer","isCorrect":false},...]')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName('explanation').setDescription('Optional explanation').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('add-text')
      .setDescription('Add a text-input question')
      .addStringOption((opt) =>
        opt.setName('question').setDescription('The question text').setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName('answer').setDescription('The correct answer (case-insensitive)').setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName('explanation').setDescription('Optional explanation').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Remove a question by ID')
      .addIntegerOption((opt) =>
        opt.setName('id').setDescription('Question ID').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('List all questions')
      .addIntegerOption((opt) =>
        opt.setName('page').setDescription('Page number (default 1)').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('import')
      .setDescription('Bulk-import questions from a JSON attachment')
      .addAttachmentOption((opt) =>
        opt.setName('file').setDescription('JSON file with questions').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('stats')
      .setDescription('View quiz statistics')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('Specific user (optional)').setRequired(false),
      ),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
  config: BotConfig,
): Promise<void> {
  // Check admin role
  const member = interaction.member;
  if (member && 'roles' in member && typeof member.roles === 'object' && 'cache' in member.roles) {
    if (!member.roles.cache.has(config.admin.roleId)) {
      await interaction.reply({
        content: 'You do not have the required admin role.',
        flags: 64,
      });
      return;
    }
  }

  const sub = interaction.options.getSubcommand();

  switch (sub) {
    case 'add-mc':
      return handleAddMC(interaction, db);
    case 'add-text':
      return handleAddText(interaction, db);
    case 'remove':
      return handleRemove(interaction, db);
    case 'list':
      return handleList(interaction, db);
    case 'import':
      return handleImport(interaction, db);
    case 'stats':
      return handleStats(interaction, db);
  }
}

async function handleAddMC(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  const questionText = interaction.options.getString('question', true);
  const choicesRaw = interaction.options.getString('choices', true);
  const explanation = interaction.options.getString('explanation');

  let choices: Choice[];
  try {
    choices = JSON.parse(choicesRaw);
    if (!Array.isArray(choices) || choices.length < 2) {
      throw new Error('Need at least 2 choices');
    }
    const hasCorrect = choices.some((c) => c.isCorrect);
    if (!hasCorrect) throw new Error('At least one choice must have isCorrect: true');
  } catch (e) {
    await interaction.reply({
      content: `Invalid choices JSON: ${e instanceof Error ? e.message : 'parse error'}.\nExpected format: \`[{"emoji":"🅰️","label":"Answer","isCorrect":true},...]\``,
      flags: 64,
    });
    return;
  }

  const id = questionRepo.add(db, 'multiple_choice', questionText, choices, null, explanation);
  await interaction.reply({
    content: `Added multiple-choice question **#${id}**.`,
    flags: 64,
  });
}

async function handleAddText(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  const questionText = interaction.options.getString('question', true);
  const answer = interaction.options.getString('answer', true);
  const explanation = interaction.options.getString('explanation');

  const id = questionRepo.add(db, 'text_input', questionText, null, answer, explanation);
  await interaction.reply({
    content: `Added text-input question **#${id}**.`,
    flags: 64,
  });
}

async function handleRemove(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  const id = interaction.options.getInteger('id', true);
  const removed = questionRepo.remove(db, id);
  if (removed) {
    await interaction.reply({ content: `Removed question **#${id}**.`, flags: 64 });
  } else {
    await interaction.reply({ content: `Question #${id} not found.`, flags: 64 });
  }
}

async function handleList(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  const page = interaction.options.getInteger('page') ?? 1;
  const perPage = 10;
  const offset = (page - 1) * perPage;
  const total = questionRepo.count(db);
  const questions = questionRepo.getAll(db, perPage, offset);

  if (questions.length === 0) {
    await interaction.reply({
      content: total === 0 ? 'No questions in the pool.' : 'No questions on this page.',
      flags: 64,
    });
    return;
  }

  const totalPages = Math.ceil(total / perPage);
  const lines = questions.map((q) => {
    const typeLabel = q.type === 'multiple_choice' ? 'MC' : 'Text';
    const preview = q.questionText.length > 80
      ? q.questionText.slice(0, 77) + '...'
      : q.questionText;
    return `**#${q.id}** [${typeLabel}] ${preview}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`Quiz Questions (Page ${page}/${totalPages})`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `${total} total questions` })
    .setColor(0x5865f2);

  await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleImport(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  const attachment = interaction.options.getAttachment('file', true);

  if (!attachment.name.endsWith('.json')) {
    await interaction.reply({
      content: 'Please upload a .json file.',
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  try {
    const response = await fetch(attachment.url);
    const data = await response.json() as Array<{
      type: 'multiple_choice' | 'text_input';
      questionText: string;
      choices?: Choice[];
      correctAnswer?: string;
      explanation?: string;
    }>;

    if (!Array.isArray(data)) {
      await interaction.editReply('File must contain a JSON array of questions.');
      return;
    }

    const count = questionRepo.addMany(db, data);
    await interaction.editReply(`Imported **${count}** questions.`);
  } catch (e) {
    await interaction.editReply(
      `Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
    );
  }
}

async function handleStats(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  const targetUser = interaction.options.getUser('user');

  let statsQuery: string;
  let params: unknown[];

  if (targetUser) {
    statsQuery = `
      SELECT status, COUNT(*) as cnt
      FROM quiz_attempts
      WHERE user_id = ? AND guild_id = ?
      GROUP BY status
    `;
    params = [targetUser.id, interaction.guildId!];
  } else {
    statsQuery = `
      SELECT status, COUNT(*) as cnt
      FROM quiz_attempts
      WHERE guild_id = ?
      GROUP BY status
    `;
    params = [interaction.guildId!];
  }

  const rows = db.prepare(statsQuery).all(...params) as Array<{ status: string; cnt: number }>;

  const stats: Record<string, number> = {};
  for (const row of rows) {
    stats[row.status] = row.cnt;
  }

  const totalQuestions = questionRepo.count(db);
  const title = targetUser ? `Stats for ${targetUser.tag}` : 'Global Quiz Stats';

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x5865f2)
    .addFields(
      { name: 'Questions in Pool', value: String(totalQuestions), inline: true },
      { name: 'Passed', value: String(stats['passed'] ?? 0), inline: true },
      { name: 'Failed', value: String(stats['failed'] ?? 0), inline: true },
      { name: 'In Progress', value: String(stats['in_progress'] ?? 0), inline: true },
      { name: 'Abandoned', value: String(stats['abandoned'] ?? 0), inline: true },
    );

  await interaction.reply({ embeds: [embed], flags: 64 });
}
