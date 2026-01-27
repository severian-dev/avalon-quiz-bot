export interface BotConfig {
  verification: {
    channelId: string;
    roleId: string;
    embedTitle: string;
    embedDescription: string;
    embedColor: string;
    buttonLabel: string;
  };
  quiz: {
    questionsPerQuiz: number;
    passThreshold: number;
    timeoutMinutes: number;
  };
  cooldown: {
    baseMinutes: number;
    maxMinutes: number;
    resetOnPass: boolean;
  };
  admin: {
    roleId: string;
  };
}
