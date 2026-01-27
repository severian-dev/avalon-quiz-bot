import type { GuildMember } from 'discord.js';
import type { BotConfig } from '../types/index.js';

export interface RoleResult {
  success: boolean;
  error?: string;
}

export async function assignVerifiedRole(
  member: GuildMember,
  config: BotConfig,
): Promise<RoleResult> {
  const roleId = config.verification.roleId;
  const guild = member.guild;

  if (member.roles.cache.has(roleId)) {
    return { success: true }; // Already has the role
  }

  const role = guild.roles.cache.get(roleId);
  if (!role) {
    return { success: false, error: `Verification role (${roleId}) not found in this server.` };
  }

  const botMember = guild.members.me;
  if (!botMember) {
    return { success: false, error: 'Could not determine bot permissions.' };
  }

  if (botMember.roles.highest.position <= role.position) {
    return {
      success: false,
      error: `Bot's highest role is not above the verification role. Please move the bot's role higher in Server Settings > Roles.`,
    };
  }

  try {
    await member.roles.add(role, 'Passed verification quiz');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to assign role. Check bot permissions.' };
  }
}
