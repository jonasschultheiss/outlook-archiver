use tauri::command;
use crate::types::{ProcessingConfig, ProcessingProgress, PstInfo};

// Tauri commands for frontend-backend communication
#[command]
pub async fn validate_pst_file(file_path: String) -> Result<PstInfo, String> {
    // TODO: Implement PST file validation
    // This will be implemented in a later task
    let mut pst_info = PstInfo::new(file_path);
    pst_info.mark_invalid(vec!["Not implemented yet".to_string()]);
    Ok(pst_info)
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
    Ok(ProcessingProgress::new())
}

#[command]
pub async fn cancel_processing() -> Result<(), String> {
    // TODO: Implement processing cancellation
    // This will be implemented in a later task
    Ok(())
}

#[command]
pub async fn select_directory(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    use std::path::PathBuf;
    
    let (tx, rx) = oneshot::channel();
    
    app_handle.dialog()
        .file()
        .set_title("Ausgabeverzeichnis auswählen")
        .pick_folder(move |folder_path| {
            let _ = tx.send(folder_path);
        });
    
    // Wait for the dialog result
    match rx.await {
        Ok(Some(file_path)) => {
            // Convert FilePath to PathBuf - try different conversion methods
            let path_str = match file_path {
                tauri_plugin_dialog::FilePath::Path(path_buf) => path_buf.to_string_lossy().to_string(),
                tauri_plugin_dialog::FilePath::Url(url) => {
                    // Convert URL to path if it's a file URL
                    url.to_file_path().map_err(|_| "Invalid file URL".to_string())?
                        .to_string_lossy().to_string()
                }
            };
            
            let path = PathBuf::from(&path_str);
            
            // Verify the directory is writable
            match std::fs::metadata(&path) {
                Ok(metadata) => {
                    if metadata.is_dir() {
                        // Try to create a test file to check write permissions
                        let test_path = path.join(".write_test");
                        match std::fs::write(&test_path, "test") {
                            Ok(_) => {
                                let _ = std::fs::remove_file(&test_path);
                                Ok(Some(path_str))
                            }
                            Err(_) => Err("Keine Schreibberechtigung für das ausgewählte Verzeichnis".to_string())
                        }
                    } else {
                        Err("Ausgewählter Pfad ist kein Verzeichnis".to_string())
                    }
                }
                Err(_) => Err("Verzeichnis nicht zugänglich".to_string())
            }
        }
        Ok(None) => Ok(None), // User cancelled
        Err(_) => Err("Fehler beim Öffnen des Verzeichnis-Dialogs".to_string()),
    }
}