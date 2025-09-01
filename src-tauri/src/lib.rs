// Module declarations
mod commands;
mod pst_processor;
mod pdf_generator;

// Re-export modules for external use
pub use commands::*;
pub use pst_processor::*;
pub use pdf_generator::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::validate_pst_file,
            commands::start_processing,
            commands::get_processing_progress,
            commands::cancel_processing
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
