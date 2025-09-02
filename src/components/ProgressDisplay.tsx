import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ProcessingProgress } from "../types";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { ProcessingErrorDisplay } from "./ErrorDisplay";
import { mapBackendErrorToGerman } from "../lib/errorHandling";

interface ProgressDisplayProps {
  progress: ProcessingProgress;
  isProcessing: boolean;
  onRetry?: () => void;
  onReset?: () => void;
}

export function ProgressDisplay({ progress, isProcessing, onRetry, onReset }: ProgressDisplayProps) {
  // Calculate progress percentage
  const progressPercentage =
    progress.totalEmails > 0 ? Math.round((progress.processedEmails / progress.totalEmails) * 100) : 0;

  // Determine status badge variant and icon
  const getStatusBadge = () => {
    if (progress.error) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Fehler
        </Badge>
      );
    }

    if (progress.isComplete) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3" />
          Abgeschlossen
        </Badge>
      );
    }

    if (isProcessing) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Verarbeitung läuft
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <FileText className="h-3 w-3" />
        Bereit
      </Badge>
    );
  };

  // Get status message in German
  const getStatusMessage = () => {
    if (progress.error) {
      return `Fehler: ${progress.error}`;
    }

    if (progress.isComplete) {
      return `Verarbeitung erfolgreich abgeschlossen. ${progress.currentPdf} PDF-Dateien erstellt.`;
    }

    if (isProcessing) {
      if (progress.totalEmails > 0) {
        return `Verarbeite E-Mail ${progress.processedEmails} von ${progress.totalEmails}. Erstelle PDF ${progress.currentPdf}...`;
      }
      return progress.status || "Verarbeitung läuft...";
    }

    return "Bereit für Verarbeitung";
  };

  // Determine alert variant based on status
  const getAlertVariant = () => {
    if (progress.error) return "destructive";
    if (progress.isComplete) return "default";
    return "default";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Verarbeitungsfortschritt</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Fortschritt</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="w-full h-2" />
        </div>

        {/* Email Progress Details */}
        {progress.totalEmails > 0 && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-muted-foreground">Gesamt</div>
              <div className="text-lg font-semibold">{progress.totalEmails}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-muted-foreground">Verarbeitet</div>
              <div className="text-lg font-semibold text-blue-600">{progress.processedEmails}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-muted-foreground">PDF-Dateien</div>
              <div className="text-lg font-semibold text-green-600">{progress.currentPdf}</div>
            </div>
          </div>
        )}

        {/* Status Message or Error Display */}
        {progress.error ? (
          <ProcessingErrorDisplay
            error={mapBackendErrorToGerman(progress.error)}
            {...(onRetry && { onRetry })}
            {...(onReset && { onReset })}
          />
        ) : (
          <Alert variant={getAlertVariant()}>
            <AlertDescription className="text-sm">{getStatusMessage()}</AlertDescription>
          </Alert>
        )}

        {/* Additional Status Information */}
        {progress.status && progress.status !== getStatusMessage() && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>Status:</strong> {progress.status}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
