// Module declarations
pub mod commands;
pub mod pst_processor;
pub mod pdf_generator;
pub mod errors;
pub mod types;
pub mod directory_validator;

// Re-export modules for external use
pub use commands::*;
pub use pst_processor::*;
pub use pdf_generator::*;
pub use errors::*;
pub use types::*;
pub use directory_validator::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::validate_pst_file,
            commands::start_processing,
            commands::get_processing_progress,
            commands::cancel_processing,
            commands::select_directory,
            commands::get_processing_session,
            commands::cleanup_session,
            commands::validate_directory,
            commands::get_directory_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
