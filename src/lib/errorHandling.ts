import { z } from "zod";
import type { LocalizedError } from "../types";

// German error message mappings for different error categories
export const germanErrorMessages = {
  // File system errors
  fileNotFound: "Datei nicht gefunden",
  directoryNotFound: "Verzeichnis nicht gefunden",
  permissionDenied: "Zugriff verweigert",
  pathExists: "Pfad existiert bereits",
  invalidPath: "Ungültiger Pfad",
  ioError: "Ein-/Ausgabefehler",
  diskFull: "Nicht genügend Speicherplatz",
  fileInUse: "Datei wird bereits verwendet",

  // PST file errors
  pstFileNotFound: "PST-Datei nicht gefunden",
  pstInvalidFormat: "Ungültiges PST-Format",
  pstPermissionDenied: "Zugriff auf PST-Datei verweigert",
  pstCorrupted: "PST-Datei ist beschädigt",
  pstExtractionFailed: "E-Mail-Extraktion fehlgeschlagen",
  pstParsingError: "PST-Parsing-Fehler",
  pstEmpty: "PST-Datei ist leer",
  pstTooLarge: "PST-Datei ist zu groß",

  // PDF generation errors
  pdfGenerationFailed: "PDF-Erstellung fehlgeschlagen",
  pdfFileWriteError: "Fehler beim Schreiben der PDF-Datei",
  pdfInvalidOutputDirectory: "Ungültiges Ausgabeverzeichnis",
  pdfPermissionDenied: "Keine Berechtigung zum Schreiben der PDF-Datei",
  pdfInsufficientSpace: "Nicht genügend Speicherplatz für PDF-Erstellung",
  pdfFormattingError: "PDF-Formatierungsfehler",
  pdfTemplateError: "PDF-Vorlagenfehler",

  // Validation errors
  validationRequired: "Dieses Feld ist erforderlich",
  validationInvalidType: "Ungültiger Datentyp",
  validationTooSmall: "Wert ist zu klein",
  validationTooBig: "Wert ist zu groß",
  validationInvalidString: "Ungültige Zeichenkette",
  validationInvalidNumber: "Ungültige Zahl",
  validationInvalidEmail: "Ungültige E-Mail-Adresse",
  validationInvalidFileExtension: "Ungültige Dateierweiterung",
  validationInvalidFilename: "Ungültiger Dateiname",
  validationInvalidDirectory: "Ungültiges Verzeichnis",
  validationRequiredFieldMissing: "Erforderliches Feld fehlt",
  validationInvalidCharacter: "Ungültiges Zeichen",

  // Processing errors
  processingCancelled: "Verarbeitung abgebrochen",
  processingFailed: "Verarbeitung fehlgeschlagen",
  processingTimeout: "Verarbeitung zeitüberschreitung",
  processingInterrupted: "Verarbeitung unterbrochen",
  processingConfigurationError: "Konfigurationsfehler",
  processingInternalError: "Interner Verarbeitungsfehler",

  // Network/IPC errors
  ipcConnectionFailed: "Verbindung zum Backend fehlgeschlagen",
  ipcTimeout: "Backend-Zeitüberschreitung",
  ipcInvalidResponse: "Ungültige Backend-Antwort",
  ipcCommandFailed: "Backend-Befehl fehlgeschlagen",

  // General errors
  unknownError: "Unbekannter Fehler aufgetreten",
  unexpectedError: "Unerwarteter Fehler",
  operationFailed: "Vorgang fehlgeschlagen",
  systemError: "Systemfehler",
  configurationError: "Konfigurationsfehler",
  initializationError: "Initialisierungsfehler",

  // User action errors
  userCancelled: "Vom Benutzer abgebrochen",
  userInputInvalid: "Ungültige Benutzereingabe",
  userActionFailed: "Benutzeraktion fehlgeschlagen",

  // Recovery suggestions
  recoverySuggestions: {
    checkFileExists: "Überprüfen Sie, ob die Datei existiert",
    checkPermissions: "Überprüfen Sie die Dateiberechtigungen",
    checkDiskSpace: "Überprüfen Sie den verfügbaren Speicherplatz",
    selectDifferentFile: "Wählen Sie eine andere Datei aus",
    selectDifferentDirectory: "Wählen Sie ein anderes Verzeichnis aus",
    restartApplication: "Starten Sie die Anwendung neu",
    contactSupport: "Wenden Sie sich an den Support",
    tryAgainLater: "Versuchen Sie es später erneut",
    checkConfiguration: "Überprüfen Sie Ihre Konfiguration",
    closeOtherApplications: "Schließen Sie andere Anwendungen"
  }
} as const;

// Error severity levels
export const ErrorSeverity = {
  INFO: "info" as const,
  WARNING: "warning" as const,
  ERROR: "error" as const,
  CRITICAL: "critical" as const
} as const;

// Error mapping function for backend errors
export function mapBackendErrorToGerman(errorMessage: string): LocalizedError {
  const timestamp = new Date();
  const lowerMessage = errorMessage.toLowerCase();

  // PST file errors
  if (lowerMessage.includes("pst file not found") || lowerMessage.includes("file not found")) {
    return {
      code: "PST_FILE_NOT_FOUND",
      message: errorMessage,
      germanMessage: germanErrorMessages.pstFileNotFound,
      severity: "error",
      recoverable: true,
      recoverySuggestions: [
        germanErrorMessages.recoverySuggestions.checkFileExists,
        germanErrorMessages.recoverySuggestions.selectDifferentFile
      ],
      timestamp
    };
  }

  if (lowerMessage.includes("invalid pst format") || lowerMessage.includes("corrupted")) {
    return {
      code: "PST_INVALID_FORMAT",
      message: errorMessage,
      germanMessage: germanErrorMessages.pstInvalidFormat,
      severity: "error",
      recoverable: true,
      recoverySuggestions: [
        germanErrorMessages.recoverySuggestions.selectDifferentFile,
        "Überprüfen Sie, ob die PST-Datei nicht beschädigt ist"
      ],
      timestamp
    };
  }

  if (lowerMessage.includes("permission denied") || lowerMessage.includes("access denied")) {
    return {
      code: "PERMISSION_DENIED",
      message: errorMessage,
      germanMessage: germanErrorMessages.permissionDenied,
      severity: "error",
      recoverable: true,
      recoverySuggestions: [
        germanErrorMessages.recoverySuggestions.checkPermissions,
        "Führen Sie die Anwendung als Administrator aus"
      ],
      timestamp
    };
  }

  // PDF generation errors
  if (lowerMessage.includes("pdf generation failed") || lowerMessage.includes("pdf error")) {
    return {
      code: "PDF_GENERATION_FAILED",
      message: errorMessage,
      germanMessage: germanErrorMessages.pdfGenerationFailed,
      severity: "error",
      recoverable: true,
      recoverySuggestions: [
        germanErrorMessages.recoverySuggestions.checkDiskSpace,
        germanErrorMessages.recoverySuggestions.checkPermissions
      ],
      timestamp
    };
  }

  if (lowerMessage.includes("disk space") || lowerMessage.includes("insufficient space")) {
    return {
      code: "INSUFFICIENT_DISK_SPACE",
      message: errorMessage,
      germanMessage: germanErrorMessages.pdfInsufficientSpace,
      severity: "error",
      recoverable: true,
      recoverySuggestions: [
        germanErrorMessages.recoverySuggestions.checkDiskSpace,
        "Löschen Sie nicht benötigte Dateien"
      ],
      timestamp
    };
  }

  // Directory/file system errors
  if (lowerMessage.includes("directory not found") || lowerMessage.includes("invalid directory")) {
    return {
      code: "DIRECTORY_NOT_FOUND",
      message: errorMessage,
      germanMessage: germanErrorMessages.directoryNotFound,
      severity: "error",
      recoverable: true,
      recoverySuggestions: [
        germanErrorMessages.recoverySuggestions.selectDifferentDirectory,
        "Erstellen Sie das Verzeichnis manuell"
      ],
      timestamp
    };
  }

  // Processing errors
  if (lowerMessage.includes("processing cancelled") || lowerMessage.includes("cancelled")) {
    return {
      code: "PROCESSING_CANCELLED",
      message: errorMessage,
      germanMessage: germanErrorMessages.processingCancelled,
      severity: "info",
      recoverable: true,
      recoverySuggestions: ["Starten Sie die Verarbeitung erneut, wenn gewünscht"],
      timestamp
    };
  }

  // IPC/Connection errors
  if (lowerMessage.includes("connection") || lowerMessage.includes("ipc") || lowerMessage.includes("backend")) {
    return {
      code: "IPC_CONNECTION_FAILED",
      message: errorMessage,
      germanMessage: germanErrorMessages.ipcConnectionFailed,
      severity: "critical",
      recoverable: true,
      recoverySuggestions: [
        germanErrorMessages.recoverySuggestions.restartApplication,
        germanErrorMessages.recoverySuggestions.contactSupport
      ],
      timestamp
    };
  }

  // Default unknown error
  return {
    code: "UNKNOWN_ERROR",
    message: errorMessage,
    germanMessage: `${germanErrorMessages.unknownError}: ${errorMessage}`,
    severity: "error",
    recoverable: false,
    recoverySuggestions: [
      germanErrorMessages.recoverySuggestions.tryAgainLater,
      germanErrorMessages.recoverySuggestions.restartApplication
    ],
    timestamp
  };
}

// Transform Zod validation errors to German
export function transformZodErrorToGerman(error: z.ZodError): Record<string, LocalizedError[]> {
  const errors: Record<string, LocalizedError[]> = {};
  const timestamp = new Date();

  error.issues.forEach(issue => {
    const path = issue.path.join(".") || "root";

    if (!errors[path]) {
      errors[path] = [];
    }

    let germanMessage = issue.message;
    let code = "VALIDATION_ERROR";
    let recoverySuggestions: string[] = [];

    // Map specific Zod error types to German messages
    switch (issue.code) {
      case "invalid_type":
        germanMessage = germanErrorMessages.validationInvalidType;
        code = "VALIDATION_INVALID_TYPE";
        recoverySuggestions = ["Überprüfen Sie den eingegebenen Wert"];
        break;
      case "too_small":
        germanMessage = issue.message.includes("String")
          ? `Mindestens ${issue.minimum} Zeichen erforderlich`
          : `Wert muss mindestens ${issue.minimum} sein`;
        code = "VALIDATION_TOO_SMALL";
        recoverySuggestions = ["Geben Sie einen größeren Wert ein"];
        break;
      case "too_big":
        germanMessage = issue.message.includes("String")
          ? `Maximal ${issue.maximum} Zeichen erlaubt`
          : `Wert darf maximal ${issue.maximum} sein`;
        code = "VALIDATION_TOO_BIG";
        recoverySuggestions = ["Geben Sie einen kleineren Wert ein"];
        break;
      case "invalid_format":
        germanMessage = "Ungültiges Format";
        recoverySuggestions = ["Verwenden Sie nur erlaubte Zeichen"];
        code = "VALIDATION_INVALID_STRING";
        break;
      case "custom":
        // Keep the custom message as it's already in German from our schemas
        germanMessage = issue.message;
        code = "VALIDATION_CUSTOM";
        break;
    }

    errors[path].push({
      code,
      message: issue.message,
      germanMessage,
      severity: "warning",
      recoverable: true,
      recoverySuggestions,
      originalError: issue,
      context: { path, zodCode: issue.code },
      timestamp
    });
  });

  return errors;
}

// Error recovery actions
export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

// Generate recovery actions based on error type
export function generateRecoveryActions(
  error: LocalizedError,
  context: {
    onRetry?: () => void;
    onReset?: () => void;
    onSelectNewFile?: () => void;
    onSelectNewDirectory?: () => void;
  } = {}
): ErrorRecoveryAction[] {
  const actions: ErrorRecoveryAction[] = [];

  switch (error.code) {
    case "PST_FILE_NOT_FOUND":
    case "PST_INVALID_FORMAT":
      if (context?.onSelectNewFile) {
        actions.push({
          label: "Andere Datei wählen",
          action: context.onSelectNewFile,
          primary: true
        });
      }
      break;

    case "DIRECTORY_NOT_FOUND":
      if (context?.onSelectNewDirectory) {
        actions.push({
          label: "Anderes Verzeichnis wählen",
          action: context.onSelectNewDirectory,
          primary: true
        });
      }
      break;

    case "PROCESSING_CANCELLED":
      if (context?.onRetry) {
        actions.push({
          label: "Erneut versuchen",
          action: context.onRetry,
          primary: true
        });
      }
      break;

    default:
      if (context?.onRetry) {
        actions.push({
          label: "Wiederholen",
          action: context.onRetry
        });
      }
      break;
  }

  // Always add reset option for recoverable errors
  if (error.recoverable && context?.onReset) {
    actions.push({
      label: "Zurücksetzen",
      action: context.onReset
    });
  }

  return actions;
}

// Error logging utility
export function logError(error: LocalizedError, component?: string): void {
  const logData = {
    timestamp: error.timestamp.toISOString(),
    component,
    code: error.code,
    severity: error.severity,
    message: error.message,
    germanMessage: error.germanMessage,
    context: error.context,
    recoverable: error.recoverable
  };

  switch (error.severity) {
    case "critical":
      console.error("[CRITICAL ERROR]", logData);
      break;
    case "error":
      console.error("[ERROR]", logData);
      break;
    case "warning":
      console.warn("[WARNING]", logData);
      break;
    case "info":
      console.info("[INFO]", logData);
      break;
  }
}

// Error boundary helper
export function createErrorBoundaryError(error: Error, componentStack?: string): LocalizedError {
  return {
    code: "REACT_ERROR_BOUNDARY",
    message: error.message,
    germanMessage: `Anwendungsfehler: ${error.message}`,
    severity: "critical",
    recoverable: true,
    recoverySuggestions: [germanErrorMessages.recoverySuggestions.restartApplication, "Laden Sie die Seite neu"],
    originalError: error,
    context: { componentStack },
    timestamp: new Date()
  };
}
