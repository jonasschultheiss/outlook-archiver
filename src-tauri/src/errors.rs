use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Main application error enum that encompasses all possible error types
#[derive(Debug, Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("PST file error: {0}")]
    PstError(String),

    #[error("PDF generation error: {0}")]
    PdfError(String),

    #[error("File system error: {0}")]
    FileSystemError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Processing cancelled by user")]
    ProcessingCancelled,

    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    #[error("Internal error: {0}")]
    InternalError(String),
}

/// PST-specific error types
#[derive(Debug, Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum PstError {
    #[error("PST file not found: {0}")]
    FileNotFound(String),

    #[error("Invalid PST format: {0}")]
    InvalidFormat(String),

    #[error("Permission denied accessing PST file: {0}")]
    PermissionDenied(String),

    #[error("PST file is corrupted: {0}")]
    CorruptedFile(String),

    #[error("Email extraction failed: {0}")]
    ExtractionFailed(String),

    #[error("PST parsing error: {0}")]
    ParsingError(String),

    #[error("IO error while reading PST: {0}")]
    IoError(String),
}

/// PDF generation specific error types
#[derive(Debug, Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum PdfError {
    #[error("PDF generation failed: {0}")]
    GenerationFailed(String),

    #[error("File write error: {0}")]
    FileWriteError(String),

    #[error("Invalid output directory: {0}")]
    InvalidOutputDirectory(String),

    #[error("Permission denied writing PDF: {0}")]
    PermissionDenied(String),

    #[error("Disk space insufficient: {0}")]
    InsufficientSpace(String),

    #[error("PDF formatting error: {0}")]
    FormattingError(String),

    #[error("Template error: {0}")]
    TemplateError(String),
}

/// File system operation error types
#[derive(Debug, Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum FileSystemError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Directory not found: {0}")]
    DirectoryNotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Path already exists: {0}")]
    PathExists(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("IO operation failed: {0}")]
    IoError(String),
}

/// Validation error types
#[derive(Debug, Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum ValidationError {
    #[error("Invalid file extension: expected {expected}, got {actual}")]
    InvalidFileExtension { expected: String, actual: String },

    #[error("Invalid email count: must be between {min} and {max}, got {actual}")]
    InvalidEmailCount { min: u32, max: u32, actual: u32 },

    #[error("Invalid filename: {0}")]
    InvalidFilename(String),

    #[error("Invalid directory path: {0}")]
    InvalidDirectory(String),

    #[error("Required field missing: {0}")]
    RequiredFieldMissing(String),

    #[error("Invalid character in field {field}: {character}")]
    InvalidCharacter { field: String, character: String },
}

// Conversion implementations for error types
impl From<PstError> for AppError {
    fn from(err: PstError) -> Self {
        AppError::PstError(err.to_string())
    }
}

impl From<PdfError> for AppError {
    fn from(err: PdfError) -> Self {
        AppError::PdfError(err.to_string())
    }
}

impl From<FileSystemError> for AppError {
    fn from(err: FileSystemError) -> Self {
        AppError::FileSystemError(err.to_string())
    }
}

impl From<ValidationError> for AppError {
    fn from(err: ValidationError) -> Self {
        AppError::ValidationError(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<std::io::Error> for PstError {
    fn from(err: std::io::Error) -> Self {
        PstError::IoError(err.to_string())
    }
}

impl From<std::io::Error> for PdfError {
    fn from(err: std::io::Error) -> Self {
        PdfError::FileWriteError(err.to_string())
    }
}

impl From<std::io::Error> for FileSystemError {
    fn from(err: std::io::Error) -> Self {
        FileSystemError::IoError(err.to_string())
    }
}

/// Result type aliases for convenience
pub type AppResult<T> = Result<T, AppError>;
pub type PstResult<T> = Result<T, PstError>;
pub type PdfResult<T> = Result<T, PdfError>;
pub type FileSystemResult<T> = Result<T, FileSystemError>;
pub type ValidationResult<T> = Result<T, ValidationError>;