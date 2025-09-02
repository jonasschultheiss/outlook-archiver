use std::path::PathBuf;
use std::fs::File;
use std::io::BufWriter;
use chrono::{DateTime, Local};
use printpdf::*;
use crate::errors::{PdfError, PdfResult};
use crate::types::Email;

/// PDF generator for converting emails to PDF format
#[derive(Debug)]
pub struct PdfGenerator {
    output_dir: PathBuf,
    base_name: String,
    session_timestamp: DateTime<Local>,
}

impl PdfGenerator {
    /// Create a new PDF generator with output directory and base filename
    pub fn new(output_dir: PathBuf, base_name: String) -> PdfResult<Self> {
        // Validate output directory exists and is writable
        if !output_dir.exists() {
            return Err(PdfError::InvalidOutputDirectory(
                format!("Directory does not exist: {}", output_dir.display())
            ));
        }

        if !output_dir.is_dir() {
            return Err(PdfError::InvalidOutputDirectory(
                format!("Path is not a directory: {}", output_dir.display())
            ));
        }

        let session_timestamp = Local::now();

        // Validate write permissions by attempting to create a test file
        let test_file_path = output_dir.join(".write_test");
        match std::fs::write(&test_file_path, b"test") {
            Ok(_) => {
                // Clean up test file
                let _ = std::fs::remove_file(&test_file_path);
            }
            Err(e) => {
                return Err(PdfError::PermissionDenied(
                    format!("Cannot write to directory {}: {}", output_dir.display(), e)
                ));
            }
        }

        Ok(Self {
            output_dir,
            base_name,
            session_timestamp,
        })
    }

    /// Generate a PDF file from a collection of emails
    pub fn generate_pdf(&self, emails: Vec<Email>, sequence: u32) -> PdfResult<PathBuf> {
        if emails.is_empty() {
            return Err(PdfError::GenerationFailed(
                "Cannot generate PDF from empty email list".to_string()
            ));
        }

        let filename = self.generate_filename(sequence);
        let output_path = self.output_dir.join(&filename);
        
        // Create PDF document
        let (doc, page1, layer1) = PdfDocument::new(
            &format!("Email Archive - {}", self.base_name),
            Mm(210.0), // A4 width
            Mm(297.0), // A4 height
            "Layer 1"
        );

        let current_layer = doc.get_page(page1).get_layer(layer1);
        
        // Set up fonts
        let font = doc.add_builtin_font(BuiltinFont::Helvetica)
            .map_err(|e| PdfError::FormattingError(format!("Failed to load font: {}", e)))?;
        let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)
            .map_err(|e| PdfError::FormattingError(format!("Failed to load bold font: {}", e)))?;

        // Start writing content
        let mut current_y = Mm(280.0); // Start near top of page
        let margin_left = Mm(20.0);
        let margin_right = Mm(190.0);
        let line_height = Mm(6.0);

        // Add title
        current_layer.use_text(&format!("Email Archive - {}", self.base_name), 16.0, margin_left, current_y, &font_bold);
        current_y -= line_height * 2.0;

        // Add generation info
        let generation_info = format!(
            "Generated: {} | Emails: {} | Sequence: {}",
            self.session_timestamp.format("%d.%m.%Y %H:%M:%S"),
            emails.len(),
            sequence
        );
        current_layer.use_text(&generation_info, 10.0, margin_left, current_y, &font);
        current_y -= line_height * 2.0;

        // Add separator line
        let line_points = vec![
            (Point::new(margin_left, current_y), false),
            (Point::new(margin_right, current_y), false)
        ];
        let line = Line {
            points: line_points,
            is_closed: false,
        };
        current_layer.add_line(line);
        current_y -= line_height;

        // Keep track of current page and layer indices
        let mut current_page_index = page1;
        let mut current_layer_index = layer1;

        // Process each email
        for (index, email) in emails.iter().enumerate() {
            // Check if we need a new page
            if current_y < Mm(50.0) {
                let (new_page, new_layer) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
                current_page_index = new_page;
                current_layer_index = new_layer;
                current_y = Mm(280.0);
            }

            let current_layer = doc.get_page(current_page_index).get_layer(current_layer_index);

            // Email header
            current_layer.use_text(&format!("Email {} of {}", index + 1, emails.len()), 12.0, margin_left, current_y, &font_bold);
            current_y -= line_height;

            // Subject
            let subject = self.truncate_text(&email.subject, 80);
            current_layer.use_text(&format!("Subject: {}", subject), 10.0, margin_left, current_y, &font_bold);
            current_y -= line_height;

            // From
            let sender = self.truncate_text(&email.sender, 80);
            current_layer.use_text(&format!("From: {}", sender), 10.0, margin_left, current_y, &font);
            current_y -= line_height;

            // To
            let recipient = self.truncate_text(&email.recipient, 80);
            current_layer.use_text(&format!("To: {}", recipient), 10.0, margin_left, current_y, &font);
            current_y -= line_height;

            // CC recipients if any
            if !email.cc_recipients.is_empty() {
                let cc_list = email.cc_recipients.join(", ");
                let cc_truncated = self.truncate_text(&cc_list, 80);
                current_layer.use_text(&format!("CC: {}", cc_truncated), 10.0, margin_left, current_y, &font);
                current_y -= line_height;
            }

            // Date
            current_layer.use_text(&format!("Date: {}", email.formatted_date()), 10.0, margin_left, current_y, &font);
            current_y -= line_height;

            // Attachments if any
            if email.has_attachments() {
                let attachment_names: Vec<String> = email.attachments.iter()
                    .map(|a| format!("{} ({})", a.name, self.format_file_size(a.size)))
                    .collect();
                let attachments_text = attachment_names.join(", ");
                let attachments_truncated = self.truncate_text(&attachments_text, 80);
                current_layer.use_text(&format!("Attachments: {}", attachments_truncated), 10.0, margin_left, current_y, &font);
                current_y -= line_height;
            }

            current_y -= line_height * 0.5;

            // Email body (truncated and cleaned)
            let body_lines = self.prepare_body_text(&email.body, 90);
            for line in body_lines.iter().take(10) { // Limit to 10 lines per email
                if current_y < Mm(30.0) {
                    let (new_page, new_layer) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
                    current_page_index = new_page;
                    current_layer_index = new_layer;
                    current_y = Mm(280.0);
                }
                let current_layer = doc.get_page(current_page_index).get_layer(current_layer_index);
                current_layer.use_text(line, 9.0, margin_left + Mm(5.0), current_y, &font);
                current_y -= Mm(4.0);
            }

            // Add separator between emails
            current_y -= line_height;
            if current_y > Mm(30.0) {
                let current_layer = doc.get_page(current_page_index).get_layer(current_layer_index);
                let separator_points = vec![
                    (Point::new(margin_left, current_y), false),
                    (Point::new(margin_right, current_y), false)
                ];
                let separator = Line {
                    points: separator_points,
                    is_closed: false,
                };
                current_layer.add_line(separator);
            }
            current_y -= line_height;
        }

        // Save PDF to file
        let file = File::create(&output_path)
            .map_err(|e| PdfError::FileWriteError(format!("Failed to create PDF file: {}", e)))?;
        let mut writer = BufWriter::new(file);
        
        doc.save(&mut writer)
            .map_err(|e| PdfError::GenerationFailed(format!("Failed to save PDF: {}", e)))?;

        Ok(output_path)
    }

    /// Generate timestamp-prefixed filename with sequence number
    fn generate_filename(&self, sequence: u32) -> String {
        // Format: YYYY-MM-DDTHH-mm-ss_{base_name}_{sequence}.pdf
        let timestamp = self.session_timestamp.format("%Y-%m-%dT%H-%M-%S");
        format!("{}_{}_{}.pdf", timestamp, self.base_name, sequence)
    }

    /// Validate that the output directory is writable
    pub fn validate_output_directory(&self) -> PdfResult<()> {
        let test_file_path = self.output_dir.join(".write_test");
        match std::fs::write(&test_file_path, b"test") {
            Ok(_) => {
                let _ = std::fs::remove_file(&test_file_path);
                Ok(())
            }
            Err(e) => Err(PdfError::PermissionDenied(
                format!("Cannot write to directory {}: {}", self.output_dir.display(), e)
            ))
        }
    }

    /// Get the session timestamp used for all PDFs in this generation session
    pub fn get_session_timestamp(&self) -> DateTime<Local> {
        self.session_timestamp
    }

    /// Truncate text to specified length with ellipsis
    fn truncate_text(&self, text: &str, max_length: usize) -> String {
        if text.len() <= max_length {
            text.to_string()
        } else {
            format!("{}...", &text[..max_length.saturating_sub(3)])
        }
    }

    /// Prepare email body text for PDF display
    fn prepare_body_text(&self, body: &str, max_line_length: usize) -> Vec<String> {
        // Remove HTML tags if present and clean up text
        let cleaned_body = self.strip_html_tags(body);
        
        // Split into words and wrap into lines
        let words: Vec<&str> = cleaned_body.split_whitespace().collect();
        let mut lines = Vec::new();
        let mut current_line = String::new();
        
        for word in words {
            // Check if adding this word would exceed the line length
            let test_line = if current_line.is_empty() {
                word.to_string()
            } else {
                format!("{} {}", current_line, word)
            };
            
            if test_line.len() <= max_line_length {
                current_line = test_line;
            } else {
                // Start a new line
                if !current_line.is_empty() {
                    lines.push(current_line);
                }
                current_line = word.to_string();
            }
        }
        
        // Add the last line if not empty
        if !current_line.is_empty() {
            lines.push(current_line);
        }
        
        lines
    }

    /// Strip HTML tags from text (basic implementation)
    fn strip_html_tags(&self, html: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;
        let mut last_was_tag = false;
        
        for ch in html.chars() {
            match ch {
                '<' => {
                    in_tag = true;
                    last_was_tag = false;
                },
                '>' => {
                    in_tag = false;
                    last_was_tag = true;
                },
                _ if !in_tag => {
                    // Add space only if we just closed a tag and this isn't whitespace or punctuation
                    if last_was_tag && !ch.is_whitespace() && !ch.is_ascii_punctuation() && !result.is_empty() && !result.ends_with(' ') {
                        result.push(' ');
                    }
                    result.push(ch);
                    last_was_tag = false;
                },
                _ => {}
            }
        }
        
        // Clean up multiple whitespaces and newlines
        result
            .split_whitespace()
            .collect::<Vec<&str>>()
            .join(" ")
    }

    /// Format file size in human-readable format
    fn format_file_size(&self, size: usize) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
        let mut size_f = size as f64;
        let mut unit_index = 0;
        
        while size_f >= 1024.0 && unit_index < UNITS.len() - 1 {
            size_f /= 1024.0;
            unit_index += 1;
        }
        
        if unit_index == 0 {
            format!("{} {}", size, UNITS[unit_index])
        } else {
            format!("{:.1} {}", size_f, UNITS[unit_index])
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use chrono::Utc;
    use crate::types::{Email, Attachment, EmailPriority};

    fn create_test_email(subject: &str, sender: &str, recipient: &str) -> Email {
        Email {
            subject: subject.to_string(),
            sender: sender.to_string(),
            recipient: recipient.to_string(),
            cc_recipients: vec![],
            bcc_recipients: vec![],
            date: Utc::now(),
            body: "This is a test email body with some content.".to_string(),
            is_html: false,
            attachments: vec![],
            priority: EmailPriority::Normal,
            message_id: Some("test@example.com".to_string()),
            in_reply_to: None,
            size: 1024,
        }
    }

    fn create_test_email_with_attachments() -> Email {
        let mut email = create_test_email(
            "Test Email with Attachments",
            "sender@example.com",
            "recipient@example.com"
        );
        
        email.attachments = vec![
            Attachment {
                name: "document.pdf".to_string(),
                size: 2048,
                content_type: "application/pdf".to_string(),
                is_inline: false,
                content_id: None,
                data: None,
            },
            Attachment {
                name: "image.jpg".to_string(),
                size: 1536,
                content_type: "image/jpeg".to_string(),
                is_inline: true,
                content_id: Some("img1".to_string()),
                data: None,
            },
        ];
        
        email
    }

    #[test]
    fn test_pdf_generator_creation() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test_base".to_string()
        );
        
        assert!(generator.is_ok());
        let generator = generator.unwrap();
        assert_eq!(generator.base_name, "test_base");
        assert_eq!(generator.output_dir, temp_dir.path());
    }

    #[test]
    fn test_pdf_generator_invalid_directory() {
        let invalid_path = PathBuf::from("/nonexistent/directory");
        let result = PdfGenerator::new(invalid_path, "test".to_string());
        
        assert!(result.is_err());
        match result.unwrap_err() {
            PdfError::InvalidOutputDirectory(_) => {},
            _ => panic!("Expected InvalidOutputDirectory error"),
        }
    }

    #[test]
    fn test_filename_generation() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test_emails".to_string()
        ).unwrap();
        
        let filename1 = generator.generate_filename(1);
        let filename2 = generator.generate_filename(2);
        
        // Both should have same timestamp but different sequence numbers
        assert!(filename1.contains("test_emails"));
        assert!(filename2.contains("test_emails"));
        assert!(filename1.ends_with("_1.pdf"));
        assert!(filename2.ends_with("_2.pdf"));
        
        // Should be in ISO format YYYY-MM-DDTHH-MM-SS
        let dash_count = filename1.matches('-').count();
        assert!(dash_count == 4); // Exactly 4 dashes in ISO format YYYY-MM-DDTHH-MM-SS
        assert!(filename1.contains('T')); // ISO format separator
    }

    #[test]
    fn test_generate_pdf_empty_emails() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test".to_string()
        ).unwrap();
        
        let result = generator.generate_pdf(vec![], 1);
        assert!(result.is_err());
        match result.unwrap_err() {
            PdfError::GenerationFailed(_) => {},
            _ => panic!("Expected GenerationFailed error"),
        }
    }

    #[test]
    fn test_generate_pdf_single_email() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test".to_string()
        ).unwrap();
        
        let emails = vec![create_test_email("Test Subject", "test@example.com", "recipient@example.com")];
        let result = generator.generate_pdf(emails, 1);
        
        assert!(result.is_ok());
        let pdf_path = result.unwrap();
        assert!(pdf_path.exists());
        assert!(pdf_path.to_string_lossy().ends_with(".pdf"));
    }

    #[test]
    fn test_generate_pdf_multiple_emails() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "multi_test".to_string()
        ).unwrap();
        
        let emails = vec![
            create_test_email("First Email", "sender1@example.com", "recipient1@example.com"),
            create_test_email("Second Email", "sender2@example.com", "recipient2@example.com"),
            create_test_email_with_attachments(),
        ];
        
        let result = generator.generate_pdf(emails, 1);
        assert!(result.is_ok());
        
        let pdf_path = result.unwrap();
        assert!(pdf_path.exists());
        assert!(pdf_path.file_name().unwrap().to_str().unwrap().contains("multi_test"));
    }

    #[test]
    fn test_truncate_text() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test".to_string()
        ).unwrap();
        
        let short_text = "Short";
        let long_text = "This is a very long text that should be truncated";
        
        assert_eq!(generator.truncate_text(short_text, 10), "Short");
        assert_eq!(generator.truncate_text(long_text, 10), "This is...");
        assert_eq!(generator.truncate_text(long_text, 20), "This is a very lo...");
    }

    #[test]
    fn test_strip_html_tags() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test".to_string()
        ).unwrap();
        
        let html_text = "<p>Hello <b>world</b>!</p><br/><div>Test</div>";
        let plain_text = generator.strip_html_tags(html_text);
        
        assert_eq!(plain_text, "Hello world! Test");
        assert!(!plain_text.contains('<'));
        assert!(!plain_text.contains('>'));
    }

    #[test]
    fn test_format_file_size() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test".to_string()
        ).unwrap();
        
        assert_eq!(generator.format_file_size(512), "512 B");
        assert_eq!(generator.format_file_size(1024), "1.0 KB");
        assert_eq!(generator.format_file_size(1536), "1.5 KB");
        assert_eq!(generator.format_file_size(1048576), "1.0 MB");
        assert_eq!(generator.format_file_size(1073741824), "1.0 GB");
    }

    #[test]
    fn test_prepare_body_text() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test".to_string()
        ).unwrap();
        
        let body_text = "Line 1\n\nLine 2 with some content\n   \nLine 3";
        let lines = generator.prepare_body_text(body_text, 20);
        
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0], "Line 1 Line 2 with");
        assert_eq!(lines[1], "some content Line 3");
    }

    #[test]
    fn test_validate_output_directory() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test".to_string()
        ).unwrap();
        
        let result = generator.validate_output_directory();
        assert!(result.is_ok());
    }

    #[test]
    fn test_session_timestamp_consistency() {
        let temp_dir = TempDir::new().unwrap();
        let generator = PdfGenerator::new(
            temp_dir.path().to_path_buf(),
            "test".to_string()
        ).unwrap();
        
        let timestamp1 = generator.get_session_timestamp();
        std::thread::sleep(std::time::Duration::from_millis(10));
        let timestamp2 = generator.get_session_timestamp();
        
        // Should be the same timestamp for the same generator instance
        assert_eq!(timestamp1, timestamp2);
    }
}