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
        flags: 64,
      });
      return;
    }
  }

  const channel = interaction.guild?.channels.cache.get(config.verification.channelId) as TextChannel | undefined;
  if (!channel) {
    await interaction.reply({
      content: `Verification channel (${config.verification.channelId}) not found. Check config.json.`,
      flags: 64,
    });
    return;
  }

  // Check if bot has necessary permissions in the channel
  const botMember = interaction.guild?.members.me;
  if (!botMember) {
    await interaction.reply({
      content: 'Failed to get bot member information.',
      flags: 64,
    });
    return;
  }

  const permissions = channel.permissionsFor(botMember);
  const requiredPerms = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
  ];

  const missingPerms = requiredPerms.filter((perm) => !permissions?.has(perm));
  if (missingPerms.length > 0) {
    const permNames = missingPerms.map((perm) => {
      if (perm === PermissionFlagsBits.ViewChannel) return 'View Channel';
      if (perm === PermissionFlagsBits.SendMessages) return 'Send Messages';
      if (perm === PermissionFlagsBits.EmbedLinks) return 'Embed Links';
      return 'Unknown';
    });

    await interaction.reply({
      content: `Missing permissions in <#${config.verification.channelId}>:\n${permNames.map((p) => `• ${p}`).join('\n')}\n\nPlease add these permissions to the bot's role in that channel.`,
      flags: 64,
    });
    return;
  }

  const message = buildVerificationEmbed(config);
  await channel.send(message);

  await interaction.reply({
    content: `Verification embed posted in <#${config.verification.channelId}>.`,
    flags: 64,
  });
}
