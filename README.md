# Keepsake

An iMessage companion for your Mac. Search everything you've ever texted, keep
notes on the people you care about, and ask on-device AI about any thread.

**Live demo:** the deployed site runs with realistic sample conversations, since
a web server can't (and shouldn't) read your Messages database. The real thing
runs locally on your Mac.

## What it does

- **Sync** — copies `~/Library/Messages/chat.db` into a private index at
  `~/.keepsake/` (SQLite + FTS5 full-text search). Your Contacts database is
  used to resolve phone numbers and emails into names. Nothing leaves your Mac.
- **Search** — instant full-text search across every conversation, or scoped to
  a single thread. Click a result to jump to that exact moment in the chat.
- **Notes** — a private notepad pinned to each person or group, saved in your
  browser.
- **On-device AI** — summarize a thread or ask questions about it ("what plans
  did we make?") through [Ollama](https://ollama.com). Uses whatever model you
  have pulled (Qwen models are preferred if present). No API keys, no cloud.

## Run it on your Mac

```bash
git clone https://github.com/doranalytics/keepsake && cd keepsake
npm install
npm run dev
```

Open http://localhost:3000 and click **Sync your Messages**.

Two permissions matter:

1. **Full Disk Access** for your terminal app (System Settings → Privacy &
   Security → Full Disk Access) so Keepsake can read the Messages database.
   The setup screen has an "Open Full Disk Access settings" button that jumps
   straight to the right pane — macOS doesn't allow apps to grant this
   themselves, so you flip the toggle for the terminal app you launch Keepsake
   from, then restart that terminal. The grant goes to your terminal app on
   your Mac, not to any cloud or AI service.
2. **Ollama running** (`ollama serve`, plus e.g. `ollama pull qwen3.6`) if you
   want the AI features. Everything works without it except summarize/ask.

Set `OLLAMA_MODEL` to pin a specific model, `OLLAMA_URL` if Ollama isn't on the
default port.

## Privacy

Keepsake is read-only over your data and fully local: the message index lives in
`~/.keepsake/`, notes live in your browser's localStorage, and AI inference runs
on your machine via Ollama. The deployed demo contains only fictional sample
data.
