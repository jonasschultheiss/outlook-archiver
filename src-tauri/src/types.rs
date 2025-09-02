use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Configuration for email processing operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProcessingConfig {
    /// Path to the PST file to process
    pub pst_file_path: String,
    
    /// Number of emails to include in each PDF (1-25)
    pub emails_per_pdf: u32,
    
    /// Base name for generated PDF files
    pub base_file_name: String,
    
    /// Directory where PDF files will be saved
    pub output_directory: String,
}

impl ProcessingConfig {
    /// Create a new processing configuration
    pub fn new(
        pst_file_path: String,
        emails_per_pdf: u32,
        base_file_name: String,
        output_directory: String,
    ) -> Self {
        Self {
            pst_file_path,
            emails_per_pdf,
            base_file_name,
            output_directory,
        }
    }

    /// Validate the configuration parameters
    pub fn validate(&self) -> Result<(), crate::errors::ValidationError> {
        use crate::errors::ValidationError;

        // Validate PST file path
        if self.pst_file_path.is_empty() {
            return Err(ValidationError::RequiredFieldMissing("pst_file_path".to_string()));
        }

        if !self.pst_file_path.to_lowercase().ends_with(".pst") {
            return Err(ValidationError::InvalidFileExtension {
                expected: ".pst".to_string(),
                actual: PathBuf::from(&self.pst_file_path)
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or("none")
                    .to_string(),
            });
        }

        // Validate emails per PDF count
        if self.emails_per_pdf < 1 || self.emails_per_pdf > 25 {
            return Err(ValidationError::InvalidEmailCount {
                min: 1,
                max: 25,
                actual: self.emails_per_pdf,
            });
        }

        // Validate base filename
        if self.base_file_name.is_empty() {
            return Err(ValidationError::RequiredFieldMissing("base_file_name".to_string()));
        }

        // Check for invalid filename characters
        let invalid_chars = ['<', '>', ':', '"', '|', '?', '*', '/', '\\'];
        for ch in self.base_file_name.chars() {
            if invalid_chars.contains(&ch) {
                return Err(ValidationError::InvalidCharacter {
                    field: "base_file_name".to_string(),
                    character: ch.to_string(),
                });
            }
        }

        // Validate output directory using DirectoryValidator
        if self.output_directory.is_empty() {
            return Err(ValidationError::RequiredFieldMissing("output_directory".to_string()));
        }
        
        // Use DirectoryValidator for comprehensive directory validation
        if let Err(e) = crate::directory_validator::DirectoryValidator::validate_directory_path(&self.output_directory) {
            return Err(e);
        }

        Ok(())
    }
}

/// Progress tracking for email processing operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProcessingProgress {
    /// Total number of emails to process
    pub total_emails: usize,
    
    /// Number of emails processed so far
    pub processed_emails: usize,
    
    /// Current PDF being generated (1-based)
    pub current_pdf: u32,
    
    /// Current status message (in German)
    pub status: String,
    
    /// Whether processing is complete
    pub is_complete: bool,
    
    /// Error message if processing failed
    pub error: Option<String>,
    
    /// Processing start time
    pub started_at: Option<DateTime<Utc>>,
    
    /// Processing completion time
    pub completed_at: Option<DateTime<Utc>>,
    
    /// Whether processing was cancelled
    pub is_cancelled: bool,
}

impl ProcessingProgress {
    /// Create a new progress tracker
    pub fn new() -> Self {
        Self {
            total_emails: 0,
            processed_emails: 0,
            current_pdf: 0,
            status: "Nicht gestartet".to_string(),
            is_complete: false,
            error: None,
            started_at: None,
            completed_at: None,
            is_cancelled: false,
        }
    }

    /// Initialize progress with total email count
    pub fn start(&mut self, total_emails: usize) {
        self.total_emails = total_emails;
        self.processed_emails = 0;
        self.current_pdf = 1;
        self.status = "Verarbeitung gestartet".to_string();
        self.is_complete = false;
        self.error = None;
        self.started_at = Some(Utc::now());
        self.completed_at = None;
        self.is_cancelled = false;
    }

    /// Update progress with processed email count
    pub fn update_progress(&mut self, processed_emails: usize, current_pdf: u32, status: String) {
        self.processed_emails = processed_emails;
        self.current_pdf = current_pdf;
        self.status = status;
    }

    /// Mark processing as complete
    pub fn complete(&mut self) {
        self.is_complete = true;
        self.status = "Verarbeitung abgeschlossen".to_string();
        self.completed_at = Some(Utc::now());
    }

    /// Mark processing as failed with error
    pub fn fail(&mut self, error: String) {
        self.is_complete = true;
        self.error = Some(error);
        self.status = "Verarbeitung fehlgeschlagen".to_string();
        self.completed_at = Some(Utc::now());
    }

    /// Mark processing as cancelled
    pub fn cancel(&mut self) {
        self.is_cancelled = true;
        self.is_complete = true;
        self.status = "Verarbeitung abgebrochen".to_string();
        self.completed_at = Some(Utc::now());
    }

    /// Calculate progress percentage (0-100)
    pub fn percentage(&self) -> f64 {
        if self.total_emails == 0 {
            0.0
        } else {
            (self.processed_emails as f64 / self.total_emails as f64) * 100.0
        }
    }

    /// Get processing duration if started
    pub fn duration(&self) -> Option<chrono::Duration> {
        match (self.started_at, self.completed_at.or_else(|| Some(Utc::now()))) {
            (Some(start), Some(end)) => Some(end - start),
            _ => None,
        }
    }
}

impl Default for ProcessingProgress {
    fn default() -> Self {
        Self::new()
    }
}

/// Information about a PST file
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PstInfo {
    /// Path to the PST file
    pub file_path: String,
    
    /// Total number of emails in the PST file
    pub email_count: usize,
    
    /// Whether the PST file is valid and readable
    pub is_valid: bool,
    
    /// File size in bytes
    pub file_size: u64,
    
    /// Last modified timestamp
    pub last_modified: Option<DateTime<Utc>>,
    
    /// Any validation errors encountered
    pub validation_errors: Vec<String>,
}

impl PstInfo {
    /// Create a new PST info structure
    pub fn new(file_path: String) -> Self {
        Self {
            file_path,
            email_count: 0,
            is_valid: false,
            file_size: 0,
            last_modified: None,
            validation_errors: Vec::new(),
        }
    }

    /// Mark as valid with email count
    pub fn mark_valid(&mut self, email_count: usize, file_size: u64, last_modified: DateTime<Utc>) {
        self.is_valid = true;
        self.email_count = email_count;
        self.file_size = file_size;
        self.last_modified = Some(last_modified);
        self.validation_errors.clear();
    }

    /// Mark as invalid with error messages
    pub fn mark_invalid(&mut self, errors: Vec<String>) {
        self.is_valid = false;
        self.email_count = 0;
        self.validation_errors = errors;
    }

    /// Add a validation error
    pub fn add_error(&mut self, error: String) {
        self.validation_errors.push(error);
        self.is_valid = false;
    }
}

/// Email data structure representing a single email
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Email {
    /// Email subject line
    pub subject: String,
    
    /// Sender email address and name
    pub sender: String,
    
    /// Primary recipient email address and name
    pub recipient: String,
    
    /// Additional recipients (CC)
    pub cc_recipients: Vec<String>,
    
    /// Hidden recipients (BCC)
    pub bcc_recipients: Vec<String>,
    
    /// Email timestamp
    pub date: DateTime<Utc>,
    
    /// Email body content (HTML or plain text)
    pub body: String,
    
    /// Whether the body is HTML formatted
    pub is_html: bool,
    
    /// Email attachments
    pub attachments: Vec<Attachment>,
    
    /// Email priority/importance
    pub priority: EmailPriority,
    
    /// Message ID for tracking
    pub message_id: Option<String>,
    
    /// In-reply-to message ID
    pub in_reply_to: Option<String>,
    
    /// Email size in bytes
    pub size: usize,
}

impl Email {
    /// Create a new email structure
    pub fn new(
        subject: String,
        sender: String,
        recipient: String,
        date: DateTime<Utc>,
        body: String,
    ) -> Self {
        Self {
            subject,
            sender,
            recipient,
            cc_recipients: Vec::new(),
            bcc_recipients: Vec::new(),
            date,
            body,
            is_html: false,
            attachments: Vec::new(),
            priority: EmailPriority::Normal,
            message_id: None,
            in_reply_to: None,
            size: 0,
        }
    }

    /// Check if email has attachments
    pub fn has_attachments(&self) -> bool {
        !self.attachments.is_empty()
    }

    /// Get total attachment size
    pub fn attachment_size(&self) -> usize {
        self.attachments.iter().map(|a| a.size).sum()
    }

    /// Get formatted date string for display
    pub fn formatted_date(&self) -> String {
        self.date.format("%d.%m.%Y %H:%M:%S").to_string()
    }
}

/// Email attachment information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Attachment {
    /// Attachment filename
    pub name: String,
    
    /// Attachment size in bytes
    pub size: usize,
    
    /// MIME content type
    pub content_type: String,
    
    /// Whether attachment is inline (embedded in email body)
    pub is_inline: bool,
    
    /// Content ID for inline attachments
    pub content_id: Option<String>,
    
    /// Attachment data (base64 encoded for serialization)
    pub data: Option<String>,
}

impl Attachment {
    /// Create a new attachment
    pub fn new(name: String, size: usize, content_type: String) -> Self {
        Self {
            name,
            size,
            content_type,
            is_inline: false,
            content_id: None,
            data: None,
        }
    }

    /// Check if attachment is an image
    pub fn is_image(&self) -> bool {
        self.content_type.starts_with("image/")
    }

    /// Get file extension from filename
    pub fn extension(&self) -> Option<&str> {
        std::path::Path::new(&self.name)
            .extension()
            .and_then(|ext| ext.to_str())
    }
}

/// Email priority levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EmailPriority {
    Low,
    Normal,
    High,
    Urgent,
}

impl Default for EmailPriority {
    fn default() -> Self {
        EmailPriority::Normal
    }
}

/// Processing session information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProcessingSession {
    /// Unique session ID
    pub session_id: String,
    
    /// Session configuration
    pub config: ProcessingConfig,
    
    /// Session progress
    pub progress: ProcessingProgress,
    
    /// Generated PDF file paths
    pub generated_files: Vec<String>,
    
    /// Session creation time
    pub created_at: DateTime<Utc>,
}

impl ProcessingSession {
    /// Create a new processing session
    pub fn new(config: ProcessingConfig) -> Self {
        Self {
            session_id: uuid::Uuid::new_v4().to_string(),
            config,
            progress: ProcessingProgress::new(),
            generated_files: Vec::new(),
            created_at: Utc::now(),
        }
    }

    /// Add a generated file to the session
    pub fn add_generated_file(&mut self, file_path: String) {
        self.generated_files.push(file_path);
    }
}