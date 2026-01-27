import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotConfig } from '../types/index.js';
import { buildVerificationEmbed } from '../builders/verificationEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('setup-verification')
  .setDescription('Post the verification embed in the configured channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(
  interaction: ChatInputCommandInteraction,
  _db: Database.Database,
  config: BotConfig,
): Promise<void> {
  // Check admin role
  const member = interaction.member;
  if (member && 'roles' in member && typeof member.roles === 'object' && 'cache' in member.roles) {
    if (!member.roles.cache.has(config.admin.roleId)) {
      await interaction.reply({
        content: 'You do not have the required admin role to use this command.',
        ephemeral: true,
      });
      return;
    }
  }

  const channel = interaction.guild?.channels.cache.get(config.verification.channelId) as TextChannel | undefined;
  if (!channel) {
    await interaction.reply({
      content: `Verification channel (${config.verification.channelId}) not found. Check config.json.`,
      ephemeral: true,
    });
    return;
  }

  const message = buildVerificationEmbed(config);
  await channel.send(message);

  await interaction.reply({
    content: `Verification embed posted in <#${config.verification.channelId}>.`,
    ephemeral: true,
  });
}
