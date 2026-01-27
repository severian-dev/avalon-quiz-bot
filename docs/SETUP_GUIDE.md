# Setup Guide

## Table of Contents

1. [Create the Discord Application](#1-create-the-discord-application)
2. [Create the Bot User](#2-create-the-bot-user)
3. [Generate the Invite URL](#3-generate-the-invite-url)
4. [Server-Side Setup](#4-server-side-setup)
5. [Configure and Start the Bot](#5-configure-and-start-the-bot)
6. [Seed Questions and Post the Embed](#6-seed-questions-and-post-the-embed)
7. [What a New Member Sees](#7-what-a-new-member-sees)
8. [Bot Appearance and Presence](#8-bot-appearance-and-presence)

---

## 1. Create the Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Give it a name (e.g., "Avalon Quiz Bot")
4. Note the **Application ID** (also called Client ID) from the General Information page -- you'll need it for `.env`

---

## 2. Create the Bot User

1. In the application settings, go to the **Bot** tab
2. Click **Reset Token** to generate a bot token -- copy it immediately (you can't see it again)
3. Under **Privileged Gateway Intents**, enable:
   - **Server Members Intent** -- required for role assignment
4. You do NOT need:
   - Message Content Intent (all input comes via interactions)
   - Presence Intent

---

## 3. Generate the Invite URL

Go to **OAuth2 > URL Generator** in the Developer Portal:

- **Scopes**: select `bot` and `applications.commands`
- **Bot Permissions**: select:
  - `Send Messages`
  - `Embed Links`
  - `Manage Roles`

This generates a URL like:

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=268435536
```

Open that URL in a browser, select your server, and authorize.

---

## 4. Server-Side Setup

Once the bot is in the server:

### Enable Developer Mode

Go to **User Settings > Advanced > Developer Mode** and enable it. This lets you right-click channels, roles, and users to copy their IDs.

### Role Hierarchy

Go to **Server Settings > Roles** and drag the bot's role **above** the verification role in the list. Discord requires this hierarchy for the bot to be able to assign that role to members.

### Copy IDs You Need

Right-click (or long-press on mobile) to copy these IDs:

| What | Where to find it | Goes in |
|---|---|---|
| Server (Guild) ID | Right-click the server name | `.env` → `GUILD_ID` |
| Verification channel ID | Right-click the channel | `config.json` → `verification.channelId` |
| Verification role ID | Server Settings > Roles > right-click the role | `config.json` → `verification.roleId` |
| Admin role ID | Same as above, for the admin/mod role | `config.json` → `admin.roleId` |

### Channel Permissions (Recommended)

For the verification flow to actually gate access:

- **`@everyone` role**: deny access to all channels except the verification channel
- **Verification role**: grant access to all other channels
- **Verification channel**: allow `@everyone` to view it, but consider denying `Send Messages` (users only need to click the button, not type)

---

## 5. Configure and Start the Bot

```bash
# 1. Install dependencies
npm install

# 2. Set up secrets
cp .env.example .env
# Edit .env:
#   DISCORD_TOKEN=your-bot-token
#   CLIENT_ID=your-application-id
#   GUILD_ID=your-server-id

# 3. Set up config
# Edit config.json with the IDs from step 4

# 4. Register slash commands with Discord
npm run deploy-commands

# 5. Start the bot
npm run dev        # Development (with tsx, auto-restart)
# or
npm run build && npm start   # Production
```

### Verifying It Works

When the bot starts, you should see:

```
Ready! Logged in as YourBotName#1234
```

In your server, the bot should appear in the member list as online.

---

## 6. Seed Questions and Post the Embed

An admin (someone with the configured admin role) runs these commands in Discord:

### Import Seed Questions

Use `/quiz-admin import` and attach the `data/seed-questions.json` file. Or add questions individually:

```
/quiz-admin add-mc question:What is 2+2? choices:[{"emoji":"🅰️","label":"3","isCorrect":false},{"emoji":"🅱️","label":"4","isCorrect":true},{"emoji":"🇨","label":"5","isCorrect":false}]
```

```
/quiz-admin add-text question:What is the chemical symbol for water? answer:H2O
```

### Verify the Pool

```
/quiz-admin list
```

Make sure you have at least as many questions as `questionsPerQuiz` in `config.json` (default: 10).

### Post the Verification Embed

```
/setup-verification
```

This posts the public embed with the "Start Verification Quiz" button in the configured channel.

---

## 7. What a New Member Sees

1. They join the server and can only see the verification channel
2. They see a rich embed with a **"Start Verification Quiz"** button
3. They click the button
4. An **ephemeral message** appears (only they can see it) with the first quiz question
5. They answer questions using buttons (multiple choice) or modals (text input)
6. They navigate with **Prev / Next** and click **Submit Quiz** when done
7. **Pass** → they receive the verification role and can access the rest of the server
8. **Fail** → they're told their score, the threshold, and when they can retry (exponential backoff)

---

## 8. Bot Appearance and Presence

### What You Control in the Developer Portal

These are set in the [Developer Portal](https://discord.com/developers/applications) under the **Bot** tab and **General Information** tab:

| Setting | Where | Notes |
|---|---|---|
| **Bot username** | Bot tab | The display name in the member list and messages |
| **Bot avatar** | Bot tab | Profile picture shown next to messages and in the member list |
| **Bot banner** | Bot tab | Profile banner (visible when clicking the bot's profile) |
| **App description** | General Information | Shown in the bot's "About Me" when users click its profile |
| **App icon** | General Information | Used in the OAuth2 authorization screen |

### What You Control in Code (Presence / Status)

Discord bots can set a **presence** that shows as a status line under their name in the member list. This is configured in the client options or set dynamically at runtime.

#### Status Types

| Status | Appearance |
|---|---|
| `online` | Green dot |
| `idle` | Yellow/orange dot |
| `dnd` (do not disturb) | Red dot |
| `invisible` | Gray dot (appears offline) |

#### Activity Types

| Type | Displays as |
|---|---|
| `Playing` | "Playing ..." |
| `Watching` | "Watching ..." |
| `Listening` | "Listening to ..." |
| `Competing` | "Competing in ..." |
| `Custom` | Shows custom text with optional emoji |

#### Where to Configure

The bot's presence is set in `src/client.ts` via the client constructor options, or dynamically via `client.user.setPresence()`. See the [Bot Appearance section in the implementation plan](#configuring-presence) below for the code location.

To set a static presence at startup, modify the `createClient()` function in `src/client.ts`:

```typescript
const client = new Client({
  intents: [...],
  presence: {
    status: 'online',
    activities: [{
      name: 'Verification Quiz',
      type: ActivityType.Watching,
    }],
  },
});
```

To update it dynamically (e.g., showing question count):

```typescript
client.user.setPresence({
  status: 'online',
  activities: [{
    name: `${questionCount} questions loaded`,
    type: ActivityType.Custom,
  }],
});
```

### Summary of Appearance Controls

| Aspect | Controlled where |
|---|---|
| Username and avatar | Developer Portal (Bot tab) |
| Profile description | Developer Portal (General Information) |
| Online/idle/DND status | Code: `presence.status` in client options |
| "Playing/Watching/..." text | Code: `presence.activities` in client options |
| Embed color and text | `config.json` (embedColor, embedTitle, etc.) |
| Button label | `config.json` (buttonLabel) |
