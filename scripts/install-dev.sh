#!/usr/bin/env bash
# DownNux Manager — Local Developer / User Installer
# CreativeMichiz

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ESBUILD="$ROOT_DIR/node_modules/.pnpm/@esbuild+linux-x64@0.28.2/node_modules/@esbuild/linux-x64/bin/esbuild"

echo "=== DownNux Manager Setup by CreativeMichiz ==="

# 1. Generate Extension Key and ID
EXT_ID=$(node --import tsx "$ROOT_DIR/scripts/extension-id.ts")
echo "[✓] Browser Extension ID: $EXT_ID"

# 2. Build Daemon and Native Host
echo "[*] Building daemon..."
mkdir -p "$ROOT_DIR/apps/daemon/dist"
"$ESBUILD" "$ROOT_DIR/apps/daemon/src/main.ts" \
  --bundle --platform=node --format=esm --target=node22 \
  --outfile="$ROOT_DIR/apps/daemon/dist/main.mjs" \
  --external:node:sqlite \
  --alias:@unduh/shared="$ROOT_DIR/packages/shared/src/index.ts" \
  --alias:@unduh/shared/node="$ROOT_DIR/packages/shared/src/node/index.ts"

echo "[*] Building native messaging host..."
mkdir -p "$ROOT_DIR/apps/native-host/dist"
"$ESBUILD" "$ROOT_DIR/apps/native-host/src/main.ts" \
  --bundle --platform=node --format=esm --target=node22 \
  --outfile="$ROOT_DIR/apps/native-host/dist/host.mjs" \
  --alias:@unduh/shared="$ROOT_DIR/packages/shared/src/index.ts" \
  --alias:@unduh/shared/node="$ROOT_DIR/packages/shared/src/node/index.ts"

cat > "$ROOT_DIR/apps/native-host/dist/downnux-native-host" <<EOF
#!/bin/sh
exec /usr/bin/node "$ROOT_DIR/apps/native-host/dist/host.mjs" "\$@"
EOF
chmod +x "$ROOT_DIR/apps/native-host/dist/downnux-native-host"
echo "[✓] Native host built at: $ROOT_DIR/apps/native-host/dist/downnux-native-host"

# 3. Create CLI wrapper
mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/downnux" <<EOF
#!/bin/sh
exec /usr/bin/node --import tsx "$ROOT_DIR/apps/daemon/src/cli.ts" "\$@"
EOF
chmod +x "$HOME/.local/bin/downnux"
echo "[✓] CLI installed: $HOME/.local/bin/downnux"

# 4. Install Native Messaging Manifests for Chrome, Brave, Chromium, Edge, and Firefox
HOST_PATH="$ROOT_DIR/apps/native-host/dist/downnux-native-host"

# Chromium-based Manifest
CHROMIUM_MANIFEST=$(cat <<EOF
{
  "name": "com.creativemichiz.downnux.native_host",
  "description": "DownNux Manager Native Messaging Host by CreativeMichiz",
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
  "description": "DownNux Manager Native Messaging Host by CreativeMichiz",
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
echo "[✓] Registered Native Messaging Manifests for Chrome, Brave, Edge, Chromium, and Firefox"

# 5. Create Systemd User Service
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/downnux-daemon.service" <<EOF
[Unit]
Description=DownNux Manager Background Daemon (CreativeMichiz)
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node "$ROOT_DIR/apps/daemon/dist/main.mjs"
Restart=on-failure
RestartSec=3
KillMode=process

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
echo "[✓] Systemd user service installed: ~/.config/systemd/user/downnux-daemon.service"

echo ""
echo "=== Setup Complete! ==="
echo "1. To start daemon now:     systemctl --user restart downnux-daemon"
echo "2. To test CLI:             downnux ping"
echo "3. To load browser extension in Chrome/Brave/Edge:"
echo "   - Open chrome://extensions or brave://extensions"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked' and select:"
echo "     $ROOT_DIR/apps/extension"
echo "4. In Firefox:"
echo "   - Open about:debugging#/runtime/this-firefox"
echo "   - Click 'Load Temporary Add-on' and select:"
echo "     $ROOT_DIR/apps/extension/manifest.firefox.json"
