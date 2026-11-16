// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tauri::Manager;

fn is_daemon_running() -> bool {
    if let Ok(addr) = "127.0.0.1:44990".parse::<SocketAddr>() {
        TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
    } else {
        false
    }
}

#[cfg(windows)]
fn strip_unc(p: PathBuf) -> PathBuf {
    let converted = p.to_string_lossy();
    if let Some(stripped) = converted.strip_prefix(r"\\?\UNC\") {
        PathBuf::from(format!(r"\\{}", stripped))
    } else if let Some(stripped) = converted.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        drop(converted);
        p
    }
}

#[cfg(not(windows))]
fn strip_unc(p: PathBuf) -> PathBuf {
    p
}

fn get_boot_log_path() -> PathBuf {
    #[cfg(windows)]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            return PathBuf::from(local_app_data)
                .join("downnux")
                .join("state")
                .join("logs")
                .join("daemon-boot.log");
        }
    }
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home)
                .join("Library")
                .join("Logs")
                .join("DownNux")
                .join("daemon-boot.log");
        }
    }
    std::env::temp_dir().join("downnux-daemon-boot.log")
}

fn write_boot_log(log_path: &Path, msg: &str) {
    eprintln!("{}", msg);
    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(file, "{}", msg);
    }
}

fn start_daemon_if_needed(app: &tauri::AppHandle) {
    let log_path = get_boot_log_path();
    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    // Start fresh boot log for this launch
    let _ = fs::write(&log_path, "");

    if is_daemon_running() {
        write_boot_log(&log_path, "[DownNux] Daemon is already running on 127.0.0.1:44990");
        return;
    }

    let mut candidate_dirs: Vec<PathBuf> = Vec::new();

    if let Ok(exe_path) = std::env::current_exe() {
        let clean_exe = strip_unc(exe_path);
        if let Some(parent) = clean_exe.parent() {
            candidate_dirs.push(parent.to_path_buf());
            candidate_dirs.push(parent.join("resources"));
        }
    }
    if let Ok(res_dir) = app.path().resource_dir() {
        let clean_res = strip_unc(res_dir);
        candidate_dirs.push(clean_res.clone());
        candidate_dirs.push(clean_res.join("resources"));
    }
    candidate_dirs.push(PathBuf::from("."));

    let mut daemon_js: Option<PathBuf> = None;
    let mut node_bin: Option<PathBuf> = None;
    let mut bin_dir: Option<PathBuf> = None;

    let node_name = if cfg!(windows) { "node.exe" } else { "node" };

    for dir in &candidate_dirs {
        let script = dir.join("engine").join("daemon.mjs");
        if script.exists() && daemon_js.is_none() {
            daemon_js = Some(strip_unc(script));
        }
        let node_path = dir.join("bin").join(node_name);
        if node_path.exists() && node_bin.is_none() {
            node_bin = Some(strip_unc(node_path));
        }
        let b_dir = dir.join("bin");
        if b_dir.exists() && bin_dir.is_none() {
            bin_dir = Some(strip_unc(b_dir));
        }
    }

    if let Some(daemon_script) = daemon_js {
        let node_exec = node_bin.unwrap_or_else(|| PathBuf::from(node_name));
        write_boot_log(
            &log_path,
            &format!(
                "[DownNux] Spawning daemon: node={:?} script={:?} bin_dir={:?}",
                node_exec, daemon_script, bin_dir
            ),
        );

        let mut cmd = std::process::Command::new(&node_exec);
        cmd.arg("--no-warnings").arg(&daemon_script);

        if let Some(app_root) = daemon_script.parent().and_then(|p| p.parent()) {
            cmd.current_dir(app_root);
        }

        if let Some(ref b) = bin_dir {
            cmd.env("DOWNNUX_BIN_DIR", b);
            let mut paths: Vec<PathBuf> = vec![b.clone()];
            if let Some(current_path) = std::env::var_os("PATH") {
                paths.extend(std::env::split_paths(&current_path));
            }
            if let Ok(joined) = std::env::join_paths(paths) {
                cmd.env("PATH", joined);
            }
        }

        cmd.stdin(Stdio::null());
        if let Ok(stdout_file) = OpenOptions::new().create(true).append(true).open(&log_path) {
            if let Ok(stderr_file) = stdout_file.try_clone() {
                cmd.stdout(Stdio::from(stdout_file));
                cmd.stderr(Stdio::from(stderr_file));
            }
        }

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        match cmd.spawn() {
            Ok(child) => {
                write_boot_log(
                    &log_path,
                    &format!("[DownNux] Daemon spawned cleanly with PID {}", child.id()),
                );
            }
            Err(e) => {
                write_boot_log(
                    &log_path,
                    &format!("[DownNux] ERROR spawning daemon: {}", e),
                );
            }
        }
    } else {
        write_boot_log(
            &log_path,
            &format!(
                "[DownNux] daemon.mjs not found in candidates: {:?}",
                candidate_dirs
            ),
        );
    }
}

#[tauri::command]
async fn open_inspector_window(app: tauri::AppHandle, task_id: String) -> Result<(), String> {
    let sanitized_id: String = task_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if sanitized_id.is_empty() {
        return Err("Invalid task id".to_string());
    }
    let label = format!("inspect-{}", sanitized_id);
    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.show();
        let _ = existing.unminimize();
        let _ = existing.set_focus();
        return Ok(());
    }
    let url = format!("index.html?inspect={}&standalone=true", sanitized_id);
    let init_script = format!(
        "window.__DOWNNUX_INSPECT_ID__ = {};",
        serde_json::to_string(&sanitized_id).map_err(|e| e.to_string())?
    );
    tauri::async_runtime::spawn_blocking(move || {
        tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App(PathBuf::from(url)))
            .title("DownNux Download Progress")
            .inner_size(720.0, 620.0)
            .min_inner_size(540.0, 460.0)
            .resizable(true)
            .decorations(true)
            .transparent(false)
            .center()
            .focused(true)
            .initialization_script(&init_script)
            .build()
            .map(|_| ())
            .map_err(|e| format!("Failed to create inspector window: {}", e))
    })
    .await
    .map_err(|e| format!("Inspector task join error: {}", e))?
}

#[tauri::command]
async fn close_current_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_inspector_window,
            close_current_window
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                start_daemon_if_needed(&handle);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running DownNux application");
}
