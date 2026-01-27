# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

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
