import { z } from 'zod';

export const configSchema = z.object({
  verification: z.object({
    channelId: z.string().min(1, 'verification.channelId is required'),
    roleId: z.string().min(1, 'verification.roleId is required'),
    embedTitle: z.string().default('Welcome!'),
    embedDescription: z.string().default('Click below to begin the verification quiz.'),
    embedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'embedColor must be a hex color like #5865F2').default('#5865F2'),
    buttonLabel: z.string().default('Start Verification Quiz'),
  }),
  quiz: z.object({
    questionsPerQuiz: z.number().int().min(1).default(10),
    passThreshold: z.number().int().min(1).default(7),
    timeoutMinutes: z.number().min(1).max(14).default(5),
  }),
  cooldown: z.object({
    baseMinutes: z.number().min(1).default(5),
    maxMinutes: z.number().min(1).default(720),
    resetOnPass: z.boolean().default(true),
  }),
  admin: z.object({
    roleId: z.string().min(1, 'admin.roleId is required'),
  }),
});
