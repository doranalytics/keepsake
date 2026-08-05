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

NEEDS_BUILD=1
if [[ -d "$DIR/.git" ]]; then
  step "Updating Sidenote…"
  git -C "$DIR" remote set-url origin "$REPO"
  BEFORE="$(git -C "$DIR" rev-parse HEAD)"
  git -C "$DIR" pull --ff-only
  AFTER="$(git -C "$DIR" rev-parse HEAD)"
  # nothing new and a build already exists -> this run is just a relaunch
  if [[ "$BEFORE" == "$AFTER" && -f "$DIR/.next/BUILD_ID" ]]; then
    NEEDS_BUILD=0
  fi
else
  step "Downloading Sidenote…"
  git clone --depth 1 "$REPO" "$DIR"
fi

cd "$DIR"
if [[ "$NEEDS_BUILD" == 1 ]]; then
  step "Installing (takes a minute the first time)…"
  npm install --no-fund --no-audit --loglevel=error
  step "Building…"
  npm run build > /dev/null 2>&1 || npm run build
else
  step "Already up to date — just relaunching…"
fi

step "Setting Sidenote to start automatically when you log in…"
NODE_BIN="$(command -v node)"
PLIST="$HOME/Library/LaunchAgents/lol.sidenote.app.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>lol.sidenote.app</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$DIR/node_modules/next/dist/bin/next</string>
    <string>start</string>
    <string>-p</string>
    <string>$PORT</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(dirname "$NODE_BIN"):/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>SIDENOTE_MANAGED</key><string>1</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DIR/sidenote.log</string>
  <key>StandardErrorPath</key><string>$DIR/sidenote.log</string>
</dict>
</plist>
EOF

step "Starting Sidenote at http://localhost:$PORT …"
launchctl bootout "gui/$(id -u)/lol.sidenote.app" 2>/dev/null || true
# stop stray copies from older installs that used nohup
lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
for i in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PORT" && break
  sleep 1
done
open "http://localhost:$PORT"

echo ""
bold "Sidenote is running → http://localhost:$PORT"
echo "It starts automatically when you log in. To get back to it any time,"
echo "open http://localhost:$PORT (worth a bookmark) — or visit"
echo "https://sidenote.lol and click “Open Sidenote”."
echo ""
echo "Next step in the app: click “Sync your Messages”."
echo "macOS will ask for one permission (Full Disk Access) — Sidenote walks"
echo "you through it right in the app, buttons and all."
echo ""
echo "Optional, for on-device AI: Sidenote sets up Ollama and a local model"
echo "from inside the app — nothing ever leaves your Mac."
