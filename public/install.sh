#!/bin/bash
# Keepsake installer — https://keepsake-liard-rho.vercel.app
# Installs Keepsake into ~/Keepsake and opens it in your browser.
set -euo pipefail

REPO="https://github.com/doranalytics/keepsake"
DIR="${KEEPSAKE_DIR:-$HOME/Keepsake}"
PORT="${KEEPSAKE_PORT:-4747}"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
step() { printf '\n\033[1;34m▸ %s\033[0m\n' "$1"; }

bold "Keepsake — your iMessage companion"
echo "Everything installs to $DIR and runs only on this Mac."

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Keepsake reads the macOS Messages database, so it only runs on a Mac." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  step "Installing Apple's command line tools (needed for git)…"
  xcode-select --install || true
  echo "Finish the Command Line Tools install window, then run this command again."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Keepsake needs Node.js, which is a free install:"
  echo "  1. Go to https://nodejs.org and click the big green button (LTS)."
  echo "  2. Open the downloaded file and click through the installer."
  echo "  3. Quit and reopen Terminal, then run this command again."
  exit 1
fi

if [[ -d "$DIR/.git" ]]; then
  step "Updating Keepsake…"
  git -C "$DIR" pull --ff-only
else
  step "Downloading Keepsake…"
  git clone --depth 1 "$REPO" "$DIR"
fi

cd "$DIR"
step "Installing (takes a minute the first time)…"
npm install --no-fund --no-audit --loglevel=error
step "Building…"
npm run build > /dev/null 2>&1 || npm run build

step "Starting Keepsake at http://localhost:$PORT …"
# stop a previous copy if one is running
lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true
nohup env PORT="$PORT" npm start > "$DIR/keepsake.log" 2>&1 &
for i in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PORT" && break
  sleep 1
done
open "http://localhost:$PORT"

echo ""
bold "Keepsake is running → http://localhost:$PORT"
echo "Next step in the app: click “Sync your Messages”."
echo "macOS will need Full Disk Access for Terminal — the app has a button"
echo "that opens the right settings pane, then relaunch Terminal and re-run:"
echo ""
echo "  curl -fsSL https://keepsake-liard-rho.vercel.app/install.sh | bash"
echo ""
echo "Optional, for on-device AI: install Ollama from https://ollama.com/download"
echo "then run:  ollama pull qwen3.6"
