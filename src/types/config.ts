export interface BotConfig {
  verification: {
    channelId: string;
    roleId: string;
    embedTitle: string;
    embedDescription: string;
    embedColor: string;
    embedThumbnail?: string;
    buttonLabel: string;
    passTitle: string;
    passMessage: string;
    passThumbnail?: string;
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
