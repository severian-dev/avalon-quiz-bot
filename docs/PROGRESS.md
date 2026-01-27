# Progress Tracker

## Status Legend

- **Not Started** -- Work has not begun
- **In Progress** -- Actively being worked on
- **Complete** -- Finished and verified
- **Blocked** -- Waiting on something

---

## Phase 1: Project Scaffolding and Core Infrastructure

**Status**: Not Started

| Task | Status | Notes |
|---|---|---|
| Initialize `package.json` | Not Started | |
| Install dependencies | Not Started | discord.js, better-sqlite3, zod, typescript, tsx, tsup |
| Create `tsconfig.json` | Not Started | Strict mode, ESM output |
| Create `.env.example` | Not Started | |
| Create `.gitignore` | Not Started | |
| Create `config.json` | Not Started | Placeholder values |
| Create `src/config/schema.ts` | Not Started | Zod schema |
| Create `src/config/loader.ts` | Not Started | Read + validate config |
| Create `src/client.ts` | Not Started | Extended Client class |
| Create `src/index.ts` | Not Started | Entry point |
| Create `src/events/ready.ts` | Not Started | Log "Ready" |
| Create `src/events/index.ts` | Not Started | Event auto-loader |
| Verify bot comes online | Not Started | |

---

## Phase 2: Database Layer

**Status**: Not Started

| Task | Status | Notes |
|---|---|---|
| Create `src/database/connection.ts` | Not Started | SQLite init, WAL mode |
| Create `src/database/migrations.ts` | Not Started | CREATE TABLE statements |
| Create `questionRepo.ts` | Not Started | add, remove, getById, getAll, getRandom, count |
| Create `attemptRepo.ts` | Not Started | create, update, getActiveByUser, complete |
| Create `cooldownRepo.ts` | Not Started | get, upsert, isOnCooldown, recordFailure |
| Write repository unit tests | Not Started | |

---

## Phase 3: Admin Commands and Question Management

**Status**: Not Started

| Task | Status | Notes |
|---|---|---|
| Create `src/commands/index.ts` | Not Started | Command auto-loader |
| Create `src/deploy-commands.ts` | Not Started | Register commands with Discord |
| Create `src/commands/quiz-admin.ts` | Not Started | add, remove, list, import, stats |
| Create `src/types/customIds.ts` | Not Started | Interaction custom ID constants |
| Wire interactionCreate for slash commands | Not Started | |
| Create `data/seed-questions.json` | Not Started | Sample questions |
| Test question management end-to-end | Not Started | |

---

## Phase 4: Verification Embed and Quiz Start

**Status**: Not Started

| Task | Status | Notes |
|---|---|---|
| Create `src/builders/verificationEmbed.ts` | Not Started | Embed from config |
| Create `src/commands/setup-verification.ts` | Not Started | Posts the embed |
| Create `src/services/cooldownService.ts` | Not Started | Backoff logic |
| Create `src/handlers/quizStart.ts` | Not Started | Button handler |
| Create `src/builders/questionEmbed.ts` | Not Started | Question + answer buttons |
| Create `src/builders/navigationRow.ts` | Not Started | Prev/Next/Submit |
| Wire button routing | Not Started | |

---

## Phase 5: Quiz Interaction

**Status**: Not Started

| Task | Status | Notes |
|---|---|---|
| Create `src/handlers/quizNavigation.ts` | Not Started | Prev/Next |
| Create `src/handlers/quizAnswer.ts` | Not Started | MC answers |
| Create `src/builders/modalBuilder.ts` | Not Started | Text input modal |
| Create `src/handlers/quizModal.ts` | Not Started | Modal submission |
| Create `src/services/quizService.ts` | Not Started | Draw, score, logic |
| Handle quiz timeout (5 min) | Not Started | |

---

## Phase 6: Scoring, Role Assignment, Failure Handling

**Status**: Not Started

| Task | Status | Notes |
|---|---|---|
| Create `src/handlers/quizSubmit.ts` | Not Started | Score and decide |
| Create `src/builders/resultEmbed.ts` | Not Started | Pass/fail result |
| Create `src/services/roleService.ts` | Not Started | Role assignment |
| Integrate cooldown on failure | Not Started | |
| Reset cooldown on pass | Not Started | |
| Handle edge cases | Not Started | Role hierarchy, already has role |

---

## Phase 7: Polish and Production Readiness

**Status**: Not Started

| Task | Status | Notes |
|---|---|---|
| Structured logging | Not Started | |
| Global interaction error handler | Not Started | |
| Graceful shutdown | Not Started | Close SQLite on signal |
| `tsup.config.ts` build config | Not Started | |
| Input validation/sanitization | Not Started | |
| End-to-end test on real server | Not Started | |
| Optional: Dockerfile | Not Started | |

---

## Changelog

| Date | Change |
|---|---|
| 2026-01-27 | Initial planning complete. README, implementation plan, and progress tracker created. |
