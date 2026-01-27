# Avalon Quiz Bot

A Discord verification bot that gates server access behind a configurable quiz. Members click a button in a verification channel, answer randomized questions privately, and receive a role on passing.

## Features

- **Verification embed** with a customizable message, color, and button label posted to a designated channel
- **Randomized quizzes** drawing N questions from a configurable pool of 20+
- **Multiple-choice questions** answered via emoji-labeled buttons
- **Text-input questions** answered via Discord modals
- **Ephemeral quiz flow** -- only the quiz-taker sees their questions and results
- **Automatic role assignment** on passing the quiz
- **Exponential backoff** on failure (5 min -> 10 -> 20 -> ... -> 12h cap) that persists across bot restarts
- **Admin slash commands** for live question management (add, remove, list, import, stats) -- no restart required
- **5-minute quiz timeout** to keep sessions within Discord's ephemeral message limits

## Tech Stack

| Component | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Runtime | Node.js 20+ |
| Discord library | discord.js v14 |
| Database | SQLite via better-sqlite3 |
| Config validation | Zod |
| Build | tsup |
| Dev runner | tsx |

## Prerequisites

- Node.js 20 or later
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- The bot invited to your server with these permissions: `Send Messages`, `Embed Links`, `Manage Roles`, `Use Application Commands`
- The bot's role positioned **above** the verification role in Server Settings > Roles

## Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd avalon-quiz-bot
   npm install
   ```

2. **Configure secrets**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your bot token, client ID, and guild ID.

3. **Configure behavior**

   Edit `config.json` to set:
   - Verification channel and role IDs
   - Embed title, description, color, and button label
   - Questions per quiz and pass threshold
   - Cooldown base/max minutes
   - Admin role ID

4. **Register slash commands**
   ```bash
   npm run deploy-commands
   ```

5. **Start the bot**
   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

6. **Post the verification embed**

   Run `/setup-verification` in your server (requires the configured admin role).

7. **Add questions**

   Use `/quiz-admin add` to add questions one at a time, or `/quiz-admin import` to bulk-import from a JSON file. See `data/seed-questions.json` for the expected format.

## Configuration Reference

### `.env`

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from the Developer Portal |
| `CLIENT_ID` | Application (client) ID |
| `GUILD_ID` | Target server ID |

### `config.json`

```jsonc
{
  "verification": {
    "channelId": "...",           // Channel for the verification embed
    "roleId": "...",              // Role to assign on quiz pass
    "embedTitle": "Welcome!",
    "embedDescription": "Click below to begin the verification quiz.",
    "embedColor": "#5865F2",
    "buttonLabel": "Start Verification Quiz"
  },
  "quiz": {
    "questionsPerQuiz": 10,       // Questions drawn per attempt
    "passThreshold": 7,           // Minimum correct to pass
    "timeoutMinutes": 5           // Auto-abandon after this
  },
  "cooldown": {
    "baseMinutes": 5,             // First failure cooldown
    "maxMinutes": 720,            // Cap at 12 hours
    "resetOnPass": true           // Reset fail count on pass
  },
  "admin": {
    "roleId": "..."               // Role that can use /quiz-admin
  }
}
```

### Question JSON Format (for import)

```json
[
  {
    "type": "multiple_choice",
    "questionText": "What is the capital of France?",
    "choices": [
      { "emoji": "🅰️", "label": "London", "isCorrect": false },
      { "emoji": "🅱️", "label": "Paris", "isCorrect": true },
      { "emoji": "🅲", "label": "Berlin", "isCorrect": false },
      { "emoji": "🅳", "label": "Madrid", "isCorrect": false }
    ],
    "explanation": "Paris is the capital of France."
  },
  {
    "type": "text_input",
    "questionText": "Name the process by which plants convert sunlight into energy.",
    "correctAnswer": "photosynthesis",
    "explanation": "Photosynthesis converts light energy into chemical energy."
  }
]
```

## Slash Commands

| Command | Description | Permission |
|---|---|---|
| `/setup-verification` | Posts (or updates) the verification embed in the configured channel | Admin role |
| `/quiz-admin add` | Add a question to the pool | Admin role |
| `/quiz-admin remove` | Remove a question by ID | Admin role |
| `/quiz-admin list` | List questions with pagination | Admin role |
| `/quiz-admin import` | Bulk-import questions from a JSON attachment | Admin role |
| `/quiz-admin stats` | View pass/fail statistics (global or per-user) | Admin role |

## Architecture Overview

```
User clicks "Start Verification Quiz" button (public embed)
  --> Bot checks cooldown (SQLite)
  --> Bot draws N random questions (SQLite)
  --> Bot creates quiz attempt record (SQLite)
  --> Bot sends ephemeral message with question 1
  --> User answers via buttons (MC) or modal (text input)
  --> User navigates with Prev/Next (same message, edited in place)
  --> User clicks Submit
  --> Bot scores the attempt
  --> Pass: assign role, show result
  --> Fail: record failure, set cooldown, show result
```

All quiz interactions are **ephemeral** -- only the user taking the quiz can see them. The single public message is the verification embed with the start button.

## Development

```bash
npm run dev          # Run with tsx (auto-restart on changes)
npm run build        # Compile to dist/
npm start            # Run compiled output
npm run deploy-commands  # Register/update slash commands with Discord
npm test             # Run tests
```

## License

ISC
