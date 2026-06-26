#![deny(unsafe_code)]

mod claude;
mod commands;
mod db;
mod export;
mod license;
pub mod ocr;
mod tier;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::process_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
