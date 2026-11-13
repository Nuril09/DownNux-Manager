#!/usr/bin/env bash
# DownNux Manager — Local Developer / User Installer
# HoodTech <https://github.com/Nuril09/DownNux-Manager>
# GNU General Public License v3.0

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Resolve esbuild binary
if command -v esbuild >/dev/null 2>&1; then
  ESBUILD="esbuild"
elif [ -x "$ROOT_DIR/node_modules/.bin/esbuild" ]; then
  ESBUILD="$ROOT_DIR/node_modules/.bin/esbuild"
elif [ -x "$ROOT_DIR/node_modules/.pnpm/node_modules/.bin/esbuild" ]; then
  ESBUILD="$ROOT_DIR/node_modules/.pnpm/node_modules/.bin/esbuild"
else
  ESBUILD=$(find "$ROOT_DIR/node_modules" -name esbuild -type f -perm /111 2>/dev/null | head -n 1)
fi

echo "=== DownNux Manager Setup by HoodTech ==="

# 1. Generate Extension Key and ID
EXT_ID=$(node --import tsx "$ROOT_DIR/scripts/extension-id.ts")
echo "[✓] Browser Extension ID: $EXT_ID"

# 2. Build Daemon and Native Host
echo "[*] Building daemon & CLI..."
mkdir -p "$ROOT_DIR/apps/daemon/dist"
"$ESBUILD" "$ROOT_DIR/apps/daemon/src/main.ts" \
  --bundle --platform=node --format=esm --target=node22 \
  --packages=external --outfile="$ROOT_DIR/apps/daemon/dist/main.mjs" \
  --alias:@downnux/shared="$ROOT_DIR/packages/shared/src/index.ts" \
  --alias:@downnux/shared/node="$ROOT_DIR/packages/shared/src/node/index.ts"

"$ESBUILD" "$ROOT_DIR/apps/daemon/src/cli.ts" \
  --bundle --platform=node --format=esm --target=node22 \
  --outfile="$ROOT_DIR/apps/daemon/dist/cli.mjs" \
  --alias:@downnux/shared="$ROOT_DIR/packages/shared/src/index.ts" \
  --alias:@downnux/shared/node="$ROOT_DIR/packages/shared/src/node/index.ts"

echo "[*] Building browser integration bridge..."
mkdir -p "$ROOT_DIR/apps/native-host/dist"
"$ESBUILD" "$ROOT_DIR/apps/native-host/src/main.ts" \
  --bundle --platform=node --format=esm --target=node22 \
  --outfile="$ROOT_DIR/apps/native-host/dist/host.mjs" \
  --alias:@downnux/shared="$ROOT_DIR/packages/shared/src/index.ts" \
  --alias:@downnux/shared/node="$ROOT_DIR/packages/shared/src/node/index.ts"

cat > "$ROOT_DIR/apps/native-host/dist/downnux-native-host" <<EOF
#!/bin/sh
exec /usr/bin/node "$ROOT_DIR/apps/native-host/dist/host.mjs" "\$@"
EOF
chmod +x "$ROOT_DIR/apps/native-host/dist/downnux-native-host"
echo "[✓] Browser integration built at: $ROOT_DIR/apps/native-host/dist/downnux-native-host"

# 3. Create CLI & Native GUI wrappers in ~/.local/bin and project root
mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/downnux" <<EOF
#!/bin/sh
exec /usr/bin/node "$ROOT_DIR/apps/daemon/dist/cli.mjs" "\$@"
EOF
chmod +x "$HOME/.local/bin/downnux"

cat > "$HOME/.local/bin/downnux-gui" <<EOF
#!/bin/sh
exec python3 "$ROOT_DIR/scripts/downnux-desktop.py" "\$@"
EOF
chmod +x "$HOME/.local/bin/downnux-gui"

# Ensure root wrappers also exist
cat > "$ROOT_DIR/downnux" <<EOF
#!/bin/sh
exec /usr/bin/node "$ROOT_DIR/apps/daemon/dist/cli.mjs" "\$@"
EOF
chmod +x "$ROOT_DIR/downnux"

cat > "$ROOT_DIR/downnux-gui" <<EOF
#!/bin/sh
exec python3 "$ROOT_DIR/scripts/downnux-desktop.py" "\$@"
EOF
chmod +x "$ROOT_DIR/downnux-gui"

if [ -d "$HOME/.gemini/antigravity/bin" ]; then
  ln -sf "$HOME/.local/bin/downnux" "$HOME/.gemini/antigravity/bin/downnux"
  ln -sf "$HOME/.local/bin/downnux-gui" "$HOME/.gemini/antigravity/bin/downnux-gui"
fi

# Install Desktop Entry into user applications
mkdir -p "$HOME/.local/share/applications" "$HOME/.local/share/icons/hicolor/512x512/apps"
cp "$ROOT_DIR/apps/gui/public/app-icon.png" "$HOME/.local/share/icons/hicolor/512x512/apps/downnux.png" 2>/dev/null || true

cat > "$HOME/.local/share/applications/downnux-manager.desktop" <<EOF
[Desktop Entry]
Name=DownNux Manager
GenericName=Download Manager
Comment=High performance segmented download manager
Exec=$HOME/.local/bin/downnux-gui %U
Icon=$ROOT_DIR/apps/gui/public/app-icon.png
Terminal=false
Type=Application
Categories=Network;FileTransfer;Utility;
Keywords=download;manager;idm;accelerator;
StartupWMClass=DownNux Manager
EOF
chmod +x "$HOME/.local/share/applications/downnux-manager.desktop"

if which update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo "[✓] CLI installed: $HOME/.local/bin/downnux"
echo "[✓] Native GUI installed: $HOME/.local/bin/downnux-gui"
echo "[✓] Desktop shortcut installed: ~/.local/share/applications/downnux-manager.desktop"

# 4. Install Browser Integration Manifests for Chrome, Brave, Chromium, Edge, and Firefox
HOST_PATH="$ROOT_DIR/apps/native-host/dist/downnux-native-host"

# Chromium-based Manifest
CHROMIUM_MANIFEST=$(cat <<EOF
{
  "name": "com.creativemichiz.downnux.native_host",
  "description": "DownNux Manager by HoodTech",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF
)

# Firefox Manifest
FIREFOX_MANIFEST=$(cat <<EOF
{
  "name": "com.creativemichiz.downnux.native_host",
  "description": "DownNux Manager by HoodTech",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_extensions": [
    "downnux@creativemichiz.com"
  ]
}
EOF
)

for target in \
  "$HOME/.config/google-chrome/NativeMessagingHosts" \
  "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts" \
  "$HOME/.config/chromium/NativeMessagingHosts" \
  "$HOME/.config/microsoft-edge/NativeMessagingHosts"; do
  mkdir -p "$target"
  echo "$CHROMIUM_MANIFEST" > "$target/com.creativemichiz.downnux.native_host.json"
done

mkdir -p "$HOME/.mozilla/native-messaging-hosts"
echo "$FIREFOX_MANIFEST" > "$HOME/.mozilla/native-messaging-hosts/com.creativemichiz.downnux.native_host.json"
echo "[✓] Registered Browser Integration Manifests for Chrome, Brave, Edge, Chromium, and Firefox"

# 5. Build GUI assets
echo "[*] Building GUI web bundle..."
npm --prefix "$ROOT_DIR/apps/gui" run build

# 6. Create Systemd User Services (Daemon + GUI)
mkdir -p "$HOME/.config/systemd/user"

# Daemon service
cat > "$HOME/.config/systemd/user/downnux-daemon.service" <<EOF
[Unit]
Description=DownNux Manager Background Daemon (HoodTech)
After=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
ExecStart=/usr/bin/node "$ROOT_DIR/apps/daemon/dist/main.mjs"
Restart=on-failure
RestartSec=3
KillMode=process

[Install]
WantedBy=default.target
EOF

# GUI service
cat > "$HOME/.config/systemd/user/downnux-gui.service" <<EOF
[Unit]
Description=DownNux Manager GUI Web Server (HoodTech)
After=network.target downnux-daemon.service

[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
ExecStart=/usr/bin/node "$ROOT_DIR/scripts/serve-gui.mjs"
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user restart downnux-daemon downnux-gui
echo "[✓] Systemd user services activated: downnux-daemon & downnux-gui"

echo ""
echo "================================================="
echo "   DownNux Manager is Ready to Use!"
echo "================================================="
echo "1. CLI Commands:"
echo "   - Test daemon:     downnux ping"
echo "   - List downloads:  downnux ls"
echo "   - Add download:    downnux add <URL> -c 8"
echo "   - Pause download:  downnux pause <ID>"
echo "   - Resume download: downnux resume <ID>"
echo ""
echo "2. GUI Interface:"
echo "   - Open browser:    http://localhost:1420"
echo ""
echo "3. Browser Integration Extension:"
echo "   - Chrome / Brave / Edge: Open brave://extensions or chrome://extensions,"
echo "     enable 'Developer mode', click 'Load unpacked', and select:"
echo "     $ROOT_DIR/apps/extension"
echo "   - Firefox: Open about:debugging#/runtime/this-firefox,"
echo "     click 'Load Temporary Add-on', and select:"
echo "     $ROOT_DIR/apps/extension/manifest.firefox.json"
echo "================================================="
