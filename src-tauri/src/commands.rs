use tauri::command;
use crate::types::{ProcessingConfig, ProcessingProgress, PstInfo, ProcessingSession};
use crate::pst_processor::PstProcessor;
use crate::pdf_generator::PdfGenerator;
use crate::errors::{AppError, AppResult};
use crate::directory_validator::DirectoryValidator;
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use tokio::sync::oneshot;
use tokio::task;
use std::collections::HashMap;

// Global state for managing processing sessions
lazy_static::lazy_static! {
    static ref PROCESSING_SESSIONS: Arc<Mutex<HashMap<String, ProcessingSession>>> = 
        Arc::new(Mutex::new(HashMap::new()));
    static ref CURRENT_SESSION_ID: Arc<Mutex<Option<String>>> = 
        Arc::new(Mutex::new(None));
    static ref CANCELLATION_TOKENS: Arc<Mutex<HashMap<String, oneshot::Sender<()>>>> = 
        Arc::new(Mutex::new(HashMap::new()));
}

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
pub async fn start_processing(config: ProcessingConfig) -> Result<String, String> {
    // Validate configuration first
    if let Err(e) = config.validate() {
        return Err(format!("Konfigurationsfehler: {}", e));
    }

    // Check if there's already a processing session running
    {
        let current_session = CURRENT_SESSION_ID.lock().unwrap();
        if current_session.is_some() {
            return Err("Eine Verarbeitung läuft bereits. Bitte warten Sie, bis sie abgeschlossen ist oder brechen Sie sie ab.".to_string());
        }
    }

    // Create new processing session
    let mut session = ProcessingSession::new(config.clone());
    let session_id = session.session_id.clone();

    // Validate PST file exists and is readable
    let pst_path = PathBuf::from(&config.pst_file_path);
    let processor = match PstProcessor::new(pst_path) {
        Ok(processor) => processor,
        Err(e) => return Err(format!("PST-Datei konnte nicht geöffnet werden: {}", e)),
    };

    // Get total email count for progress tracking
    let total_emails = match processor.get_email_count() {
        Ok(count) => count,
        Err(e) => return Err(format!("Fehler beim Zählen der E-Mails: {}", e)),
    };

    if total_emails == 0 {
        return Err("Die PST-Datei enthält keine E-Mails zum Verarbeiten.".to_string());
    }

    // Validate output directory using DirectoryValidator
    let validated_output_dir = match DirectoryValidator::validate_directory_path(&config.output_directory) {
        Ok(path) => path,
        Err(e) => return Err(format!("Ausgabeverzeichnis ungültig: {}", e)),
    };
    
    // Check available space (estimate 10MB per PDF)
    let estimated_space_needed = (total_emails / config.emails_per_pdf as usize + 1) * 10 * 1024 * 1024;
    if let Err(e) = DirectoryValidator::check_available_space(&validated_output_dir, estimated_space_needed as u64) {
        return Err(format!("Speicherplatz-Problem: {}", e));
    }
    
    let pdf_generator = match PdfGenerator::new(validated_output_dir, config.base_file_name.clone()) {
        Ok(generator) => generator,
        Err(e) => return Err(format!("PDF-Generator konnte nicht initialisiert werden: {}", e)),
    };

    // Initialize progress tracking
    session.progress.start(total_emails);

    // Store session in global state
    {
        let mut sessions = PROCESSING_SESSIONS.lock().unwrap();
        sessions.insert(session_id.clone(), session);
        
        let mut current_session = CURRENT_SESSION_ID.lock().unwrap();
        *current_session = Some(session_id.clone());
    }

    // Create cancellation token
    let (cancel_tx, cancel_rx) = oneshot::channel::<()>();
    {
        let mut tokens = CANCELLATION_TOKENS.lock().unwrap();
        tokens.insert(session_id.clone(), cancel_tx);
    }

    // Start processing in background task
    let session_id_clone = session_id.clone();
    task::spawn(async move {
        let result = process_emails_background(
            session_id_clone.clone(),
            processor,
            pdf_generator,
            config,
            total_emails,
            cancel_rx,
        ).await;

        // Update session with final result
        {
            let mut sessions = PROCESSING_SESSIONS.lock().unwrap();
            if let Some(session) = sessions.get_mut(&session_id_clone) {
                match result {
                    Ok(_) => {
                        session.progress.complete();
                    }
                    Err(e) => {
                        session.progress.fail(e.to_string());
                    }
                }
            }
        }

        // Clear current session
        {
            let mut current_session = CURRENT_SESSION_ID.lock().unwrap();
            *current_session = None;
        }

        // Remove cancellation token
        {
            let mut tokens = CANCELLATION_TOKENS.lock().unwrap();
            tokens.remove(&session_id_clone);
        }
    });

    Ok(session_id)
}

#[command]
pub async fn get_processing_progress() -> Result<ProcessingProgress, String> {
    let current_session_id = {
        let current_session = CURRENT_SESSION_ID.lock().unwrap();
        current_session.clone()
    };

    match current_session_id {
        Some(session_id) => {
            let sessions = PROCESSING_SESSIONS.lock().unwrap();
            match sessions.get(&session_id) {
                Some(session) => Ok(session.progress.clone()),
                None => {
                    // Session not found, return default progress
                    Ok(ProcessingProgress::new())
                }
            }
        }
        None => {
            // No active session
            Ok(ProcessingProgress::new())
        }
    }
}

#[command]
pub async fn cancel_processing() -> Result<(), String> {
    let current_session_id = {
        let current_session = CURRENT_SESSION_ID.lock().unwrap();
        current_session.clone()
    };

    match current_session_id {
        Some(session_id) => {
            // Send cancellation signal
            {
                let mut tokens = CANCELLATION_TOKENS.lock().unwrap();
                if let Some(cancel_tx) = tokens.remove(&session_id) {
                    let _ = cancel_tx.send(()); // Send cancellation signal
                }
            }

            // Update session progress to cancelled
            {
                let mut sessions = PROCESSING_SESSIONS.lock().unwrap();
                if let Some(session) = sessions.get_mut(&session_id) {
                    session.progress.cancel();
                }
            }

            // Clear current session
            {
                let mut current_session = CURRENT_SESSION_ID.lock().unwrap();
                *current_session = None;
            }

            Ok(())
        }
        None => {
            Err("Keine aktive Verarbeitung zum Abbrechen gefunden.".to_string())
        }
    }
}

#[command]
pub async fn select_directory(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    
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
                    url.to_file_path().map_err(|_| "Ungültige Datei-URL".to_string())?
                        .to_string_lossy().to_string()
                }
            };
            
            // Use DirectoryValidator for comprehensive validation
            match DirectoryValidator::validate_directory_path(&path_str) {
                Ok(validated_path) => {
                    // Additional check for available space (estimate 100MB needed)
                    if let Err(e) = DirectoryValidator::check_available_space(&validated_path, 100 * 1024 * 1024) {
                        return Err(format!("Speicherplatz-Warnung: {}", e));
                    }
                    
                    Ok(Some(validated_path.to_string_lossy().to_string()))
                }
                Err(e) => Err(e.to_string())
            }
        }
        Ok(None) => Ok(None), // User cancelled
        Err(_) => Err("Fehler beim Öffnen des Verzeichnis-Dialogs".to_string()),
    }
}

/// Background processing function that handles the actual email processing
async fn process_emails_background(
    session_id: String,
    processor: PstProcessor,
    pdf_generator: PdfGenerator,
    config: ProcessingConfig,
    total_emails: usize,
    mut cancel_rx: oneshot::Receiver<()>,
) -> AppResult<()> {
    let emails_per_pdf = config.emails_per_pdf as usize;
    let mut processed_emails = 0;
    let mut current_pdf = 1;

    // Extract all emails in chronological order
    let all_emails = processor.get_all_emails_chronological()
        .map_err(|e| AppError::PstError(e.to_string()))?;

    // Process emails in chunks
    for chunk in all_emails.chunks(emails_per_pdf) {
        // Check for cancellation
        if cancel_rx.try_recv().is_ok() {
            return Err(AppError::ProcessingCancelled);
        }

        // Update progress before processing this chunk
        update_session_progress(
            &session_id,
            processed_emails,
            current_pdf,
            format!("Erstelle PDF {} von {}", current_pdf, calculate_total_pdfs(total_emails, emails_per_pdf)),
        );

        // Generate PDF for this chunk
        let pdf_path = pdf_generator.generate_pdf(chunk.to_vec(), current_pdf)
            .map_err(|e| AppError::PdfError(e.to_string()))?;

        // Add generated file to session
        {
            let mut sessions = PROCESSING_SESSIONS.lock().unwrap();
            if let Some(session) = sessions.get_mut(&session_id) {
                session.add_generated_file(pdf_path.to_string_lossy().to_string());
            }
        }

        processed_emails += chunk.len();
        current_pdf += 1;

        // Update progress after completing this chunk
        update_session_progress(
            &session_id,
            processed_emails,
            current_pdf - 1,
            if processed_emails >= total_emails {
                "Verarbeitung abgeschlossen".to_string()
            } else {
                format!("PDF {} erstellt, verarbeite weiter...", current_pdf - 1)
            },
        );

        // Small delay to allow for cancellation checks and UI updates
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    Ok(())
}

/// Update the progress of a processing session
fn update_session_progress(session_id: &str, processed_emails: usize, current_pdf: u32, status: String) {
    let mut sessions = PROCESSING_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get_mut(session_id) {
        session.progress.update_progress(processed_emails, current_pdf, status);
    }
}

/// Calculate the total number of PDFs that will be generated
fn calculate_total_pdfs(total_emails: usize, emails_per_pdf: usize) -> u32 {
    ((total_emails + emails_per_pdf - 1) / emails_per_pdf) as u32
}

/// Get the current processing session information
#[command]
pub async fn get_processing_session() -> Result<Option<ProcessingSession>, String> {
    let current_session_id = {
        let current_session = CURRENT_SESSION_ID.lock().unwrap();
        current_session.clone()
    };

    match current_session_id {
        Some(session_id) => {
            let sessions = PROCESSING_SESSIONS.lock().unwrap();
            Ok(sessions.get(&session_id).cloned())
        }
        None => Ok(None),
    }
}

/// Clean up completed or cancelled sessions
#[command]
pub async fn cleanup_session(session_id: String) -> Result<(), String> {
    let mut sessions = PROCESSING_SESSIONS.lock().unwrap();
    sessions.remove(&session_id);
    
    let mut tokens = CANCELLATION_TOKENS.lock().unwrap();
    tokens.remove(&session_id);
    
    Ok(())
}

/// Validate a directory path for write permissions and accessibility
#[command]
pub async fn validate_directory(directory_path: String) -> Result<bool, String> {
    match DirectoryValidator::validate_directory_path(&directory_path) {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string())
    }
}

/// Get detailed directory information including available space
#[command]
pub async fn get_directory_info(directory_path: String) -> Result<DirectoryInfo, String> {
    use std::fs;
    
    let validated_path = DirectoryValidator::validate_directory_path(&directory_path)
        .map_err(|e| e.to_string())?;
    
    let metadata = fs::metadata(&validated_path)
        .map_err(|e| format!("Fehler beim Lesen der Verzeichnis-Informationen: {}", e))?;
    
    let available_space = DirectoryValidator::get_available_space(&validated_path)
        .unwrap_or(0);
    
    Ok(DirectoryInfo {
        path: validated_path.to_string_lossy().to_string(),
        is_writable: true, // Already validated by validate_directory_path
        available_space_bytes: available_space,
        available_space_mb: available_space / 1024 / 1024,
        last_modified: metadata.modified()
            .ok()
            .and_then(|time| {
                time.duration_since(std::time::UNIX_EPOCH)
                    .ok()
                    .map(|duration| chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0))
                    .flatten()
            }),
    })
}

/// Directory information structure
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DirectoryInfo {
    pub path: String,
    pub is_writable: bool,
    pub available_space_bytes: u64,
    pub available_space_mb: u64,
    pub last_modified: Option<chrono::DateTime<chrono::Utc>>,
}