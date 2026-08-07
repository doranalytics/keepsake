# Sidenote

The iMessage companion for your Mac. Search everything you've ever texted, pin
the messages worth remembering, keep notes on the people you care about, and
ask on-device AI about any thread.

**Get it:** https://sidenote.lol — the site is a live demo with
sample conversations plus a one-command installer. Sidenote itself runs 100%
locally; a web server can't (and shouldn't) read your Messages database.

## What it does

- **Sync** — copies `~/Library/Messages/chat.db` into a private index at
  `~/.sidenote/` (SQLite + FTS5 full-text search). Your Contacts database
  resolves phone numbers and emails into names. Nothing leaves your Mac.
- **Search** — instant full-text search across every conversation, or scoped
  to one thread. Click a result to jump to that exact moment in the chat.
- **Remember** — right-click any message → "Remember this." It's pinned beside
  your notes on that person; clicking it jumps back to its place in the thread.
- **Export** — copy or download a plain-text transcript of any conversation
  (pick a time range), ready to paste into any AI.
- **On-device AI** — summarize a thread or ask questions about it through
  [Ollama](https://ollama.com), running a local model on your Mac. Sidenote
  walks you through the setup in-app. No API keys, no cloud. Keep as many
  separate AI chats per conversation as you like; they're saved and picked
  back up where you left them.
- **Kept** — notes, pinned messages, and AI chats are written to
  `~/.sidenote/vault.db`, separate from the message index. They survive
  quitting, re-syncing, and updating the app.

## Install

Paste this into Terminal:

```bash
curl -fsSL https://sidenote.lol/install.sh | bash
```

It installs to `~/Sidenote`, starts the app at http://localhost:4747, and opens
it in your browser. Then click **Sync your Messages**.

Two permissions matter:

1. **Full Disk Access** for your terminal app, so Sidenote can read the
   Messages database. The app's setup screen has a button that opens the exact
   System Settings pane — macOS requires you to flip the toggle yourself. The
   grant goes to your terminal app on your Mac, never to any cloud service.
2. **Ollama** (optional, for AI): the AI panel guides you through installing
   Ollama and downloading a local model, with progress shown in-app.

Set `OLLAMA_MODEL` to pin a specific model, `OLLAMA_URL` if Ollama isn't on
the default port.

## Privacy

Sidenote is read-only over your Messages data and fully local: the message
index lives in `~/.sidenote/index.db`, your notes, pinned messages, and AI
chats live in `~/.sidenote/vault.db`, and AI inference runs on your machine
via Ollama. Nothing is uploaded. The deployed demo contains only fictional
sample data, and stores its throwaway notes in the browser.
