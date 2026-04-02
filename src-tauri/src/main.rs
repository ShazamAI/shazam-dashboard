#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

struct DaemonState {
    process: Mutex<Option<Child>>,
}

fn is_port_open(port: u16) -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        Duration::from_secs(2),
    )
    .is_ok()
}

#[tauri::command]
fn check_daemon_health(port: u16) -> bool {
    is_port_open(port)
}

#[tauri::command]
fn start_daemon(state: State<'_, DaemonState>, port: u16) -> Result<String, String> {
    // Check if already running
    if is_port_open(port) {
        return Ok("already_running".to_string());
    }

    // Try to find the daemon binary or elixir
    let daemon_path = find_daemon_binary();

    let mut cmd = if let Some(binary_path) = daemon_path {
        let mut c = Command::new(binary_path);
        c.env("SHAZAM_DAEMON", "true")
            .env("SHAZAM_PORT", port.to_string());
        c
    } else {
        // Fallback: try elixir + mix
        let shazam_core_path = find_shazam_core();
        if shazam_core_path.is_none() {
            return Err("Could not find shazam-daemon binary or shazam-core project".to_string());
        }
        let mut c = Command::new("elixir");
        c.args(["-S", "mix", "run", "--no-halt"])
            .current_dir(shazam_core_path.unwrap())
            .env("SHAZAM_DAEMON", "true")
            .env("SHAZAM_PORT", port.to_string());
        c
    };

    // Start in background
    match cmd.spawn() {
        Ok(child) => {
            let pid = child.id();
            *state.process.lock().unwrap() = Some(child);

            // Wait for health check (max 15 seconds)
            for _ in 0..30 {
                std::thread::sleep(Duration::from_millis(500));
                if is_port_open(port) {
                    return Ok(format!("started:{}", pid));
                }
            }

            Ok("started_no_health".to_string())
        }
        Err(e) => Err(format!("Failed to start daemon: {}", e)),
    }
}

#[tauri::command]
fn stop_daemon(state: State<'_, DaemonState>) -> Result<String, String> {
    let mut guard = state.process.lock().unwrap();
    if let Some(ref mut child) = *guard {
        let _ = child.kill();
        let _ = child.wait();
        *guard = None;
        Ok("stopped".to_string())
    } else {
        Ok("not_running".to_string())
    }
}

fn find_daemon_binary() -> Option<String> {
    let locations: Vec<Option<String>> = vec![
        // In the app bundle
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("shazam-daemon").to_string_lossy().to_string())),
        // In common install locations
        Some(format!(
            "{}/.local/bin/shazam-daemon",
            std::env::var("HOME").unwrap_or_default()
        )),
        Some("/usr/local/bin/shazam-daemon".to_string()),
    ];

    for loc in locations.into_iter().flatten() {
        if std::path::Path::new(&loc).exists() {
            return Some(loc);
        }
    }
    None
}

fn find_shazam_core() -> Option<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let locations = vec![
        format!("{}/Projects/ShazamAI/shazam-core", home),
        format!("{}/shazam-core", home),
        format!("{}/.shazam/core", home),
    ];

    for loc in locations {
        if std::path::Path::new(&loc).join("mix.exs").exists() {
            return Some(loc);
        }
    }
    None
}

fn main() {
    tauri::Builder::default()
        .manage(DaemonState {
            process: Mutex::new(None),
        })
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_daemon_health,
            start_daemon,
            stop_daemon,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Shazam Dashboard");
}
