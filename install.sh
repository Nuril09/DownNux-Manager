#!/usr/bin/env bash
# ==============================================================================
# DownNux Manager — Official Linux Installer
# Developed by CreativeMichiz <https://github.com/CreativeMichiz>
# Licensed under GNU General Public License v3.0
# ==============================================================================

set -euo pipefail

APP_NAME="DownNux Manager"
DEVELOPER="CreativeMichiz"
INSTALL_DIR="${DOWNNUX_DIR:-$HOME/.local/share/downnux}"
BIN_DIR="$HOME/.local/bin"

# Colors for terminal output
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}=== Welcome to ${APP_NAME} Installer ===${RESET}"
echo -e "Developed with pride by ${BOLD}${DEVELOPER}${RESET}\n"

# 1. Platform Detection
OS="$(uname -s)"
if [ "$OS" != "Linux" ]; then
  echo -e "${RED}[ERROR] DownNux Manager currently supports Linux systems only.${RESET}"
  exit 1
fi

echo -e "${GREEN}[✓] Platform check passed:${RESET} Linux ($(uname -m))"

# 2. Dependency Checking
check_cmd() {
  command -v "$1" >/dev/null 2>&1
}

echo -e "${BLUE}[*] Checking required system dependencies...${RESET}"

MISSING_PKGS=()
if ! check_cmd node; then MISSING_PKGS+=("nodejs"); fi
if ! check_cmd aria2c; then MISSING_PKGS+=("aria2"); fi
if ! check_cmd ffmpeg; then MISSING_PKGS+=("ffmpeg"); fi

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
  echo -e "${YELLOW}[!] The following recommended dependencies were not found: ${MISSING_PKGS[*]}${RESET}"
  if check_cmd apt-get; then
    echo -e "${YELLOW}    You can install them by running: sudo apt update && sudo apt install -y ${MISSING_PKGS[*]}${RESET}"
  fi
fi

# 3. Setup Directories
mkdir -p "$INSTALL_DIR" "$BIN_DIR"

# If running directly from git repository, trigger local dev install
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/scripts/install-dev.sh" ]; then
  echo -e "${BLUE}[*] Detected local project directory. Executing setup...${RESET}"
  bash "$SCRIPT_DIR/scripts/install-dev.sh"
  exit 0
fi

echo -e "${GREEN}[✓] Installation completed successfully!${RESET}"
echo -e "Run ${BOLD}downnux ping${RESET} or ${BOLD}downnux --help${RESET} to get started."
