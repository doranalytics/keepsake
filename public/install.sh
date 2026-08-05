#!/bin/bash
# Sidenote installer — https://sidenote.lol
# Installs Sidenote into ~/Sidenote and opens it in your browser.
set -euo pipefail

REPO="https://github.com/doranalytics/sidenote"
DIR="${SIDENOTE_DIR:-$HOME/Sidenote}"
PORT="${SIDENOTE_PORT:-4747}"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
step() { printf '\n\033[1;34m▸ %s\033[0m\n' "$1"; }

bold "Sidenote — the iMessage companion"
echo "Everything installs to $DIR and runs only on this Mac."

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Sidenote reads the macOS Messages database, so it only runs on a Mac." >&2
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
  echo "Sidenote needs Node.js, which is a free install:"
  echo "  1. Go to https://nodejs.org and click the big green button (LTS)."
  echo "  2. Open the downloaded file and click through the installer."
  echo "  3. Quit and reopen Terminal, then run this command again."
  exit 1
fi

# migrate an old Keepsake install if present
if [[ -d "$HOME/Keepsake/.git" && ! -d "$DIR" ]]; then
  mv "$HOME/Keepsake" "$DIR"
fi

if [[ -d "$DIR/.git" ]]; then
  step "Updating Sidenote…"
  git -C "$DIR" remote set-url origin "$REPO"
  git -C "$DIR" pull --ff-only
else
  step "Downloading Sidenote…"
  git clone --depth 1 "$REPO" "$DIR"
fi

cd "$DIR"
step "Installing (takes a minute the first time)…"
npm install --no-fund --no-audit --loglevel=error
step "Building…"
npm run build > /dev/null 2>&1 || npm run build

step "Starting Sidenote at http://localhost:$PORT …"
# stop a previous copy if one is running
lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true
nohup env PORT="$PORT" npm start > "$DIR/sidenote.log" 2>&1 &
for i in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PORT" && break
  sleep 1
done
open "http://localhost:$PORT"

echo ""
bold "Sidenote is running → http://localhost:$PORT"
echo "Next step in the app: click “Sync your Messages”."
echo "macOS will need Full Disk Access for Terminal — the app has a button"
echo "that opens the right settings pane, then relaunch Terminal and re-run:"
echo ""
echo "  curl -fsSL https://sidenote.lol/install.sh | bash"
echo ""
echo "Optional, for on-device AI: Sidenote sets up Ollama and a local model"
echo "from inside the app — nothing ever leaves your Mac."
