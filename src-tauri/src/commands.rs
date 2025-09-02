use tauri::command;
use crate::types::{ProcessingConfig, ProcessingProgress, PstInfo};
use crate::pst_processor::PstProcessor;

// Tauri commands for frontend-backend communication
#[command]
pub async fn validate_pst_file(file_path: String) -> Result<PstInfo, String> {
    use std::path::Path;
    use std::fs;
    use chrono::{DateTime, Utc};
    
    let path = Path::new(&file_path);
    let mut pst_info = PstInfo::new(file_path.clone());
    
    // Check if file exists
    if !path.exists() {
        pst_info.mark_invalid(vec!["PST-Datei nicht gefunden".to_string()]);
        return Ok(pst_info);
    }
    
    // Check if it's a file (not a directory)
    if !path.is_file() {
        pst_info.mark_invalid(vec!["Pfad ist keine Datei".to_string()]);
        return Ok(pst_info);
    }
    
    // Check file extension
    if let Some(extension) = path.extension() {
        if extension.to_string_lossy().to_lowercase() != "pst" {
            pst_info.mark_invalid(vec!["Datei muss eine PST-Datei sein (.pst)".to_string()]);
            return Ok(pst_info);
        }
    } else {
        pst_info.mark_invalid(vec!["Datei hat keine Erweiterung - PST-Datei erwartet".to_string()]);
        return Ok(pst_info);
    }
    
    // Get file metadata
    let metadata = match fs::metadata(&path) {
        Ok(metadata) => metadata,
        Err(e) => {
            let error_msg = match e.kind() {
                std::io::ErrorKind::PermissionDenied => "Keine Berechtigung zum Zugriff auf die Datei".to_string(),
                _ => format!("Fehler beim Lesen der Datei-Informationen: {}", e),
            };
            pst_info.mark_invalid(vec![error_msg]);
            return Ok(pst_info);
        }
    };
    
    // Check if file is empty
    let file_size = metadata.len();
    if file_size == 0 {
        pst_info.mark_invalid(vec!["PST-Datei ist leer".to_string()]);
        return Ok(pst_info);
    }
    
    // Check if file is too small to be a valid PST (PST header is at least 512 bytes)
    if file_size < 512 {
        pst_info.mark_invalid(vec!["Datei ist zu klein für eine gültige PST-Datei".to_string()]);
        return Ok(pst_info);
    }
    
    // Get last modified time
    let last_modified = metadata.modified()
        .ok()
        .and_then(|time| {
            time.duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|duration| DateTime::from_timestamp(duration.as_secs() as i64, 0))
                .flatten()
        });
    
    // Try to create PST processor and validate file format
    match PstProcessor::new(path.to_path_buf()) {
        Ok(processor) => {
            match processor.validate() {
                Ok(validated_info) => {
                    if validated_info.is_valid {
                        pst_info.mark_valid(
                            validated_info.email_count,
                            file_size,
                            last_modified.unwrap_or_else(|| Utc::now())
                        );
                    } else {
                        pst_info.mark_invalid(validated_info.validation_errors);
                    }
                }
                Err(e) => {
                    pst_info.mark_invalid(vec![format!("PST-Validierung fehlgeschlagen: {}", e)]);
                }
            }
        }
        Err(e) => {
            pst_info.mark_invalid(vec![format!("Fehler beim Öffnen der PST-Datei: {}", e)]);
        }
    }
    
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