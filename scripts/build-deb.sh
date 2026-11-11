#!/usr/bin/env bash
# ==============================================================================
# DownNux Manager — Official Debian / Ubuntu (.deb) Package Builder
# Developed by CreativeMichiz <https://github.com/CreativeMichiz>
# GNU General Public License v3.0
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build/deb-pkg"
DIST_DIR="$ROOT_DIR/dist"
PKG_VERSION="0.0.1"
PKG_NAME="downnux-manager_${PKG_VERSION}_amd64"

echo "=== Building Native Linux (.deb) Package for DownNux Manager ==="

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

# 1. Ensure GUI and Daemon are built
echo "[*] Building GUI web bundle..."
npm --prefix "$ROOT_DIR/apps/gui" run build

echo "[*] Building background daemon..."
ESBUILD="$ROOT_DIR/node_modules/.pnpm/@esbuild+linux-x64@0.28.2/node_modules/@esbuild/linux-x64/bin/esbuild"
mkdir -p "$ROOT_DIR/apps/daemon/dist"
"$ESBUILD" "$ROOT_DIR/apps/daemon/src/main.ts" \
  --bundle --platform=node --format=esm --target=node22 \
  --packages=external \
  --outfile="$ROOT_DIR/apps/daemon/dist/main.mjs" \
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
exec /usr/bin/node "/usr/lib/downnux-manager/apps/native-host/dist/host.mjs" "\$@"
EOF
chmod +x "$ROOT_DIR/apps/native-host/dist/downnux-native-host"

# 2. Setup Directory Tree for .deb
mkdir -p "$BUILD_DIR/DEBIAN"
mkdir -p "$BUILD_DIR/usr/bin"
mkdir -p "$BUILD_DIR/usr/lib/downnux-manager"
mkdir -p "$BUILD_DIR/usr/share/applications"
mkdir -p "$BUILD_DIR/usr/share/pixmaps"
mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps"

# 3. Create DEBIAN/control
cat > "$BUILD_DIR/DEBIAN/control" <<EOF
Package: downnux-manager
Version: $PKG_VERSION
Section: utils
Priority: optional
Architecture: amd64
Maintainer: CreativeMichiz <https://github.com/CreativeMichiz>
Depends: nodejs (>= 18.0.0), python3, python3-gi, gir1.2-gtk-3.0, gir1.2-webkit2-4.1 | gir1.2-webkit2-4.0
Recommends: aria2, ffmpeg
Description: Professional, segmented multi-connection download manager for Linux
 DownNux Manager is a native Linux download manager mirroring Internet Download Manager (IDM).
 Features segmented parallel engine, background daemon, browser integration (Chrome, Brave, Firefox),
 video sniffing, and an authentic iOS glassmorphism interface.
EOF

# 4. Copy Application Files into /usr/lib/downnux-manager
cp -r "$ROOT_DIR/apps" "$BUILD_DIR/usr/lib/downnux-manager/"
cp -r "$ROOT_DIR/packages" "$BUILD_DIR/usr/lib/downnux-manager/"
cp -r "$ROOT_DIR/scripts" "$BUILD_DIR/usr/lib/downnux-manager/"
cp "$ROOT_DIR/package.json" "$BUILD_DIR/usr/lib/downnux-manager/"

# Embed pre-compiled standalone helper tools if present
mkdir -p "$BUILD_DIR/usr/lib/downnux-manager/bin"
if [ -f "$HOME/.local/bin/yt-dlp" ]; then
  cp "$HOME/.local/bin/yt-dlp" "$BUILD_DIR/usr/lib/downnux-manager/bin/"
fi
if [ -f "$HOME/.local/bin/ffmpeg" ]; then
  cp "$HOME/.local/bin/ffmpeg" "$BUILD_DIR/usr/lib/downnux-manager/bin/"
fi
if [ -f "$HOME/.local/lib/unduh-tools/aria2/bin/aria2c" ]; then
  cp "$HOME/.local/lib/unduh-tools/aria2/bin/aria2c" "$BUILD_DIR/usr/lib/downnux-manager/bin/"
fi

# 5. Create CLI and Native GUI Wrappers in /usr/bin
cat > "$BUILD_DIR/usr/bin/downnux" <<'EOF'
#!/bin/sh
exec /usr/bin/node --import tsx "/usr/lib/downnux-manager/apps/daemon/src/cli.ts" "$@"
EOF
chmod 755 "$BUILD_DIR/usr/bin/downnux"

cat > "$BUILD_DIR/usr/bin/downnux-gui" <<'EOF'
#!/bin/sh
exec python3 "/usr/lib/downnux-manager/scripts/downnux-desktop.py" "$@"
EOF
chmod 755 "$BUILD_DIR/usr/bin/downnux-gui"

# 6. Copy Icons and Desktop Shortcut
cp "$ROOT_DIR/apps/gui/public/app-icon.png" "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/downnux.png"
cp "$ROOT_DIR/apps/gui/public/app-icon.png" "$BUILD_DIR/usr/share/pixmaps/downnux.png"

cat > "$BUILD_DIR/usr/share/applications/downnux-manager.desktop" <<EOF
[Desktop Entry]
Name=DownNux Manager
GenericName=Download Manager
Comment=High performance segmented download manager
Exec=/usr/bin/downnux-gui %U
Icon=downnux
Terminal=false
Type=Application
Categories=Network;FileTransfer;Utility;
Keywords=download;manager;idm;accelerator;
StartupWMClass=DownNux Manager
EOF
chmod 644 "$BUILD_DIR/usr/share/applications/downnux-manager.desktop"

# 7. Create DEBIAN/postinst
cat > "$BUILD_DIR/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e

# Update desktop and icon databases
if which update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
if which gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

echo "DownNux Manager successfully installed!"
echo "Launch from your Applications Menu or run: downnux-gui"
exit 0
EOF
chmod 755 "$BUILD_DIR/DEBIAN/postinst"

# 8. Package with dpkg-deb
echo "[*] Creating Debian package archive..."
dpkg-deb --build --root-owner-group "$BUILD_DIR" "$DIST_DIR/${PKG_NAME}.deb"

echo "[✓] Successfully built .deb package:"
ls -lh "$DIST_DIR/${PKG_NAME}.deb"

