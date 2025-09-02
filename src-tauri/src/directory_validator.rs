use std::path::{Path, PathBuf};
use std::fs;
use crate::errors::{FileSystemError, FileSystemResult, ValidationError, ValidationResult};

/// Directory validation utilities for checking permissions and path validity
pub struct DirectoryValidator;

impl DirectoryValidator {
    /// Validate a directory path and check write permissions
    pub fn validate_directory_path(path: &str) -> ValidationResult<PathBuf> {
        if path.is_empty() {
            return Err(ValidationError::RequiredFieldMissing("directory_path".to_string()));
        }

        let path_buf = PathBuf::from(path);
        
        // Validate path format and characters
        Self::validate_path_format(&path_buf)?;
        
        // Check if path exists and is a directory
        Self::validate_directory_exists(&path_buf)?;
        
        // Check write permissions
        Self::validate_write_permissions(&path_buf)?;
        
        Ok(path_buf)
    }

    /// Validate path format and check for invalid characters
    fn validate_path_format(path: &Path) -> ValidationResult<()> {
        let path_str = path.to_string_lossy();
        
        // Check for null bytes (not allowed in file paths)
        if path_str.contains('\0') {
            return Err(ValidationError::InvalidDirectory(
                "Pfad enthält ungültige Zeichen (Null-Byte)".to_string()
            ));
        }
        
        // Check for extremely long paths (Windows has 260 char limit, Unix varies)
        if path_str.len() > 250 {
            return Err(ValidationError::InvalidDirectory(
                "Pfad ist zu lang (maximal 250 Zeichen)".to_string()
            ));
        }
        
        // Check for reserved names on Windows
        #[cfg(target_os = "windows")]
        {
            let reserved_names = [
                "CON", "PRN", "AUX", "NUL",
                "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
                "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
            ];
            
            for component in path.components() {
                if let Some(name) = component.as_os_str().to_str() {
                    let name_upper = name.to_uppercase();
                    if reserved_names.contains(&name_upper.as_str()) {
                        return Err(ValidationError::InvalidDirectory(
                            format!("Pfad enthält reservierten Namen: {}", name)
                        ));
                    }
                }
            }
        }
        
        Ok(())
    }

    /// Check if directory exists and is actually a directory
    fn validate_directory_exists(path: &Path) -> ValidationResult<()> {
        if !path.exists() {
            return Err(ValidationError::InvalidDirectory(
                format!("Verzeichnis existiert nicht: {}", path.display())
            ));
        }
        
        let metadata = fs::metadata(path)
            .map_err(|e| ValidationError::InvalidDirectory(
                format!("Fehler beim Zugriff auf Verzeichnis {}: {}", path.display(), Self::translate_io_error(&e))
            ))?;
        
        if !metadata.is_dir() {
            return Err(ValidationError::InvalidDirectory(
                format!("Pfad ist kein Verzeichnis: {}", path.display())
            ));
        }
        
        Ok(())
    }

    /// Check write permissions by attempting to create a test file
    fn validate_write_permissions(path: &Path) -> ValidationResult<()> {
        let test_file_path = path.join(".write_permission_test");
        
        // Try to create and write to a test file
        match fs::write(&test_file_path, b"test") {
            Ok(_) => {
                // Clean up test file
                let _ = fs::remove_file(&test_file_path);
                Ok(())
            }
            Err(e) => {
                Err(ValidationError::InvalidDirectory(
                    format!("Keine Schreibberechtigung für Verzeichnis {}: {}", 
                           path.display(), 
                           Self::translate_io_error(&e))
                ))
            }
        }
    }

    /// Sanitize a directory path by resolving relative components and normalizing
    pub fn sanitize_directory_path(path: &str) -> FileSystemResult<PathBuf> {
        let path_buf = PathBuf::from(path);
        
        // Resolve to absolute path to eliminate relative components like ".." and "."
        let absolute_path = path_buf.canonicalize()
            .map_err(|e| FileSystemError::InvalidPath(
                format!("Fehler beim Auflösen des Pfads {}: {}", path, Self::translate_io_error(&e))
            ))?;
        
        Ok(absolute_path)
    }

    /// Check available disk space in the directory
    pub fn check_available_space(path: &Path, required_bytes: u64) -> FileSystemResult<()> {
        // Get available space using statvfs on Unix or GetDiskFreeSpaceEx on Windows
        let available_space = Self::get_available_space(path)?;
        
        if available_space < required_bytes {
            return Err(FileSystemError::IoError(
                format!("Nicht genügend Speicherplatz verfügbar. Benötigt: {} MB, Verfügbar: {} MB",
                       required_bytes / 1024 / 1024,
                       available_space / 1024 / 1024)
            ));
        }
        
        Ok(())
    }

    /// Get available disk space for a directory
    pub fn get_available_space(path: &Path) -> FileSystemResult<u64> {
        #[cfg(unix)]
        {
            use std::ffi::CString;
            use std::mem;
            
            let path_cstring = CString::new(path.to_string_lossy().as_bytes())
                .map_err(|_| FileSystemError::InvalidPath("Pfad enthält ungültige Zeichen".to_string()))?;
            
            let mut statvfs: libc::statvfs = unsafe { mem::zeroed() };
            let result = unsafe { libc::statvfs(path_cstring.as_ptr(), &mut statvfs) };
            
            if result == 0 {
                let available_bytes = (statvfs.f_bavail as u64) * (statvfs.f_frsize as u64);
                Ok(available_bytes)
            } else {
                Err(FileSystemError::IoError("Fehler beim Abrufen des verfügbaren Speicherplatzes".to_string()))
            }
        }
        
        #[cfg(windows)]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;
            use winapi::um::fileapi::GetDiskFreeSpaceExW;
            use winapi::shared::minwindef::DWORD;
            
            let path_wide: Vec<u16> = OsStr::new(&path.to_string_lossy())
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            
            let mut free_bytes_available: u64 = 0;
            let mut total_bytes: u64 = 0;
            let mut total_free_bytes: u64 = 0;
            
            let result = unsafe {
                GetDiskFreeSpaceExW(
                    path_wide.as_ptr(),
                    &mut free_bytes_available,
                    &mut total_bytes,
                    &mut total_free_bytes,
                )
            };
            
            if result != 0 {
                Ok(free_bytes_available)
            } else {
                Err(FileSystemError::IoError("Fehler beim Abrufen des verfügbaren Speicherplatzes".to_string()))
            }
        }
        
        #[cfg(not(any(unix, windows)))]
        {
            // Fallback for other platforms - assume sufficient space
            Ok(u64::MAX)
        }
    }

    /// Create directory if it doesn't exist (with parent directories)
    pub fn ensure_directory_exists(path: &Path) -> FileSystemResult<()> {
        if path.exists() {
            if !path.is_dir() {
                return Err(FileSystemError::InvalidPath(
                    format!("Pfad existiert bereits, ist aber kein Verzeichnis: {}", path.display())
                ));
            }
            return Ok(());
        }
        
        fs::create_dir_all(path)
            .map_err(|e| FileSystemError::IoError(
                format!("Fehler beim Erstellen des Verzeichnisses {}: {}", 
                       path.display(), 
                       Self::translate_io_error(&e))
            ))?;
        
        Ok(())
    }

    /// Translate std::io::Error to German error messages
    fn translate_io_error(error: &std::io::Error) -> String {
        match error.kind() {
            std::io::ErrorKind::NotFound => "Datei oder Verzeichnis nicht gefunden".to_string(),
            std::io::ErrorKind::PermissionDenied => "Zugriff verweigert".to_string(),
            std::io::ErrorKind::AlreadyExists => "Datei oder Verzeichnis existiert bereits".to_string(),
            std::io::ErrorKind::InvalidInput => "Ungültige Eingabe".to_string(),
            std::io::ErrorKind::InvalidData => "Ungültige Daten".to_string(),
            std::io::ErrorKind::TimedOut => "Zeitüberschreitung".to_string(),
            std::io::ErrorKind::WriteZero => "Schreibvorgang fehlgeschlagen".to_string(),
            std::io::ErrorKind::Interrupted => "Vorgang unterbrochen".to_string(),
            std::io::ErrorKind::UnexpectedEof => "Unerwartetes Dateiende".to_string(),
            std::io::ErrorKind::OutOfMemory => "Nicht genügend Arbeitsspeicher".to_string(),
            _ => format!("Unbekannter Fehler: {}", error),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[test]
    fn test_validate_directory_path_success() {
        let temp_dir = TempDir::new().unwrap();
        let path_str = temp_dir.path().to_string_lossy().to_string();
        
        let result = DirectoryValidator::validate_directory_path(&path_str);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), temp_dir.path());
    }

    #[test]
    fn test_validate_directory_path_empty() {
        let result = DirectoryValidator::validate_directory_path("");
        assert!(result.is_err());
        match result.unwrap_err() {
            ValidationError::RequiredFieldMissing(_) => {},
            _ => panic!("Expected RequiredFieldMissing error"),
        }
    }

    #[test]
    fn test_validate_directory_path_nonexistent() {
        let result = DirectoryValidator::validate_directory_path("/nonexistent/directory");
        assert!(result.is_err());
        match result.unwrap_err() {
            ValidationError::InvalidDirectory(_) => {},
            _ => panic!("Expected InvalidDirectory error"),
        }
    }

    #[test]
    fn test_validate_directory_path_file_not_directory() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test_file.txt");
        fs::write(&file_path, "test content").unwrap();
        
        let result = DirectoryValidator::validate_directory_path(&file_path.to_string_lossy());
        assert!(result.is_err());
        match result.unwrap_err() {
            ValidationError::InvalidDirectory(_) => {},
            _ => panic!("Expected InvalidDirectory error"),
        }
    }

    #[test]
    fn test_sanitize_directory_path() {
        let temp_dir = TempDir::new().unwrap();
        let path_str = temp_dir.path().to_string_lossy().to_string();
        
        let result = DirectoryValidator::sanitize_directory_path(&path_str);
        assert!(result.is_ok());
        
        let sanitized = result.unwrap();
        assert!(sanitized.is_absolute());
    }

    #[test]
    fn test_ensure_directory_exists() {
        let temp_dir = TempDir::new().unwrap();
        let new_dir = temp_dir.path().join("new_directory");
        
        // Directory doesn't exist yet
        assert!(!new_dir.exists());
        
        let result = DirectoryValidator::ensure_directory_exists(&new_dir);
        assert!(result.is_ok());
        assert!(new_dir.exists());
        assert!(new_dir.is_dir());
    }

    #[test]
    fn test_ensure_directory_exists_already_exists() {
        let temp_dir = TempDir::new().unwrap();
        
        let result = DirectoryValidator::ensure_directory_exists(temp_dir.path());
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_path_format_null_byte() {
        let path_with_null = PathBuf::from("test\0path");
        let result = DirectoryValidator::validate_path_format(&path_with_null);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_path_format_too_long() {
        let long_path = PathBuf::from("a".repeat(300));
        let result = DirectoryValidator::validate_path_format(&long_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_check_available_space() {
        let temp_dir = TempDir::new().unwrap();
        
        // Check for a small amount of space (should succeed)
        let result = DirectoryValidator::check_available_space(temp_dir.path(), 1024);
        assert!(result.is_ok());
        
        // Check for an impossibly large amount of space (should fail)
        let result = DirectoryValidator::check_available_space(temp_dir.path(), u64::MAX - 1);
        assert!(result.is_err());
    }
}