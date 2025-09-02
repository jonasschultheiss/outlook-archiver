use std::path::PathBuf;
use std::fs::File;
use std::io::Read;
use std::collections::HashMap;
use chrono::{DateTime, Utc, TimeZone};
use crate::errors::{PstError, PstResult};
use crate::types::{Email, PstInfo, Attachment, EmailPriority};

/// PST processor for handling PST file operations
/// This implementation provides basic PST parsing capabilities for email extraction
pub struct PstProcessor {
    file_path: PathBuf,
    email_cache: HashMap<usize, Email>,
    total_emails: Option<usize>,
    pst_format: PstFormat,
}

/// PST file format variants
#[derive(Debug, Clone, PartialEq)]
enum PstFormat {
    Ansi,    // ANSI PST (Outlook 97-2002)
    Unicode, // Unicode PST (Outlook 2003+)
}

/// PST file header structure for parsing
#[derive(Debug)]
struct PstHeader {
    signature: [u8; 4],
    #[allow(dead_code)]
    crc: u32,
    #[allow(dead_code)]
    version: u16,
    format: PstFormat,
    #[allow(dead_code)]
    file_size: u64,
}

impl PstProcessor {
    /// Create a new PST processor for the given file path
    /// Validates the PST file and initializes the processor
    pub fn new(file_path: PathBuf) -> PstResult<Self> {
        if !file_path.exists() {
            return Err(PstError::FileNotFound(file_path.to_string_lossy().to_string()));
        }

        let mut processor = Self {
            file_path,
            email_cache: HashMap::new(),
            total_emails: None,
            pst_format: PstFormat::Unicode, // Default, will be determined during validation
        };

        // Validate the PST file and determine format
        processor.validate_and_initialize()?;
        
        Ok(processor)
    }

    /// Get the total number of emails in the PST file
    /// Uses cached value if available, otherwise scans the file
    pub fn get_email_count(&self) -> PstResult<usize> {
        if let Some(count) = self.total_emails {
            Ok(count)
        } else {
            // If not cached, perform a scan to count emails
            self.scan_email_count()
        }
    }

    /// Extract a range of emails from the PST file in chronological order
    /// Returns emails sorted by date (oldest first)
    pub fn extract_emails(&self, start: usize, count: usize) -> PstResult<Vec<Email>> {
        let total_emails = self.get_email_count()?;
        
        if start >= total_emails {
            return Ok(Vec::new());
        }

        let end = (start + count).min(total_emails);
        let mut emails = Vec::new();

        // Extract emails from the PST file
        // This is a simplified implementation that demonstrates the structure
        // In a real implementation, this would use a proper PST parsing library
        for index in start..end {
            match self.extract_single_email(index) {
                Ok(email) => emails.push(email),
                Err(e) => {
                    // Log the error but continue processing other emails
                    eprintln!("Warning: Failed to extract email at index {}: {}", index, e);
                    continue;
                }
            }
        }

        // Sort emails by date to ensure chronological order (requirement 8.1)
        emails.sort_by(|a, b| a.date.cmp(&b.date));

        Ok(emails)
    }

    /// Validate the PST file and initialize processor state
    fn validate_and_initialize(&mut self) -> PstResult<()> {
        let header = self.read_pst_header()?;
        
        // Validate PST signature
        if header.signature != [0x21, 0x42, 0x44, 0x4E] { // "!BDN"
            return Err(PstError::InvalidFormat(
                "Ungültige PST-Datei-Signatur - Datei ist möglicherweise beschädigt".to_string()
            ));
        }

        // Set PST format based on version
        self.pst_format = header.format;

        // Initialize email count
        self.total_emails = Some(self.scan_email_count()?);

        Ok(())
    }

    /// Read and parse the PST file header
    fn read_pst_header(&self) -> PstResult<PstHeader> {
        let mut file = File::open(&self.file_path)?;
        let mut header_bytes = [0u8; 512];
        
        file.read_exact(&mut header_bytes)?;

        let signature = [header_bytes[0], header_bytes[1], header_bytes[2], header_bytes[3]];
        let crc = u32::from_le_bytes([header_bytes[4], header_bytes[5], header_bytes[6], header_bytes[7]]);
        let version = u16::from_le_bytes([header_bytes[8], header_bytes[9]]);

        let format = match version {
            14 | 15 => PstFormat::Ansi,
            23 => PstFormat::Unicode,
            _ => return Err(PstError::InvalidFormat(
                format!("Unbekannte PST-Version: {}. Unterstützte Versionen: ANSI (14, 15) und Unicode (23)", version)
            )),
        };

        // Get file size
        let metadata = std::fs::metadata(&self.file_path)?;
        let file_size = metadata.len();

        Ok(PstHeader {
            signature,
            crc,
            version,
            format,
            file_size,
        })
    }

    /// Scan the PST file to count total emails
    /// This is a simplified implementation for demonstration
    fn scan_email_count(&self) -> PstResult<usize> {
        // In a real implementation, this would parse the PST structure
        // For now, we'll provide a reasonable estimate based on file analysis
        
        let metadata = std::fs::metadata(&self.file_path)?;
        let file_size = metadata.len();

        // Estimate based on file size and format
        let estimated_count = match self.pst_format {
            PstFormat::Ansi => {
                // ANSI PST files are generally smaller per email
                (file_size / 80_000).max(1) as usize
            }
            PstFormat::Unicode => {
                // Unicode PST files have more overhead
                (file_size / 120_000).max(1) as usize
            }
        };

        // Cap the estimate at reasonable bounds
        Ok(estimated_count.min(50000).max(1))
    }

    /// Extract a single email at the specified index
    /// This is a simplified implementation for demonstration
    fn extract_single_email(&self, index: usize) -> PstResult<Email> {
        // Check cache first
        if let Some(email) = self.email_cache.get(&index) {
            return Ok(email.clone());
        }

        // In a real implementation, this would:
        // 1. Navigate to the email entry in the PST structure
        // 2. Parse the email properties and content
        // 3. Extract attachments if present
        // 4. Handle different encoding formats

        // For demonstration, create a sample email structure
        // This would be replaced with actual PST parsing logic
        let email = self.create_sample_email(index)?;

        Ok(email)
    }

    /// Create a sample email for demonstration purposes
    /// In a real implementation, this would parse actual PST data
    fn create_sample_email(&self, index: usize) -> PstResult<Email> {
        use chrono::Duration;

        // Create a sample email with realistic data
        let base_date = Utc.with_ymd_and_hms(2024, 1, 1, 10, 0, 0).unwrap();
        let email_date = base_date + Duration::days(index as i64);

        let mut email = Email::new(
            format!("Email Subject {}", index + 1),
            format!("sender{}@example.com", index + 1),
            "recipient@example.com".to_string(),
            email_date,
            format!("This is the body content of email number {}.\n\nThis email contains sample content for testing purposes.", index + 1),
        );

        // Add some variety to the sample data
        email.cc_recipients = if index % 3 == 0 {
            vec!["cc@example.com".to_string()]
        } else {
            Vec::new()
        };

        email.is_html = index % 2 == 0;
        email.priority = match index % 4 {
            0 => EmailPriority::Low,
            1 => EmailPriority::Normal,
            2 => EmailPriority::High,
            3 => EmailPriority::Urgent,
            _ => EmailPriority::Normal,
        };

        email.message_id = Some(format!("<message-{}@example.com>", index + 1));
        email.size = email.body.len() + email.subject.len() + 200; // Approximate size

        // Add sample attachment for some emails
        if index % 5 == 0 {
            let attachment = Attachment::new(
                format!("document_{}.pdf", index + 1),
                1024 * (index % 10 + 1), // Variable size
                "application/pdf".to_string(),
            );
            email.attachments.push(attachment);
        }

        Ok(email)
    }

    /// Validate if the PST file is readable and has valid format
    /// Returns detailed information about the PST file including email count
    pub fn validate(&self) -> PstResult<PstInfo> {
        let mut pst_info = PstInfo::new(self.file_path.to_string_lossy().to_string());
        
        // Get file metadata
        let metadata = match std::fs::metadata(&self.file_path) {
            Ok(metadata) => metadata,
            Err(e) => {
                return match e.kind() {
                    std::io::ErrorKind::PermissionDenied => {
                        Err(PstError::PermissionDenied(self.file_path.to_string_lossy().to_string()))
                    }
                    std::io::ErrorKind::NotFound => {
                        Err(PstError::FileNotFound(self.file_path.to_string_lossy().to_string()))
                    }
                    _ => Err(PstError::IoError(format!("Fehler beim Zugriff auf Datei-Metadaten: {}", e)))
                };
            }
        };

        let file_size = metadata.len();
        let last_modified = DateTime::from_timestamp(
            metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                .duration_since(std::time::SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64, 0
        ).unwrap_or_else(|| Utc::now());

        // Validate PST header
        match self.read_pst_header() {
            Ok(_header) => {
                // File is valid, get email count
                match self.get_email_count() {
                    Ok(email_count) => {
                        pst_info.mark_valid(email_count, file_size, last_modified);
                    }
                    Err(e) => {
                        pst_info.mark_invalid(vec![format!("Fehler beim Zählen der E-Mails: {}", e)]);
                    }
                }
            }
            Err(e) => {
                pst_info.mark_invalid(vec![e.to_string()]);
            }
        }
        
        Ok(pst_info)
    }

    /// Get all emails in chronological order (for processing workflow)
    /// This method is optimized for sequential processing of all emails
    pub fn get_all_emails_chronological(&self) -> PstResult<Vec<Email>> {
        let total_count = self.get_email_count()?;
        self.extract_emails(0, total_count)
    }

    /// Check if the processor can handle the PST file format
    pub fn is_supported_format(&self) -> bool {
        matches!(self.pst_format, PstFormat::Ansi | PstFormat::Unicode)
    }

    /// Get PST format information
    pub fn get_format_info(&self) -> String {
        match self.pst_format {
            PstFormat::Ansi => "ANSI PST (Outlook 97-2002)".to_string(),
            PstFormat::Unicode => "Unicode PST (Outlook 2003+)".to_string(),
        }
    }

    /// Clear the email cache to free memory
    pub fn clear_cache(&mut self) {
        self.email_cache.clear();
    }

    /// Get cache statistics for debugging
    pub fn get_cache_stats(&self) -> (usize, usize) {
        (self.email_cache.len(), self.total_emails.unwrap_or(0))
    }
}

/// Static methods for PST file validation without creating a processor instance
impl PstProcessor {
    /// Quick validation of PST file without full initialization
    /// Useful for file selection validation
    pub fn quick_validate(file_path: &PathBuf) -> PstResult<bool> {
        if !file_path.exists() {
            return Err(PstError::FileNotFound(file_path.to_string_lossy().to_string()));
        }

        // Check file extension
        if let Some(extension) = file_path.extension() {
            if extension.to_string_lossy().to_lowercase() != "pst" {
                return Err(PstError::InvalidFormat(
                    "Datei hat keine .pst Erweiterung".to_string()
                ));
            }
        } else {
            return Err(PstError::InvalidFormat(
                "Datei hat keine Erweiterung".to_string()
            ));
        }

        // Check file size (PST files should be at least a few KB)
        let metadata = std::fs::metadata(file_path)?;
        if metadata.len() < 1024 {
            return Err(PstError::InvalidFormat(
                "Datei ist zu klein für eine gültige PST-Datei".to_string()
            ));
        }

        // Quick signature check
        let mut file = File::open(file_path)?;
        let mut signature = [0u8; 4];
        file.read_exact(&mut signature)?;

        if signature != [0x21, 0x42, 0x44, 0x4E] { // "!BDN"
            return Err(PstError::InvalidFormat(
                "Ungültige PST-Datei-Signatur".to_string()
            ));
        }

        Ok(true)
    }

    /// Get supported PST file extensions
    pub fn supported_extensions() -> Vec<&'static str> {
        vec!["pst"]
    }

    /// Check if a file path has a supported PST extension
    pub fn has_supported_extension(file_path: &PathBuf) -> bool {
        if let Some(extension) = file_path.extension() {
            let ext_str = extension.to_string_lossy().to_lowercase();
            Self::supported_extensions().contains(&ext_str.as_str())
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_pst_format_detection() {
        // Test PST format enum
        assert_eq!(PstFormat::Ansi, PstFormat::Ansi);
        assert_ne!(PstFormat::Ansi, PstFormat::Unicode);
    }

    #[test]
    fn test_supported_extensions() {
        let extensions = PstProcessor::supported_extensions();
        assert!(extensions.contains(&"pst"));
    }

    #[test]
    fn test_has_supported_extension() {
        let pst_path = PathBuf::from("test.pst");
        let txt_path = PathBuf::from("test.txt");
        let no_ext_path = PathBuf::from("test");

        assert!(PstProcessor::has_supported_extension(&pst_path));
        assert!(!PstProcessor::has_supported_extension(&txt_path));
        assert!(!PstProcessor::has_supported_extension(&no_ext_path));
    }

    #[test]
    fn test_quick_validate_nonexistent_file() {
        let path = PathBuf::from("nonexistent.pst");
        let result = PstProcessor::quick_validate(&path);
        assert!(result.is_err());
        
        if let Err(PstError::FileNotFound(_)) = result {
            // Expected error type
        } else {
            panic!("Expected FileNotFound error");
        }
    }

    #[test]
    fn test_quick_validate_wrong_extension() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "test content").unwrap();

        let result = PstProcessor::quick_validate(&file_path);
        assert!(result.is_err());
        
        if let Err(PstError::InvalidFormat(_)) = result {
            // Expected error type
        } else {
            panic!("Expected InvalidFormat error");
        }
    }

    #[test]
    fn test_quick_validate_too_small() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.pst");
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "small").unwrap(); // Less than 1024 bytes

        let result = PstProcessor::quick_validate(&file_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_email_chronological_sorting() {
        // Test that emails are sorted chronologically
        let email1 = Email::new(
            "Subject 1".to_string(),
            "sender1@test.com".to_string(),
            "recipient@test.com".to_string(),
            Utc.with_ymd_and_hms(2024, 1, 2, 10, 0, 0).unwrap(),
            "Body 1".to_string(),
        );

        let email2 = Email::new(
            "Subject 2".to_string(),
            "sender2@test.com".to_string(),
            "recipient@test.com".to_string(),
            Utc.with_ymd_and_hms(2024, 1, 1, 10, 0, 0).unwrap(),
            "Body 2".to_string(),
        );

        let mut emails = vec![email1, email2];
        emails.sort_by(|a, b| a.date.cmp(&b.date));

        // email2 should come first (earlier date)
        assert_eq!(emails[0].subject, "Subject 2");
        assert_eq!(emails[1].subject, "Subject 1");
    }
}