#!/usr/bin/env python3
# ==============================================================================
# DownNux Manager — Native Linux GTK3/WebKit Desktop Window
# HoodTech <https://github.com/Nuril09/DownNux-Manager>
# GNU General Public License v3.0
# ==============================================================================

import os
import sys
import time
import shutil
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
NODE_BIN = shutil.which("node") or "/usr/bin/node"

ICON_PATH = os.path.join(APP_DIR, "apps/gui/public/app-icon.png")
if not os.path.exists(ICON_PATH):
    for candidate in [
        "/app/share/icons/hicolor/512x512/apps/io.github.Nuril09.DownNuxManager.png",
        "/usr/share/icons/hicolor/512x512/apps/downnux.png",
        "/usr/share/pixmaps/downnux.png"
    ]:
        if os.path.exists(candidate):
            ICON_PATH = candidate
            break

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
            daemon_script = os.path.join(APP_DIR, "apps/daemon/dist/main-standalone.mjs")
            if not os.path.exists(daemon_script):
                daemon_script = os.path.join(APP_DIR, "apps/daemon/dist/main.mjs")
            if not os.path.exists(daemon_script):
                for candidate in [
                    "/app/lib/downnux-manager/apps/daemon/dist/main-standalone.mjs",
                    "/app/lib/downnux-manager/apps/daemon/dist/main.mjs",
                    "/usr/lib/downnux-manager/apps/daemon/dist/main-standalone.mjs",
                    "/usr/lib/downnux-manager/apps/daemon/dist/main.mjs"
                ]:
                    if os.path.exists(candidate):
                        daemon_script = candidate
                        break
            if os.path.exists(daemon_script):
                subprocess.Popen([NODE_BIN, daemon_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

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
            if not os.path.exists(gui_script):
                for candidate in [
                    "/app/lib/downnux-manager/scripts/serve-gui.mjs",
                    "/usr/lib/downnux-manager/scripts/serve-gui.mjs"
                ]:
                    if os.path.exists(candidate):
                        gui_script = candidate
                        break
            if os.path.exists(gui_script):
                subprocess.Popen([NODE_BIN, gui_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

class StandaloneInspectorWindow(Gtk.Window):
    def __init__(self, task_id):
        super().__init__(title="DownNux Download Progress")
        self.set_default_size(720, 620)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_decorated(False)
        self.set_resizable(True)

        if os.path.exists(ICON_PATH):
            self.set_icon_from_file(ICON_PATH)

        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual:
            self.set_visual(visual)
        self.set_app_paintable(True)

        settings = WebKit2.Settings()
        settings.set_enable_developer_extras(False)
        settings.set_enable_webgl(True)
        settings.set_enable_smooth_scrolling(True)
        settings.set_enable_write_console_messages_to_stdout(False)

        self.webview = WebKit2.WebView.new_with_settings(settings)
        ucm = self.webview.get_user_content_manager()
        ucm.register_script_message_handler("windowControl")
        ucm.connect("script-message-received::windowControl", self.on_window_control)

        bg_color = Gdk.RGBA()
        bg_color.parse("rgba(0, 0, 0, 0.0)")
        self.webview.set_background_color(bg_color)

        self.add(self.webview)
        self.task_id = task_id
        GLib.timeout_add(100, self.load_gui)

    def on_window_control(self, manager, js_result):
        try:
            val = js_result.get_js_value()
            msg = val.to_string() if val else ""
            if msg == "close":
                self.destroy()
            elif msg == "minimize":
                self.iconify()
            elif msg == "maximize":
                if self.is_maximized():
                    self.unmaximize()
                else:
                    self.maximize()
            elif msg.startswith("openFolder:"):
                try:
                    target = msg.split(":", 1)[1]
                    if target and os.path.exists(target):
                        subprocess.Popen(["xdg-open", target])
                    else:
                        subprocess.Popen(["xdg-open", os.path.expanduser("~/Downloads")])
                except Exception as ex:
                    sys.stderr.write(f"Open folder error: {ex}\n")
            elif msg.startswith("openFile:"):
                try:
                    target = msg.split(":", 1)[1]
                    if target and os.path.exists(target):
                        subprocess.Popen(["xdg-open", target])
                except Exception as ex:
                    sys.stderr.write(f"Open file error: {ex}\n")
            elif msg == "drag":
                disp = Gdk.Display.get_default()
                seat = disp.get_default_seat()
                ptr = seat.get_pointer()
                screen, x, y = ptr.get_position()
                self.begin_move_drag(1, x, y, Gtk.get_current_event_time())
        except Exception as e:
            sys.stderr.write(f"inspector window control error: {e}\n")

    def load_gui(self):
        for _ in range(25):
            try:
                r = urllib.request.urlopen("http://127.0.0.1:1420", timeout=1)
                if r.getcode() == 200:
                    self.webview.load_uri(f"http://localhost:1420/?inspect={self.task_id}&standalone=true")
                    return False
            except Exception:
                time.sleep(0.2)
        self.webview.load_uri(f"http://localhost:1420/?inspect={self.task_id}&standalone=true")
        return False

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
        bg_color.parse("rgba(0, 0, 0, 0.0)")
        self.webview.set_background_color(bg_color)

        self.standalone_windows = []
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
            elif msg.startswith("openFolder:"):
                try:
                    target = msg.split(":", 1)[1]
                    if target and os.path.exists(target):
                        subprocess.Popen(["xdg-open", target])
                    else:
                        subprocess.Popen(["xdg-open", os.path.expanduser("~/Downloads")])
                except Exception as ex:
                    sys.stderr.write(f"Open folder error: {ex}\n")
            elif msg.startswith("openFile:"):
                try:
                    target = msg.split(":", 1)[1]
                    if target and os.path.exists(target):
                        subprocess.Popen(["xdg-open", target])
                except Exception as ex:
                    sys.stderr.write(f"Open file error: {ex}\n")
            elif msg.startswith("openDownloadWindow:"):
                try:
                    task_id = msg.split(":", 1)[1]
                    # Deduplicate: Check if a standalone window for this task_id is already open
                    existing_win = None
                    for w in list(self.standalone_windows):
                        if getattr(w, "task_id", None) == task_id:
                            existing_win = w
                            break
                    if existing_win:
                        existing_win.present()
                    else:
                        win = StandaloneInspectorWindow(task_id)
                        self.standalone_windows.append(win)
                        win.connect("destroy", lambda w: self.standalone_windows.remove(w) if w in self.standalone_windows else None)
                        win.show_all()
                        win.present()
                except Exception as ex:
                    sys.stderr.write(f"Open standalone download window error: {ex}\n")
            elif msg == "selectFolder":
                try:
                    import json
                    dialog = Gtk.FileChooserDialog(
                        title="Select Download Folder",
                        parent=self,
                        action=Gtk.FileChooserAction.SELECT_FOLDER
                    )
                    dialog.add_buttons(
                        Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
                        Gtk.STOCK_OPEN, Gtk.ResponseType.OK
                    )
                    dialog.set_default_response(Gtk.ResponseType.OK)
                    response = dialog.run()
                    selected_path = ""
                    if response == Gtk.ResponseType.OK:
                        selected_path = dialog.get_filename()
                    dialog.destroy()
                    if selected_path:
                        self.webview.evaluate_javascript(
                            f'window.__downnux_onFolderSelected && window.__downnux_onFolderSelected({json.dumps(selected_path)});',
                            -1, None, None, None, None, None
                        )
                except Exception as ex:
                    sys.stderr.write(f"Folder chooser error: {ex}\n")
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
    inspect_id = None
    for i, arg in enumerate(sys.argv[1:]):
        if arg.startswith("--inspect="):
            inspect_id = arg.split("=", 1)[1]
        elif arg == "--inspect" and i + 1 < len(sys.argv[1:]):
            inspect_id = sys.argv[1:][i + 1]

    if inspect_id:
        win = StandaloneInspectorWindow(inspect_id)
        win.connect("destroy", Gtk.main_quit)
        win.show_all()
        Gtk.main()
        return

    win = DownNuxNativeWindow()
    win.show_all()
    Gtk.main()

if __name__ == "__main__":
    main()

