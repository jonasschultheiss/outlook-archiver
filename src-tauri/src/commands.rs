use serde::{Deserialize, Serialize};
use tauri::command;

// Data structures for IPC communication
#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingConfig {
    pub pst_file_path: String,
    pub emails_per_pdf: u32,
    pub base_file_name: String,
    pub output_directory: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingProgress {
    pub total_emails: usize,
    pub processed_emails: usize,
    pub current_pdf: u32,
    pub status: String,
    pub is_complete: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PstInfo {
    pub file_path: String,
    pub email_count: usize,
    pub is_valid: bool,
}

// Tauri commands for frontend-backend communication
#[command]
pub async fn validate_pst_file(file_path: String) -> Result<PstInfo, String> {
    // TODO: Implement PST file validation
    // This will be implemented in a later task
    Ok(PstInfo {
        file_path,
        email_count: 0,
        is_valid: false,
    })
}

#[command]
pub async fn start_processing(_config: ProcessingConfig) -> Result<(), String> {
    // TODO: Implement processing start
    // This will be implemented in a later task
    Ok(())
}

#[command]
pub async fn get_processing_progress() -> Result<ProcessingProgress, String> {
    // TODO: Implement progress tracking
    // This will be implemented in a later task
    Ok(ProcessingProgress {
        total_emails: 0,
        processed_emails: 0,
        current_pdf: 0,
        status: "Nicht gestartet".to_string(),
        is_complete: false,
        error: None,
    })
}

#[command]
pub async fn cancel_processing() -> Result<(), String> {
    // TODO: Implement processing cancellation
    // This will be implemented in a later task
    Ok(())
}