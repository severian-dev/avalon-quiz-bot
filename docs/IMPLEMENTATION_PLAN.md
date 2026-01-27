# Implementation Plan

## Table of Contents

1. [Technology Decisions](#1-technology-decisions)
2. [Configuration Architecture](#2-configuration-architecture)
3. [Database Schema](#3-database-schema)
4. [Quiz Flow State Machine](#4-quiz-flow-state-machine)
5. [Interaction Design](#5-interaction-design)
6. [Exponential Backoff Algorithm](#6-exponential-backoff-algorithm)
7. [File Structure](#7-file-structure)
8. [Custom ID Convention](#8-custom-id-convention)
9. [Discord Permissions and Intents](#9-discord-permissions-and-intents)
10. [Implementation Phases](#10-implementation-phases)
11. [Design Risks and Mitigations](#11-design-risks-and-mitigations)
12. [Illustrative Code Patterns](#12-illustrative-code-patterns)

---

## 1. Technology Decisions

### Language and Runtime: TypeScript on Node.js 20+

discord.js v14 has first-class TypeScript support. Type safety catches entire categories of bugs at compile time -- misspelled custom IDs, wrong interaction types, malformed embeds. For a bot with multiple interaction flows (buttons, modals, navigation state), this matters.

Node.js 20+ provides native `--env-file` support (no `dotenv` dependency) and stable ESM.

### Core Dependencies

| Package | Purpose |
|---|---|
| `discord.js` ^14.x | Discord API wrapper |
| `better-sqlite3` ^12.x | Synchronous SQLite for state persistence |
| `@types/better-sqlite3` ^7.x | TypeScript types |
| `zod` ^3.x | Config schema validation |
| `typescript` ^5.x | Compiler |
| `tsx` ^4.x | Dev runner (TS execution without build) |
| `tsup` ^8.x | Production bundler |

No ORM. The data model is simple enough that raw SQL with prepared statements is clearer and faster.

### Why SQLite Over Alternatives

- **vs. in-memory**: Cooldown backoff and quiz state must survive bot restarts. A Map would lose everything.
- **vs. Redis/PostgreSQL**: Overkill for a single-server verification bot. SQLite is zero-configuration, file-based, and handles hundreds of thousands of rows trivially.
- **WAL mode** is enabled for safe concurrent reads during writes.

---

## 2. Configuration Architecture

Three layers, each serving a different purpose:

### Layer 1: `.env` -- Secrets Only

```
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
```

Loaded via Node.js `--env-file`. Never committed to source control.

### Layer 2: `config.json` -- Bot Behavior

```jsonc
{
  "verification": {
    "channelId": "...",
    "roleId": "...",
    "embedTitle": "Welcome!",
    "embedDescription": "Click below to begin the verification quiz.",
    "embedColor": "#5865F2",
    "buttonLabel": "Start Verification Quiz"
  },
  "quiz": {
    "questionsPerQuiz": 10,
    "passThreshold": 7,
    "timeoutMinutes": 5
  },
  "cooldown": {
    "baseMinutes": 5,
    "maxMinutes": 720,
    "resetOnPass": true
  },
  "admin": {
    "roleId": "..."
  }
}
```

Validated at startup with Zod. If validation fails, the bot refuses to start with a clear error.

### Layer 3: Slash Commands -- Live Question Management

Questions are stored in SQLite, managed via `/quiz-admin` commands. No restart needed to add/remove questions.

---

## 3. Database Schema

### `questions` -- Quiz Question Pool

```sql
CREATE TABLE IF NOT EXISTS questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK(type IN ('multiple_choice', 'text_input')),
  question_text TEXT NOT NULL,
  choices     TEXT,          -- JSON array of {emoji, label, isCorrect} for MC; null for text_input
  correct_answer TEXT,       -- Expected string for text_input (case-insensitive); null for MC
  explanation TEXT,           -- Optional explanation shown after answering
  created_at  TEXT DEFAULT (datetime('now'))
);
```

### `quiz_attempts` -- Active and Completed Attempts

```sql
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  guild_id      TEXT NOT NULL,
  question_ids  TEXT NOT NULL,     -- JSON array of question IDs drawn for this attempt
  answers       TEXT DEFAULT '{}', -- JSON object: { "questionId": "userAnswer" }
  current_index INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'in_progress'
                  CHECK(status IN ('in_progress', 'passed', 'failed', 'abandoned')),
  started_at    TEXT DEFAULT (datetime('now')),
  finished_at   TEXT
);
```

One active (`in_progress`) attempt per user per guild enforced at the application level. Starting a new quiz reuses or abandons the existing attempt.

### `cooldowns` -- Exponential Backoff Tracking

```sql
CREATE TABLE IF NOT EXISTS cooldowns (
  user_id        TEXT NOT NULL,
  guild_id       TEXT NOT NULL,
  fail_count     INTEGER DEFAULT 0,
  last_fail_at   TEXT,
  cooldown_until TEXT,
  PRIMARY KEY (user_id, guild_id)
);
```

`cooldown_until` is an ISO timestamp. On each "Start Quiz" press, the handler checks `cooldown_until > now()`. This survives restarts because it's a stored timestamp, not an in-memory timer.

---

## 4. Quiz Flow State Machine

```
[User clicks "Start Verification Quiz" button on public embed]
        |
        v
  [Cooldown check (SQLite)] --blocked--> [Ephemeral reply: "Try again in X"]
        |
      clear
        |
        v
  [Check for existing in_progress attempt]
    |                     |
  exists               none
    |                     |
    v                     v
  [Resume it]     [Draw N random questions from pool]
                          |
                          v
                  [Create quiz_attempt row in SQLite]
        |
        v
  [Show question 1 as ephemeral message]
        |
        v
  [User answers via button (MC) or modal (text input)]
        |
        v
  [Save answer to quiz_attempt.answers JSON in SQLite]
        |
        v
  [User clicks Next --> show next question (edit same message)]
  [User clicks Prev --> show prev question (edit same message)]
  [User clicks Submit --> score the quiz]
        |
        v
  [Score >= passThreshold?]
    |              |
   yes             no
    |              |
    v              v
  [Assign role,  [Increment fail_count,
   reset          calculate next cooldown_until,
   cooldown       update cooldowns table,
   (if config),   ephemeral reply: "Failed. Try again in X"]
   ephemeral
   reply:
   "Passed!"]
```

### Timeout Handling

A quiz has a 5-minute timeout (`config.quiz.timeoutMinutes`). This is enforced in two ways:

1. When a user interacts with an old quiz message, the handler checks `started_at + timeoutMinutes`. If expired, the attempt is marked `abandoned` and the user is told to start over.
2. Discord's own ephemeral interaction tokens expire after 15 minutes. The 5-minute timeout keeps us well within this limit.

---

## 5. Interaction Design

### Message Visibility

| Interaction | Visibility |
|---|---|
| Verification embed (with "Start Quiz" button) | **Public** -- posted once, persists in channel |
| Quiz questions, navigation, answers | **Ephemeral** -- only the quiz-taker sees them |
| Pass/fail result | **Ephemeral** -- private to the user |
| Admin slash command responses | **Ephemeral** -- admin-only output |

### Multiple-Choice Question Rendering

```
+------------------------------------------+
|  Question 3 of 10                        |
|                                          |
|  What is the capital of France?          |
|                                          |
+------------------------------------------+
[ 🅰️ London ] [ 🅱️ Paris ✓ ] [ 🅲 Berlin ] [ 🅳 Madrid ]
[  << Prev  ] [    Next >>    ] [ Submit Quiz ]
```

- Answer buttons use emoji labels
- Selected answer gets `Success` (green) button style
- Unselected answers use `Secondary` (gray) style

### Text-Input Question Rendering

```
+------------------------------------------+
|  Question 5 of 10                        |
|                                          |
|  Name the process by which plants        |
|  convert sunlight into energy.           |
|                                          |
|  Your answer: photosynthesis             |
+------------------------------------------+
[ Type Your Answer ]
[  << Prev  ] [    Next >>    ] [ Submit Quiz ]
```

- "Type Your Answer" button opens a Discord modal with a text input field
- Modal submission saves the answer and re-renders the question with the answer shown in the embed

### Navigation Behavior

- **Prev/Next**: Calls `interaction.update()` to edit the existing ephemeral message in place. Updates `current_index` in SQLite.
- **Submit**: Only enabled when all questions are answered (or always available -- design choice). Scores the quiz.
- The entire quiz is a **single ephemeral message** that gets edited on every interaction. No message spam.

### Modal Constraint

Showing a modal **must** be the first response to a button interaction. The "Type Your Answer" button handler calls `interaction.showModal()` directly -- never `deferUpdate()` first.

---

## 6. Exponential Backoff Algorithm

```
cooldown_minutes = min(base_minutes * 2^(fail_count - 1), max_minutes)
```

With default config (`baseMinutes: 5`, `maxMinutes: 720`):

| Fail # | Cooldown |
|---|---|
| 1 | 5 minutes |
| 2 | 10 minutes |
| 3 | 20 minutes |
| 4 | 40 minutes |
| 5 | 80 minutes |
| 6 | 160 minutes (~2.7h) |
| 7 | 320 minutes (~5.3h) |
| 8 | 640 minutes (~10.7h) |
| 9+ | 720 minutes (12h cap) |

On pass (if `config.cooldown.resetOnPass` is true), `fail_count` resets to 0 and `cooldown_until` is cleared.

---

## 7. File Structure

```
avalon-quiz-bot/
├── .env.example
├── .gitignore
├── config.json
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md
├── docs/
│   ├── IMPLEMENTATION_PLAN.md      # This file
│   └── PROGRESS.md                 # Phase-by-phase progress tracking
│
├── src/
│   ├── index.ts                    # Entry point: creates client, loads handlers, connects
│   ├── client.ts                   # Extended Client class with typed properties
│   ├── deploy-commands.ts          # Script to register slash commands with Discord API
│   │
│   ├── config/
│   │   ├── schema.ts              # Zod schema for config.json validation
│   │   └── loader.ts              # Reads and validates config.json at startup
│   │
│   ├── database/
│   │   ├── connection.ts          # Initializes better-sqlite3, runs migrations
│   │   ├── migrations.ts          # CREATE TABLE statements
│   │   └── repositories/
│   │       ├── questionRepo.ts    # CRUD for questions table
│   │       ├── attemptRepo.ts     # CRUD for quiz_attempts table
│   │       └── cooldownRepo.ts    # CRUD for cooldowns table
│   │
│   ├── commands/
│   │   ├── index.ts               # Auto-loads all command modules
│   │   ├── quiz-admin.ts          # /quiz-admin add|remove|list|import|stats
│   │   └── setup-verification.ts  # /setup-verification (posts the embed)
│   │
│   ├── events/
│   │   ├── index.ts               # Auto-loads all event modules
│   │   ├── ready.ts               # Bot ready event
│   │   └── interactionCreate.ts   # Master interaction router
│   │
│   ├── handlers/
│   │   ├── quizStart.ts           # "Start Quiz" button: cooldown check, draw, begin
│   │   ├── quizNavigation.ts      # Prev/Next button handlers
│   │   ├── quizAnswer.ts          # MC answer button handler
│   │   ├── quizModal.ts           # Text input modal submission handler
│   │   └── quizSubmit.ts          # Score quiz, assign role or record failure
│   │
│   ├── builders/
│   │   ├── verificationEmbed.ts   # Public verification embed + start button
│   │   ├── questionEmbed.ts       # Quiz question embed + answer/modal buttons
│   │   ├── resultEmbed.ts         # Pass/fail result embed
│   │   ├── modalBuilder.ts        # Text input modal
│   │   └── navigationRow.ts       # Prev/Next/Submit action row
│   │
│   ├── services/
│   │   ├── quizService.ts         # Draw questions, score attempt, pass/fail logic
│   │   ├── cooldownService.ts     # Backoff calculation and enforcement
│   │   └── roleService.ts         # Assigns the verified role
│   │
│   └── types/
│       ├── index.ts               # Shared TypeScript interfaces
│       ├── config.ts              # Config type definition
│       ├── question.ts            # Question, Choice, QuizAttempt types
│       └── customIds.ts           # Constants for all interaction custom IDs
│
├── data/
│   └── seed-questions.json        # Optional: seed file for initial question import
│
└── tests/
    ├── services/
    │   ├── quizService.test.ts
    │   └── cooldownService.test.ts
    └── builders/
        └── questionEmbed.test.ts
```

### Structure Rationale

- **`commands/`**: Slash command definitions and execute functions. Auto-discovered by `index.ts`.
- **`events/`**: Discord event handlers. `interactionCreate.ts` is the master router that dispatches buttons, modals, and slash commands.
- **`handlers/`**: Separated from commands because button/modal interactions are not slash commands. Dispatched by custom ID prefix.
- **`builders/`**: Pure functions that construct Discord embeds, action rows, and modals. No side effects, easily testable.
- **`services/`**: Business logic. No Discord API calls -- receives data, returns results. Handlers call services, then respond.
- **`database/repositories/`**: Data access layer. Each repository encapsulates SQL for one table.
- **`types/`**: Shared type definitions. `customIds.ts` prevents typos across interaction handlers.

---

## 8. Custom ID Convention

Every interactive component (button, modal) uses a namespaced `customId` string:

```typescript
export const CustomIds = {
  VERIFY_START:        'verify:start',
  QUIZ_PREV:           'quiz:prev',
  QUIZ_NEXT:           'quiz:next',
  QUIZ_SUBMIT:         'quiz:submit',
  QUIZ_ANSWER_PREFIX:  'quiz:answer:',     // + choiceIndex
  QUIZ_MODAL_OPEN:     'quiz:modal:open',  // button that opens the modal
  QUIZ_MODAL_SUBMIT:   'quiz:modal:submit', // modal submission
  QUIZ_MODAL_INPUT:    'quiz:modal:input',  // text input field ID within modal
} as const;
```

The `interactionCreate` handler parses the custom ID to route:

```typescript
if (interaction.isButton()) {
  if (id === CustomIds.VERIFY_START) --> quizStart handler
  if (id === CustomIds.QUIZ_PREV || id === CustomIds.QUIZ_NEXT) --> quizNavigation handler
  if (id.startsWith(CustomIds.QUIZ_ANSWER_PREFIX)) --> quizAnswer handler
  if (id === CustomIds.QUIZ_SUBMIT) --> quizSubmit handler
  if (id === CustomIds.QUIZ_MODAL_OPEN) --> show modal (interaction.showModal())
}
if (interaction.isModalSubmit()) {
  if (id === CustomIds.QUIZ_MODAL_SUBMIT) --> quizModal handler
}
```

---

## 9. Discord Permissions and Intents

### Gateway Intents

| Intent | Reason |
|---|---|
| `Guilds` | Required for guild events and role management |
| `GuildMembers` | Required to assign roles to members on quiz pass |

### Bot Permissions

| Permission | Reason |
|---|---|
| `SendMessages` | Post the verification embed |
| `EmbedLinks` | Render rich embeds |
| `ManageRoles` | Assign the verified role |
| `UseApplicationCommands` | Implicit, for slash commands |

### Not Needed

- **`MessageContent`** intent: All input comes via interactions (buttons, modals, slash commands), never message content.
- **`GuildMessageReactions`** intent: We use button components instead of reactions (ephemeral messages can't have bot-added reactions).

---

## 10. Implementation Phases

### Phase 1: Project Scaffolding and Core Infrastructure

**Goal**: Bot connects to Discord and logs "Ready".

- [ ] Initialize `package.json` with `npm init`
- [ ] Install dependencies: `discord.js`, `better-sqlite3`, `@types/better-sqlite3`, `zod`, `typescript`, `tsx`, `tsup`
- [ ] Create `tsconfig.json` (strict mode, ESM output)
- [ ] Create `.env.example` and `.gitignore`
- [ ] Create `config.json` with placeholder values
- [ ] Create `src/config/schema.ts` -- Zod schema for config validation
- [ ] Create `src/config/loader.ts` -- reads and validates config.json
- [ ] Create `src/client.ts` -- extended Client class
- [ ] Create `src/index.ts` -- entry point (create client, login)
- [ ] Create `src/events/ready.ts` -- log "Ready"
- [ ] Create `src/events/index.ts` -- event auto-loader
- [ ] Verify the bot comes online

**Deliverable**: Bot connects and logs "Ready".

### Phase 2: Database Layer

**Goal**: SQLite with migrations and repository pattern.

- [ ] Create `src/database/connection.ts` -- open database, enable WAL mode
- [ ] Create `src/database/migrations.ts` -- CREATE TABLE for questions, quiz_attempts, cooldowns
- [ ] Create `src/database/repositories/questionRepo.ts` -- add, remove, getById, getAll, getRandom(n), count
- [ ] Create `src/database/repositories/attemptRepo.ts` -- create, update, getActiveByUser, complete
- [ ] Create `src/database/repositories/cooldownRepo.ts` -- get, upsert, isOnCooldown, recordFailure
- [ ] Write unit tests for repositories

**Deliverable**: Tested data layer with all CRUD operations.

### Phase 3: Admin Commands and Question Management

**Goal**: Admins can manage quiz questions via slash commands.

- [ ] Create `src/commands/index.ts` -- command auto-loader
- [ ] Create `src/deploy-commands.ts` -- registers commands with Discord API
- [ ] Create `src/commands/quiz-admin.ts` -- add, remove, list, import, stats subcommands
- [ ] Create `src/types/customIds.ts` -- all custom ID constants
- [ ] Wire `interactionCreate.ts` to dispatch slash commands
- [ ] Create `data/seed-questions.json` -- sample questions
- [ ] Test adding, listing, removing, and importing questions

**Deliverable**: Full question management via slash commands.

### Phase 4: Verification Embed and Quiz Start

**Goal**: Bot posts the verification embed; users can start a quiz.

- [ ] Create `src/builders/verificationEmbed.ts` -- builds embed from config
- [ ] Create `src/commands/setup-verification.ts` -- posts the embed
- [ ] Create `src/services/cooldownService.ts` -- backoff calculation and checking
- [ ] Create `src/handlers/quizStart.ts` -- button click handler: cooldown check, draw questions, create attempt, show first question
- [ ] Create `src/builders/questionEmbed.ts` -- renders question with answer buttons or "Type Answer" button
- [ ] Create `src/builders/navigationRow.ts` -- prev/next/submit buttons
- [ ] Wire button routing in `interactionCreate.ts`

**Deliverable**: Users click the button, pass cooldown check, and see the first question.

### Phase 5: Quiz Interaction (Navigation, Answering, Modals)

**Goal**: Complete quiz interaction flow.

- [ ] Create `src/handlers/quizNavigation.ts` -- prev/next handlers, edit message in place
- [ ] Create `src/handlers/quizAnswer.ts` -- save MC answer, re-render with selection highlighted
- [ ] Create `src/builders/modalBuilder.ts` -- text input modal
- [ ] Create `src/handlers/quizModal.ts` -- save text answer from modal submission
- [ ] Create `src/services/quizService.ts` -- drawQuestions, scoreAttempt, getQuestionAtIndex
- [ ] Handle timeout: check started_at + timeoutMinutes on every interaction

**Deliverable**: Users navigate, answer all question types, and see their selections.

### Phase 6: Scoring, Role Assignment, and Failure Handling

**Goal**: Quiz completion with pass/fail flow.

- [ ] Create `src/handlers/quizSubmit.ts` -- score quiz, determine pass/fail
- [ ] Create `src/builders/resultEmbed.ts` -- pass/fail result with score breakdown
- [ ] Create `src/services/roleService.ts` -- assign role, handle permission errors
- [ ] Integrate cooldown recording on failure
- [ ] Reset cooldown on pass (if configured)
- [ ] Handle edge cases: bot role hierarchy, user already has role, role not found

**Deliverable**: Full end-to-end verification flow.

### Phase 7: Polish and Production Readiness

**Goal**: Production-ready bot.

- [ ] Add structured logging
- [ ] Add global error handler for unhandled interaction errors
- [ ] Add graceful shutdown (close SQLite on SIGINT/SIGTERM)
- [ ] Add `tsup.config.ts` for production build
- [ ] Add input validation/sanitization on all user inputs
- [ ] Test end-to-end on a real Discord server
- [ ] Optional: `Dockerfile` and `docker-compose.yml`

**Deliverable**: Deployable, documented bot.

---

## 11. Design Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Ephemeral messages expire after ~15 min | User can't finish quiz if they take too long | 5-minute timeout keeps us well within the limit. Stale interactions caught and user told to restart. |
| Modal must be first response | Calling `deferUpdate()` before `showModal()` crashes | Handler structure enforces `showModal()` as the direct first response. |
| Bot role hierarchy misconfigured | Role assignment silently fails | `roleService` checks hierarchy and returns a clear error to the admin. |
| Bot restart mid-quiz | User's ephemeral message is stale | State is in SQLite. Clicking "Start Quiz" again reuses the `in_progress` attempt. User picks up where they left off with a fresh message. |
| Multiple active quizzes per user | State confusion | Enforced: only one `in_progress` attempt per user per guild. New start reuses or abandons existing. |
| SQLite concurrency under load | Potential write contention | WAL mode + synchronous better-sqlite3 API. A single-server bot will never hit SQLite's limits. |
| Question pool too small | Can't draw N unique questions | Check pool size at quiz start. If fewer questions than `questionsPerQuiz`, tell the user/admin. |

---

## 12. Illustrative Code Patterns

### Entry Point

```typescript
// src/index.ts
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadConfig } from './config/loader.js';
import { initDatabase } from './database/connection.js';
import { registerEvents } from './events/index.js';
import { loadCommands } from './commands/index.js';

const config = loadConfig();
const db = initDatabase();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
await loadCommands(client);
registerEvents(client, db, config);

await client.login(process.env.DISCORD_TOKEN);
```

### Interaction Router

```typescript
// src/events/interactionCreate.ts
export async function execute(interaction, db, config) {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction, db, config);
    return;
  }

  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id === CustomIds.VERIFY_START) return quizStart(interaction, db, config);
    if (id === CustomIds.QUIZ_PREV || id === CustomIds.QUIZ_NEXT)
      return quizNavigation(interaction, db, config);
    if (id.startsWith(CustomIds.QUIZ_ANSWER_PREFIX))
      return quizAnswer(interaction, db, config);
    if (id === CustomIds.QUIZ_SUBMIT)
      return quizSubmit(interaction, db, config);
    if (id === CustomIds.QUIZ_MODAL_OPEN)
      return interaction.showModal(buildModal(interaction, db));
  }

  if (interaction.isModalSubmit()) {
    if (id === CustomIds.QUIZ_MODAL_SUBMIT)
      return quizModal(interaction, db, config);
  }
}
```

### Cooldown Service

```typescript
// src/services/cooldownService.ts
const BACKOFF_MULTIPLIER = 2;

export function calculateCooldownMinutes(failCount: number, config: CooldownConfig): number {
  const minutes = config.baseMinutes * Math.pow(BACKOFF_MULTIPLIER, failCount - 1);
  return Math.min(minutes, config.maxMinutes);
}

export function isOnCooldown(repo, userId, guildId): { blocked: boolean; retryAfter?: Date } {
  const record = repo.get(userId, guildId);
  if (!record?.cooldown_until) return { blocked: false };
  const cooldownEnd = new Date(record.cooldown_until);
  if (cooldownEnd > new Date()) return { blocked: true, retryAfter: cooldownEnd };
  return { blocked: false };
}

export function recordFailure(repo, userId, guildId, config): void {
  const record = repo.get(userId, guildId);
  const newFailCount = (record?.fail_count ?? 0) + 1;
  const cooldownMinutes = calculateCooldownMinutes(newFailCount, config);
  const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60_000);
  repo.upsert(userId, guildId, newFailCount, cooldownUntil.toISOString());
}
```
