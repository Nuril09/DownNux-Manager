#!/usr/bin/env bash
# ==============================================================================
# DownNux Manager — Multiplatform Release Packager (Linux, Windows, macOS)
# Developed by CreativeMichiz <https://github.com/CreativeMichiz>
# GNU General Public License v3.0
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
TMP_STAGE="$ROOT_DIR/build/stage"
VERSION="0.0.3"

echo "=== Packaging DownNux Manager Multiplatform Bundles v${VERSION} ==="
mkdir -p "$DIST_DIR"
rm -rf "$TMP_STAGE"
mkdir -p "$TMP_STAGE"

# 1. Ensure Linux .deb package exists
if [ ! -f "$DIST_DIR/downnux-manager_${VERSION}_amd64.deb" ]; then
  echo "[*] Building Debian package..."
  bash "$ROOT_DIR/scripts/build-deb.sh"
fi

# 2. Package Linux Portable (.tar.gz)
echo "[*] Packaging Linux Portable bundle..."
LINUX_STAGE="$TMP_STAGE/downnux-manager_${VERSION}_linux_x64"
mkdir -p "$LINUX_STAGE/apps" "$LINUX_STAGE/scripts" "$LINUX_STAGE/packages"
cp -r "$ROOT_DIR/apps/daemon" "$LINUX_STAGE/apps/"
cp -r "$ROOT_DIR/apps/gui" "$LINUX_STAGE/apps/"
cp -r "$ROOT_DIR/apps/extension" "$LINUX_STAGE/apps/"
cp -r "$ROOT_DIR/apps/native-host" "$LINUX_STAGE/apps/"
cp -r "$ROOT_DIR/packages" "$LINUX_STAGE/"
cp "$ROOT_DIR/scripts/serve-gui.mjs" "$LINUX_STAGE/scripts/"
cp "$ROOT_DIR/scripts/downnux-desktop.py" "$LINUX_STAGE/scripts/"
cp "$ROOT_DIR/package.json" "$LINUX_STAGE/"
cp "$ROOT_DIR/README.md" "$LINUX_STAGE/"

cat > "$LINUX_STAGE/start-downnux.sh" << 'EOF'
#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo " Starting DownNux Manager (Linux Portable)"
echo "=========================================================="
node scripts/serve-gui.mjs >/dev/null 2>&1 &
GUI_PID=$!
node apps/daemon/dist/main.mjs >/dev/null 2>&1 &
DAEMON_PID=$!

cleanup() {
  kill $GUI_PID $DAEMON_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 1
if [ -f "scripts/downnux-desktop.py" ] && which python3 >/dev/null 2>&1; then
  python3 scripts/downnux-desktop.py
elif which xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:1420"
  wait $DAEMON_PID
else
  echo "Open http://localhost:1420 in your browser."
  wait $DAEMON_PID
fi
EOF
chmod +x "$LINUX_STAGE/start-downnux.sh"

tar -czf "$DIST_DIR/downnux-manager_${VERSION}_linux_x64.tar.gz" -C "$TMP_STAGE" "downnux-manager_${VERSION}_linux_x64"
echo "[✓] Built: $DIST_DIR/downnux-manager_${VERSION}_linux_x64.tar.gz"

# 3. Package Windows Portable (.zip)
echo "[*] Packaging Windows bundle..."
WIN_STAGE="$TMP_STAGE/downnux-manager_${VERSION}_windows_x64"
mkdir -p "$WIN_STAGE/apps/daemon/dist" "$WIN_STAGE/apps/gui/dist" "$WIN_STAGE/apps/extension" "$WIN_STAGE/scripts"
cp -r "$ROOT_DIR/apps/daemon/dist/"* "$WIN_STAGE/apps/daemon/dist/"
cp -r "$ROOT_DIR/apps/gui/dist/"* "$WIN_STAGE/apps/gui/dist/"
cp -r "$ROOT_DIR/apps/extension/"* "$WIN_STAGE/apps/extension/"
cp "$ROOT_DIR/scripts/serve-gui.mjs" "$WIN_STAGE/scripts/"
cp "$ROOT_DIR/package.json" "$WIN_STAGE/"

cat > "$WIN_STAGE/start-downnux.bat" << 'EOF'
@echo off
setlocal
cd /d "%~dp0"
title DownNux Manager v0.0.3

echo ==========================================================
echo        DownNux Manager - High Speed Download Accelerator
echo ==========================================================
echo [*] Starting GUI and Background Download Engine...

start /b "" node scripts\serve-gui.mjs
start /b "" node apps\daemon\dist\main.mjs

timeout /t 2 >nul
start http://localhost:1420

echo [✓] DownNux Manager is active at http://localhost:1420
echo Keep this window open while downloading. Press Ctrl+C to stop.
echo.
pause
EOF

cat > "$WIN_STAGE/README.txt" << 'EOF'
==========================================================
DownNux Manager - Windows Portable Edition (v0.0.3)
Developed by CreativeMichiz <https://github.com/CreativeMichiz>
==========================================================

Prerequisites:
- Node.js (version 18 or newer) must be installed: https://nodejs.org

How to Run:
1. Double click "start-downnux.bat".
2. Your default web browser will open http://localhost:1420.
3. Enjoy IDM-level multi-threaded speed and glassmorphism interface!

Browser Extension Integration:
1. Open Brave, Google Chrome, or Microsoft Edge.
2. Navigate to "chrome://extensions" or "brave://extensions".
3. Turn on "Developer mode" (top right).
4. Click "Load unpacked" and select the "apps/extension" folder.
5. The extension will automatically intercept downloads and show video sniffer buttons!
EOF

(cd "$TMP_STAGE" && zip -r -q "$DIST_DIR/downnux-manager_${VERSION}_windows_x64.zip" "downnux-manager_${VERSION}_windows_x64")
echo "[✓] Built: $DIST_DIR/downnux-manager_${VERSION}_windows_x64.zip"

# 4. Package macOS Portable (.zip)
echo "[*] Packaging macOS bundle..."
MAC_STAGE="$TMP_STAGE/downnux-manager_${VERSION}_macos_universal"
mkdir -p "$MAC_STAGE/apps/daemon/dist" "$MAC_STAGE/apps/gui/dist" "$MAC_STAGE/apps/extension" "$MAC_STAGE/scripts"
cp -r "$ROOT_DIR/apps/daemon/dist/"* "$MAC_STAGE/apps/daemon/dist/"
cp -r "$ROOT_DIR/apps/gui/dist/"* "$MAC_STAGE/apps/gui/dist/"
cp -r "$ROOT_DIR/apps/extension/"* "$MAC_STAGE/apps/extension/"
cp "$ROOT_DIR/scripts/serve-gui.mjs" "$MAC_STAGE/scripts/"
cp "$ROOT_DIR/package.json" "$MAC_STAGE/"

cat > "$MAC_STAGE/start-downnux.command" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo " Starting DownNux Manager for macOS"
echo "=========================================================="
node scripts/serve-gui.mjs >/dev/null 2>&1 &
GUI_PID=$!
node apps/daemon/dist/main.mjs >/dev/null 2>&1 &
DAEMON_PID=$!

cleanup() {
  kill $GUI_PID $DAEMON_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 1
open "http://localhost:1420"
echo "DownNux Manager is running. Press Ctrl+C in this terminal to stop."
wait $DAEMON_PID
EOF
chmod +x "$MAC_STAGE/start-downnux.command"

cat > "$MAC_STAGE/README.txt" << 'EOF'
==========================================================
DownNux Manager - macOS Portable Edition (v0.0.3)
Developed by CreativeMichiz <https://github.com/CreativeMichiz>
==========================================================

Prerequisites:
- Node.js (version 18 or newer): https://nodejs.org or 'brew install node'

How to Run:
1. Double click "start-downnux.command" (or run 'bash start-downnux.command' in Terminal).
2. DownNux Manager will launch and open http://localhost:1420 in Safari / Chrome / Brave.

Browser Extension:
Load unpacked extension from the "apps/extension" folder in your browser's extension manager.
EOF

(cd "$TMP_STAGE" && zip -r -q "$DIST_DIR/downnux-manager_${VERSION}_macos_universal.zip" "downnux-manager_${VERSION}_macos_universal")
echo "[✓] Built: $DIST_DIR/downnux-manager_${VERSION}_macos_universal.zip"

# 5. Package Browser Extension (.zip)
echo "[*] Packaging Browser Extension..."
(cd "$ROOT_DIR/apps/extension" && zip -r -q "$DIST_DIR/downnux-extension_${VERSION}.zip" .)
echo "[✓] Built: $DIST_DIR/downnux-extension_${VERSION}.zip"

# Clean temporary stage
rm -rf "$TMP_STAGE"

echo ""
echo "=== Summary of Multiplatform Release Files ==="
ls -lh "$DIST_DIR"/*${VERSION}*
