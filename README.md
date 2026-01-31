# Avalon Quiz Bot

A Discord verification bot that gates server access behind a configurable quiz. Members click a button in a verification channel, answer randomized questions privately, and receive a role on passing.

## Features

- **Verification embed** with customizable message, color, thumbnail image, and button label posted to a designated channel
- **Randomized quizzes** drawing N questions from a configurable pool of 20+
- **Multiple-choice questions** answered via emoji-labeled buttons (1️⃣ 2️⃣ 3️⃣ 4️⃣) - supports both single-select and multi-select
- **Answer shuffling** -- answer text appears in different random order for each quiz attempt to prevent answer sharing (emojis 1️⃣-4️⃣ stay consistent)
- **Text-input questions** answered via Discord modals
- **Ephemeral quiz flow** -- only the quiz-taker sees their questions and results
- **Automatic role assignment** on passing the quiz with customizable success message and thumbnail
- **Submit validation** -- submit button is disabled until all questions are answered
- **Exponential backoff** on failure (5 min -> 10 -> 20 -> ... -> 12h cap) that persists across bot restarts
- **Admin slash commands** for live question management (add, remove, list, import, stats) -- no restart required
- **5-minute quiz timeout** to keep sessions within Discord's ephemeral message limits
- **Dynamic presence** showing live active quiz count and total verified members (e.g., "Watching 2 active quizzes | 47 verified")
- **Maintenance commands** including database reset script for clearing stuck sessions

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
   - Embed title, description, color, thumbnail, and button label
   - Pass message title, description, and thumbnail
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
    "embedThumbnail": "",         // Optional: URL to thumbnail image on verification embed
    "buttonLabel": "Start Verification Quiz",
    "passTitle": "Quiz Passed!",  // Title shown when user passes
    "passMessage": "You answered **{correct}/{total}** questions correctly. You have been assigned the verification role.",
    "passThumbnail": ""           // Optional: URL to thumbnail image on pass message
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

**Embed Customization**:

- `embedThumbnail` (optional) - URL to an image shown as a small square thumbnail on the right side of the verification embed. Leave empty (`""`) to hide. Example: `"https://i.imgur.com/yourimage.png"`
- `passThumbnail` (optional) - URL to an image shown on the pass message embed. Can be the same as `embedThumbnail` or different. Leave empty to hide.

**Pass Message Customization**:

- `passTitle` - The title shown on the success embed (e.g., "Quiz Passed!", "Welcome!", "Success!")
- `passMessage` - The description text. Supports template variables:
  - `{correct}` - Number of questions answered correctly
  - `{total}` - Total number of questions in the quiz

Example:
- Title: `"Welcome Aboard!"`
- Message: `"You got {correct} out of {total} right!"` becomes `"You got 8 out of 10 right!"`

### Question JSON Format (for import)

```json
[
  {
    "type": "multiple_choice",
    "questionText": "What is the capital of France?",
    "choices": [
      { "emoji": "", "label": "London", "isCorrect": false },
      { "emoji": "", "label": "Paris", "isCorrect": true },
      { "emoji": "", "label": "Berlin", "isCorrect": false },
      { "emoji": "", "label": "Madrid", "isCorrect": false }
    ],
    "explanation": "Paris is the capital of France."
  },
  {
    "type": "multiple_choice",
    "questionText": "Which of the following are primary colors?",
    "choices": [
      { "emoji": "", "label": "Red", "isCorrect": true },
      { "emoji": "", "label": "Green", "isCorrect": false },
      { "emoji": "", "label": "Blue", "isCorrect": true },
      { "emoji": "", "label": "Yellow", "isCorrect": true }
    ],
    "explanation": "Red, blue, and yellow are primary colors. Questions with multiple correct answers automatically become multi-select."
  },
  {
    "type": "text_input",
    "questionText": "Name the process by which plants convert sunlight into energy.",
    "correctAnswer": "photosynthesis",
    "explanation": "Photosynthesis converts light energy into chemical energy."
  }
]
```

**Important Notes**:
- **Emoji field**: The `emoji` field in multiple-choice questions is optional. If provided and non-empty, those emojis will be used in their original order. If empty (`""`), the bot falls back to numbered emojis (1️⃣ 2️⃣ 3️⃣ 4️⃣). Emojis stay in a fixed order (e.g., 🅰️ 🅱️ 🇨 🇩) while the answer text shuffles - this prevents answer sharing.
- **Multi-select detection**: Questions with more than one `isCorrect: true` choice automatically become multi-select questions. The question will show "(SELECT MULTIPLE - Select all that apply)" in the title.
- **Multi-select scoring**: Users must select ALL correct answers and NO incorrect ones to receive credit. Partial credit is not awarded.
- **Answer shuffling**: Answer choices are automatically shuffled in a different order for each quiz attempt (but consistent within that attempt). The emojis (🅰️ 🅱️ 🇨 🇩 or 1️⃣ 2️⃣ 3️⃣ 4️⃣) always stay in the same visual order.

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
  --> Bot shuffles answer choices (deterministic per attempt)
  --> Bot sends ephemeral message with question 1
  --> User answers via buttons (MC, 1️⃣-4️⃣) or modal (text input)
  --> User navigates with Prev/Next (same message, edited in place)
  --> Submit button disabled until all questions answered
  --> User clicks Submit
  --> Bot scores the attempt (unshuffles answers for validation)
  --> Pass: assign role, show success message with thumbnail
  --> Fail: record failure, set cooldown, show retry time
```

**Key Design Decisions**:
- All quiz interactions are **ephemeral** -- only the user taking the quiz can see them
- The single public message is the verification embed with the start button
- Answer shuffling uses deterministic seeding (attemptId + questionId) so the same user sees consistent ordering during their attempt
- Multi-select questions are automatically detected (>1 correct answer) and show toggle behavior
- Buttons show only emojis (1️⃣-4️⃣) with full answer text in the embed description

## Development

```bash
npm run dev          # Run with tsx (auto-restart on changes)
npm run build        # Compile to dist/
npm start            # Run compiled output
npm run deploy-commands  # Register/update slash commands with Discord
npm run reset-attempts   # Abandon in-progress quizzes and clear cooldowns
npm test             # Run tests
```

### Maintenance Commands

**Reset Quiz Attempts**:
```bash
npm run reset-attempts
```
This command abandons all in-progress quiz attempts and clears all cooldowns. Useful for:
- Clearing stuck quiz sessions during development/testing
- Resetting cooldowns for users who need to retry immediately
- Cleaning up the database before redeployment

## License

MIT
