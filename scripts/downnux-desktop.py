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
        if not is_daemon_running():
            daemon_script = os.path.join(APP_DIR, "apps/daemon/dist/main.mjs")
            if os.path.exists(daemon_script):
                subprocess.Popen(["/usr/bin/node", daemon_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            elif os.path.exists("/usr/lib/downnux-manager/apps/daemon/dist/main.mjs"):
                subprocess.Popen(["/usr/bin/node", "/usr/lib/downnux-manager/apps/daemon/dist/main.mjs"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Start GUI server if not running
    try:
        urllib.request.urlopen("http://127.0.0.1:1420", timeout=1)
    except Exception:
        try:
            subprocess.run(["systemctl", "--user", "start", "downnux-gui"], check=False)
        except Exception:
            pass
        try:
            urllib.request.urlopen("http://127.0.0.1:1420", timeout=1)
        except Exception:
            gui_script = os.path.join(APP_DIR, "scripts/serve-gui.mjs")
            if os.path.exists(gui_script):
                subprocess.Popen(["/usr/bin/node", gui_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            elif os.path.exists("/usr/lib/downnux-manager/scripts/serve-gui.mjs"):
                subprocess.Popen(["/usr/bin/node", "/usr/lib/downnux-manager/scripts/serve-gui.mjs"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

class DownNuxNativeWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="DownNux Manager")
        self.set_default_size(1260, 780)
        self.set_position(Gtk.WindowPosition.CENTER)

        # Remove OS window titlebar so in-app design header becomes the native window titlebar
        self.set_decorated(False)
        self.set_resizable(True)

        # Set window icon
        if os.path.exists(ICON_PATH):
            self.set_icon_from_file(ICON_PATH)

        # Transparent RGBA visual for smooth rounded corners and depth
        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual:
            self.set_visual(visual)
        self.set_app_paintable(True)

        # WebKit settings
        settings = WebKit2.Settings()
        settings.set_enable_developer_extras(False)
        settings.set_enable_webgl(True)
        settings.set_enable_smooth_scrolling(True)
        settings.set_enable_write_console_messages_to_stdout(False)

        self.webview = WebKit2.WebView.new_with_settings(settings)

        # Register native window control bridge for minimize/maximize/close/drag
        ucm = self.webview.get_user_content_manager()
        ucm.register_script_message_handler("windowControl")
        ucm.connect("script-message-received::windowControl", self.on_window_control)
        
        # Transparent background for authentic iOS glassmorphism
        bg_color = Gdk.RGBA()
        bg_color.parse("rgba(247, 248, 250, 1.0)")
        self.webview.set_background_color(bg_color)

        self.add(self.webview)
        self.connect("destroy", Gtk.main_quit)

        # Wait until port 1420 responds, then load
        GLib.timeout_add(100, self.load_gui)

    def on_window_control(self, manager, js_result):
        try:
            val = js_result.get_js_value()
            msg = val.to_string() if val else ""
            if msg == "minimize":
                self.iconify()
            elif msg == "maximize":
                if self.is_maximized():
                    self.unmaximize()
                else:
                    self.maximize()
            elif msg == "close":
                self.close()
            elif msg == "drag":
                disp = Gdk.Display.get_default()
                seat = disp.get_default_seat()
                ptr = seat.get_pointer()
                screen, x, y = ptr.get_position()
                self.begin_move_drag(1, x, y, Gtk.get_current_event_time())
            elif msg.startswith("resize:"):
                edge_name = msg.split(":", 1)[1]
                edge_map = {
                    "right": Gdk.WindowEdge.EAST,
                    "left": Gdk.WindowEdge.WEST,
                    "bottom": Gdk.WindowEdge.SOUTH,
                    "bottom-right": Gdk.WindowEdge.SOUTH_EAST,
                    "bottom-left": Gdk.WindowEdge.SOUTH_WEST,
                    "top": Gdk.WindowEdge.NORTH,
                    "top-right": Gdk.WindowEdge.NORTH_EAST,
                    "top-left": Gdk.WindowEdge.NORTH_WEST,
                }
                edge = edge_map.get(edge_name, Gdk.WindowEdge.SOUTH_EAST)
                disp = Gdk.Display.get_default()
                seat = disp.get_default_seat()
                ptr = seat.get_pointer()
                screen, x, y = ptr.get_position()
                self.begin_resize_drag(edge, 1, x, y, Gtk.get_current_event_time())
        except Exception as e:
            sys.stderr.write(f"window control error: {e}\n")

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

