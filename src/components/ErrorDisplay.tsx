import React from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertCircle, XCircle, AlertTriangle, Info, RefreshCw, RotateCcw, FileText, FolderOpen } from "lucide-react";
import { ErrorRecoveryAction, generateRecoveryActions, logError } from "../lib/errorHandling";
import type { LocalizedError } from "../types";

interface ErrorDisplayProps {
  error: LocalizedError;
  onDismiss?: () => void;
  onRetry?: () => void;
  onReset?: () => void;
  onSelectNewFile?: () => void;
  onSelectNewDirectory?: () => void;
  showRecoveryActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function ErrorDisplay({
  error,
  onDismiss,
  onRetry,
  onReset,
  onSelectNewFile,
  onSelectNewDirectory,
  showRecoveryActions = true,
  compact = false,
  className = ""
}: ErrorDisplayProps) {
  // Log error when component mounts
  React.useEffect(() => {
    logError(error, "ErrorDisplay");
  }, [error]);

  // Get appropriate icon based on severity
  const getIcon = () => {
    switch (error.severity) {
      case "critical":
        return <XCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Get alert variant based on severity
  const getAlertVariant = () => {
    switch (error.severity) {
      case "critical":
      case "error":
        return "destructive";
      case "warning":
        return "default"; // Using default as there's no warning variant
      case "info":
        return "default";
      default:
        return "destructive";
    }
  };

  // Get severity badge
  const getSeverityBadge = () => {
    const severityLabels = {
      critical: "Kritisch",
      error: "Fehler",
      warning: "Warnung",
      info: "Information"
    };

    const severityColors = {
      critical: "bg-red-600 text-white",
      error: "bg-red-500 text-white",
      warning: "bg-yellow-500 text-white",
      info: "bg-blue-500 text-white"
    };

    return <Badge className={`text-xs ${severityColors[error.severity]}`}>{severityLabels[error.severity]}</Badge>;
  };

  // Generate recovery actions
  const recoveryActions = showRecoveryActions
    ? generateRecoveryActions(error, {
        ...(onRetry && { onRetry }),
        ...(onReset && { onReset }),
        ...(onSelectNewFile && { onSelectNewFile }),
        ...(onSelectNewDirectory && { onSelectNewDirectory })
      })
    : [];

  // Get action icon
  const getActionIcon = (action: ErrorRecoveryAction) => {
    if (action.label.includes("Wiederholen") || action.label.includes("Erneut")) {
      return <RefreshCw className="h-3 w-3 mr-1" />;
    }
    if (action.label.includes("Zurücksetzen")) {
      return <RotateCcw className="h-3 w-3 mr-1" />;
    }
    if (action.label.includes("Datei")) {
      return <FileText className="h-3 w-3 mr-1" />;
    }
    if (action.label.includes("Verzeichnis")) {
      return <FolderOpen className="h-3 w-3 mr-1" />;
    }
    return null;
  };

  if (compact) {
    return (
      <Alert variant={getAlertVariant()} className={`${className}`}>
        {getIcon()}
        <AlertDescription className="flex items-center justify-between">
          <span className="flex-1">{error.germanMessage}</span>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0 ml-2">
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant={getAlertVariant()} className={`${className}`}>
      {getIcon()}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <AlertTitle className="flex items-center gap-2">
            Fehler aufgetreten
            {getSeverityBadge()}
          </AlertTitle>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0">
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>

        <AlertDescription className="space-y-3">
          {/* Main error message */}
          <p className="font-medium">{error.germanMessage}</p>

          {/* Error details in development */}
          {import.meta.env.DEV && (
            <details className="text-xs bg-muted p-2 rounded">
              <summary className="cursor-pointer font-medium">Technische Details (nur in Entwicklung)</summary>
              <div className="mt-2 space-y-1">
                <div>
                  <strong>Code:</strong> {error.code}
                </div>
                <div>
                  <strong>Original:</strong> {error.message}
                </div>
                <div>
                  <strong>Zeit:</strong> {error.timestamp.toLocaleString("de-DE")}
                </div>
                {error.context && (
                  <div>
                    <strong>Kontext:</strong> {JSON.stringify(error.context, null, 2)}
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Recovery suggestions */}
          {error.recoverySuggestions && error.recoverySuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Lösungsvorschläge:</p>
              <ul className="text-sm space-y-1 ml-4">
                {error.recoverySuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-muted-foreground mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recovery actions */}
          {recoveryActions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.primary ? "default" : "outline"}
                  size="sm"
                  onClick={action.action}
                  className="text-xs"
                >
                  {getActionIcon(action)}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}

// Specialized error display components for common scenarios
export function ValidationErrorDisplay({
  errors,
  onDismiss
}: {
  errors: Record<string, LocalizedError[]>;
  onDismiss?: () => void;
}) {
  const errorCount = Object.values(errors).flat().length;

  if (errorCount === 0) return null;

  return (
    <Alert variant="destructive" className="space-y-2">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <AlertTitle>
            Eingabefehler ({errorCount} {errorCount === 1 ? "Fehler" : "Fehler"})
          </AlertTitle>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 w-6 p-0">
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>

        <AlertDescription>
          <div className="space-y-2">
            {Object.entries(errors).map(([field, fieldErrors]) => (
              <div key={field} className="space-y-1">
                <p className="font-medium text-sm capitalize">
                  {field === "pstFilePath" && "PST-Datei"}
                  {field === "emailsPerPdf" && "E-Mails pro PDF"}
                  {field === "baseFileName" && "Basis-Dateiname"}
                  {field === "outputDirectory" && "Ausgabeverzeichnis"}
                  {!["pstFilePath", "emailsPerPdf", "baseFileName", "outputDirectory"].includes(field) && field}:
                </p>
                {fieldErrors.map((error, index) => (
                  <p key={index} className="text-sm ml-4">
                    • {error.germanMessage}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </AlertDescription>
      </div>
    </Alert>
  );
}

// Processing error display with specific recovery actions
export function ProcessingErrorDisplay({
  error,
  onRetry,
  onReset,
  onDismiss
}: {
  error: LocalizedError;
  onRetry?: () => void;
  onReset?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <ErrorDisplay
      error={error}
      {...(onRetry && { onRetry })}
      {...(onReset && { onReset })}
      {...(onDismiss && { onDismiss })}
      showRecoveryActions={true}
    />
  );
}

// File selection error display
export function FileSelectionErrorDisplay({
  error,
  onSelectNewFile,
  onDismiss
}: {
  error: LocalizedError;
  onSelectNewFile?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <ErrorDisplay
      error={error}
      {...(onSelectNewFile && { onSelectNewFile })}
      {...(onDismiss && { onDismiss })}
      showRecoveryActions={true}
    />
  );
}
