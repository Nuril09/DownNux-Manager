#!/usr/bin/env python3
# ==============================================================================
# DownNux Manager — Native Linux GTK3/WebKit Desktop Window
# CreativeMichiz <https://github.com/CreativeMichiz>
# GNU General Public License v3.0
# ==============================================================================

import os
import sys
import time
import subprocess
import threading
import urllib.request

try:
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('WebKit2', '4.1')
    from gi.repository import Gtk, WebKit2, Gdk, GLib, Gio
except ValueError:
    try:
        import gi
        gi.require_version('Gtk', '3.0')
        gi.require_version('WebKit2', '4.0')
        from gi.repository import Gtk, WebKit2, Gdk, GLib, Gio
    except Exception as e:
        sys.stderr.write(f"Error loading GTK/WebKit2: {e}\n")
        sys.exit(1)

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_PATH = os.path.join(APP_DIR, "apps/gui/public/app-icon.png")
if not os.path.exists(ICON_PATH):
    ICON_PATH = "/usr/share/icons/hicolor/512x512/apps/downnux.png"

def is_daemon_running():
    try:
        req = urllib.request.urlopen("http://127.0.0.1:44990/api/sysinfo", timeout=1)
        return req.getcode() == 200
    except Exception:
        return False

def ensure_services():
    # 1. Start daemon if not running
    if not is_daemon_running():
        try:
            subprocess.run(["systemctl", "--user", "start", "downnux-daemon"], check=False)
        except Exception:
            pass
    # 2. Start GUI server if not running
    try:
        urllib.request.urlopen("http://127.0.0.1:1420", timeout=1)
    except Exception:
        try:
            subprocess.run(["systemctl", "--user", "start", "downnux-gui"], check=False)
        except Exception:
            pass

class DownNuxNativeWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="DownNux Manager")
        self.set_default_size(1260, 780)
        self.set_position(Gtk.WindowPosition.CENTER)

        # Set window icon
        if os.path.exists(ICON_PATH):
            self.set_icon_from_file(ICON_PATH)

        # WebKit settings
        settings = WebKit2.Settings()
        settings.set_enable_developer_extras(False)
        settings.set_enable_webgl(True)
        settings.set_enable_smooth_scrolling(True)
        settings.set_enable_write_console_messages_to_stdout(False)

        self.webview = WebKit2.WebView.new_with_settings(settings)
        
        # Transparent background for authentic iOS glassmorphism
        bg_color = Gdk.RGBA()
        bg_color.parse("rgba(240, 242, 246, 1.0)")
        self.webview.set_background_color(bg_color)

        self.add(self.webview)
        self.connect("destroy", Gtk.main_quit)

        # Wait until port 1420 responds, then load
        GLib.timeout_add(100, self.load_gui)

    def load_gui(self):
        for _ in range(25):
            try:
                r = urllib.request.urlopen("http://127.0.0.1:1420", timeout=1)
                if r.getcode() == 200:
                    self.webview.load_uri("http://localhost:1420")
                    return False
            except Exception:
                time.sleep(0.2)
        # Fallback direct load
        self.webview.load_uri("http://localhost:1420")
        return False

def main():
    ensure_services()
    win = DownNuxNativeWindow()
    win.show_all()
    Gtk.main()

if __name__ == "__main__":
    main()
