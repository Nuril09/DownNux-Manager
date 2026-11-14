// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::{SocketAddr, TcpStream};
use std::time::Duration;
use tauri::Manager;

fn is_daemon_running() -> bool {
    if let Ok(addr) = "127.0.0.1:44990".parse::<SocketAddr>() {
        TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
    } else {
        false
    }
}

fn start_daemon_if_needed(app: &tauri::AppHandle) {
    if is_daemon_running() {
        eprintln!("[DownNux] Daemon is already running on 127.0.0.1:44990");
        return;
    }

    let res_dir = app.path().resource_dir().ok();
    let current_exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));

    let candidate_dirs = [
        res_dir.as_ref().map(|p| p.as_path()),
        res_dir.as_ref().map(|p| p.join("resources")),
        current_exe_dir.as_ref().map(|p| p.as_path()),
        current_exe_dir.as_ref().map(|p| p.join("resources")),
        Some(std::path::Path::new(".")),
    ];

    let mut daemon_js: Option<std::path::PathBuf> = None;
    let mut node_bin: Option<std::path::PathBuf> = None;
    let mut bin_dir: Option<std::path::PathBuf> = None;

    let node_name = if cfg!(windows) { "node.exe" } else { "node" };

    for dir_opt in candidate_dirs.iter() {
        if let Some(dir) = dir_opt {
            let script = dir.join("engine").join("daemon.mjs");
            if script.exists() && daemon_js.is_none() {
                daemon_js = Some(script);
            }
            let node_path = dir.join("bin").join(node_name);
            if node_path.exists() && node_bin.is_none() {
                node_bin = Some(node_path);
            }
            let b_dir = dir.join("bin");
            if b_dir.exists() && bin_dir.is_none() {
                bin_dir = Some(b_dir);
            }
        }
    }

    if let Some(daemon_script) = daemon_js {
        let node_exec = node_bin.unwrap_or_else(|| std::path::PathBuf::from(node_name));
        eprintln!(
            "[DownNux] Starting background daemon via: {:?} {:?}",
            node_exec, daemon_script
        );

        let mut cmd = std::process::Command::new(&node_exec);
        cmd.arg(&daemon_script);

        if let Some(ref b) = bin_dir {
            cmd.env("DOWNNUX_BIN_DIR", b);
            if let Ok(current_path) = std::env::var("PATH") {
                let sep = if cfg!(windows) { ";" } else { ":" };
                cmd.env("PATH", format!("{}{}{}", b.display(), sep, current_path));
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
                eprintln!(
                    "[DownNux] Background daemon successfully launched with PID: {}",
                    child.id()
                );
            }
            Err(e) => {
                eprintln!("[DownNux] Failed to spawn background daemon: {}", e);
            }
        }
    } else {
        eprintln!("[DownNux] daemon.mjs not found in bundle resources. Assuming external daemon.");
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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
