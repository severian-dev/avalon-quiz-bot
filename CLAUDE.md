# CLAUDE.md

Project-specific instructions for working on avalon-quiz-bot.

## Project Overview

Discord verification bot. Users click a button in a verification channel, take an ephemeral quiz, and receive a role on passing. Built with TypeScript, discord.js v14, and SQLite.

## Key Commands

- `npm run dev` -- run with tsx (development)
- `npm run build` -- compile with tsup
- `npm start` -- run compiled output (requires .env)
- `npm run deploy-commands` -- register slash commands with Discord
- `npx tsc --noEmit` -- type-check without emitting

## Documentation Rules

When making changes, **always update**:

- **CHANGELOG.md** -- add entries under `[Unreleased]` following Keep a Changelog format. Group changes under `Added`, `Changed`, `Fixed`, or `Removed` headings.
- **README.md** -- update the features list, config reference, or command table if the change affects user-facing behavior.
- **docs/PROGRESS.md** -- update task statuses if working on tracked items.

## Project Structure

- `src/commands/` -- slash command definitions
- `src/events/` -- Discord event handlers (interactionCreate is the master router)
- `src/handlers/` -- button and modal interaction handlers
- `src/builders/` -- pure functions that construct embeds, action rows, modals
- `src/services/` -- business logic (no Discord API calls)
- `src/database/repositories/` -- data access layer, one per table
- `src/types/` -- shared types and custom ID constants
- `docs/` -- implementation plan, progress tracker, setup guide
- `data/` -- seed question JSON

## Conventions

- All quiz interactions are ephemeral (only the quiz-taker sees them)
- The only public message is the verification embed posted by `/setup-verification`
- Config is layered: `.env` for secrets, `config.json` for behavior, slash commands for questions
- Questions are stored in SQLite, not JSON files (JSON is only for import/seed)
- Custom IDs for interactions are centralized in `src/types/customIds.ts`
- Bot presence updates on quiz start/complete via `src/services/presenceService.ts`
