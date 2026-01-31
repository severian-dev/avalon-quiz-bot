# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added

- **Multi-select question support**: Questions with multiple correct answers now automatically become multi-select questions. Users can toggle multiple choices on/off, and scoring requires selecting ALL correct answers with NO incorrect ones.
- **Answer shuffling**: Multiple-choice answers are now scrambled for each quiz attempt using deterministic seeding. Each attempt sees choices in a different random order while maintaining consistency during navigation. Display emojis (1️⃣ 2️⃣ 3️⃣ 4️⃣) remain fixed for clean UI while answer text shuffles behind them.
- **Submit button validation**: The Submit Quiz button is now disabled until all questions have been answered, preventing incomplete submissions.
- **Reset attempts command**: Added `npm run reset-attempts` script to abandon all in-progress quizzes and clear cooldowns for testing/maintenance.
- **Customizable pass message**: Added `verification.passTitle` and `verification.passMessage` config options to customize the success title and message shown when users pass the quiz. Pass message supports `{correct}` and `{total}` template variables.
- **Verification embed thumbnail**: Added optional `verification.embedThumbnail` and `verification.passThumbnail` fields to display images on the verification embed and pass message. Leave empty to hide.
- **3 free retries**: Users now get 3 consecutive quiz attempts without cooldown before exponential backoff kicks in. The 4th failure triggers a 5-minute cooldown, 5th triggers 10 minutes, etc.
- **Wrong questions feedback**: Failure messages now show which questions were answered incorrectly (by question title) without revealing the correct answers, helping users study and improve.
- **Custom choice emojis**: The `emoji` field in question choices is now respected. If provided, custom emojis (e.g., 🅰️ 🅱️ 🇨 🇩) are displayed in their original fixed order while answer text shuffles. Falls back to numbered emojis (1️⃣ 2️⃣ 3️⃣ 4️⃣) if empty. This maintains the anti-cheat mechanism where emojis stay consistent across attempts.

### Changed

- **Button labels simplified**: Multiple-choice buttons now show only emojis (or numbers as fallback) instead of full answer text, with answers displayed in the embed description.
- **Cooldown timing**: Cooldown calculation adjusted so the 4th failure (first cooldown) starts at 5 minutes instead of 40 minutes, making the progression more forgiving.
- **Multi-select indicator enhanced**: Multi-select questions now show "(SELECT MULTIPLE - Select all that apply)" in the title for extra clarity.

### Fixed

- **Deprecation warnings**: Replaced deprecated `ephemeral: true` with `flags: 64` to use the modern Discord.js flags API.
- **Permission checking**: Added proactive permission validation in `/setup-verification` with clear error messages listing missing permissions.
- **Button label length**: Fixed crashes when answer text exceeded Discord's 80-character button label limit.

## [1.0.0] - 2026-01-27

### Added

- **Project scaffolding**: TypeScript, ESM, discord.js v14, better-sqlite3, Zod config validation, tsup build, tsx dev runner
- **Database layer**: SQLite with WAL mode; `questions`, `quiz_attempts`, and `cooldowns` tables; repository pattern for all CRUD
- **Admin commands**: `/quiz-admin` with subcommands `add-mc`, `add-text`, `remove`, `list`, `import`, `stats`
- **Verification embed**: `/setup-verification` posts a configurable embed with a "Start Verification Quiz" button to the configured channel
- **Quiz flow**: Ephemeral quiz messages visible only to the quiz-taker; multiple-choice via emoji-labeled buttons; text-input via Discord modals; prev/next navigation editing the message in place
- **Scoring and role assignment**: Automatic role grant on pass; configurable pass threshold
- **Exponential backoff**: Failed attempts trigger increasing cooldowns (5 min to 12h cap), persisted in SQLite across restarts
- **5-minute quiz timeout**: Enforced on every interaction; expired attempts auto-abandoned on bot startup
- **Dynamic bot presence**: Status shows active quiz count and total verified count, updated on quiz start/pass/fail and on bot ready
- **Graceful shutdown**: Closes SQLite and destroys the Discord client on SIGINT/SIGTERM
- **Global error handling**: try/catch in the interaction router with fallback ephemeral error reply
- **Seed data**: `data/seed-questions.json` with 10 sample questions (8 MC, 2 text-input)
- **Documentation**: README with setup/config reference, implementation plan, progress tracker, setup guide with invite flow and bot appearance reference
- **MIT license**
