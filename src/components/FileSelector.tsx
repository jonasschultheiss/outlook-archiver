import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Upload, File, CheckCircle } from "lucide-react";
import { ErrorDisplay } from "./ErrorDisplay";
import { logError } from "../lib/errorHandling";
import type { LocalizedError } from "../types";

interface FileSelectorProps {
  onFileSelect: (filePath: string) => void;
  selectedFile?: string;
  disabled?: boolean;
}

export function FileSelector({ onFileSelect, selectedFile, disabled = false }: FileSelectorProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<LocalizedError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate PST file
  const validatePstFile = useCallback((file: File): LocalizedError | null => {
    const timestamp = new Date();

    // Check file extension
    if (!file.name.toLowerCase().endsWith(".pst")) {
      return {
        code: "INVALID_FILE_EXTENSION",
        message: "File must be a PST file",
        germanMessage: "Datei muss eine PST-Datei sein (.pst)",
        severity: "error",
        recoverable: true,
        recoverySuggestions: [
          "Wählen Sie eine Datei mit der Erweiterung .pst aus",
          "Überprüfen Sie, ob es sich um eine Microsoft Outlook PST-Datei handelt"
        ],
        context: { fileName: file.name, fileSize: file.size },
        timestamp
      };
    }

    // Check file size (basic validation - not empty)
    if (file.size === 0) {
      return {
        code: "PST_FILE_EMPTY",
        message: "PST file is empty or corrupted",
        germanMessage: "PST-Datei ist leer oder beschädigt",
        severity: "error",
        recoverable: true,
        recoverySuggestions: [
          "Wählen Sie eine andere PST-Datei aus",
          "Überprüfen Sie, ob die Datei nicht beschädigt ist",
          "Stellen Sie sicher, dass die Datei vollständig heruntergeladen wurde"
        ],
        context: { fileName: file.name, fileSize: file.size },
        timestamp
      };
    }

    // Additional size check - PST files are typically at least a few KB
    if (file.size < 1024) {
      return {
        code: "PST_FILE_TOO_SMALL",
        message: "PST file seems too small",
        germanMessage: "PST-Datei scheint zu klein zu sein",
        severity: "warning",
        recoverable: true,
        recoverySuggestions: [
          "Überprüfen Sie, ob es sich um eine vollständige PST-Datei handelt",
          "Wählen Sie eine andere PST-Datei aus, falls verfügbar"
        ],
        context: { fileName: file.name, fileSize: file.size },
        timestamp
      };
    }

    return null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validatePstFile(file);

      if (validationError) {
        setError(validationError);
        logError(validationError, "FileSelector");
        return;
      }

      setError(null);
      // In web browsers, File objects don't have a path property
      // We'll use the name for now, but in a Tauri app we might need to handle this differently
      onFileSelect(file.name);
    },
    [validatePstFile, onFileSelect]
  );

  // Handle drag events
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set drag over to false if we're leaving the component entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);

      if (files.length === 0) {
        const noFileError: LocalizedError = {
          code: "NO_FILE_DETECTED",
          message: "No file detected",
          germanMessage: "Keine Datei erkannt",
          severity: "warning",
          recoverable: true,
          recoverySuggestions: [
            "Versuchen Sie, die Datei erneut zu ziehen",
            "Klicken Sie stattdessen auf 'Datei durchsuchen'"
          ],
          timestamp: new Date()
        };
        setError(noFileError);
        logError(noFileError, "FileSelector");
        return;
      }

      if (files.length > 1) {
        const multipleFilesError: LocalizedError = {
          code: "MULTIPLE_FILES_SELECTED",
          message: "Multiple files selected",
          germanMessage: "Bitte wählen Sie nur eine PST-Datei aus",
          severity: "warning",
          recoverable: true,
          recoverySuggestions: [
            "Ziehen Sie nur eine einzelne PST-Datei",
            "Wählen Sie die gewünschte Datei einzeln aus"
          ],
          context: { fileCount: files.length },
          timestamp: new Date()
        };
        setError(multipleFilesError);
        logError(multipleFilesError, "FileSelector");
        return;
      }

      const firstFile = files[0];
      if (firstFile) {
        handleFileSelect(firstFile);
      }
    },
    [disabled, handleFileSelect]
  );

  // Handle click to select file
  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;

      if (!files || files.length === 0) return;

      const firstFile = files[0];
      if (firstFile) {
        handleFileSelect(firstFile);
      }
    },
    [handleFileSelect]
  );

  // Get display name from file path
  const getFileName = (filePath: string): string => {
    return filePath.split(/[\\/]/).pop() || filePath;
  };

  return (
    <div className="space-y-4">
      <Card
        className={`
          transition-all duration-200 cursor-pointer border-2 border-dashed
          ${isDragOver && !disabled ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-muted/50"}
          ${selectedFile ? "border-green-500 bg-green-50/50" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg font-medium flex items-center justify-center gap-2">
            {selectedFile ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                PST-Datei ausgewählt
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                PST-Datei auswählen
              </>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {selectedFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{getFileName(selectedFile)}</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                PST-Datei bereit
              </Badge>
              <p className="text-xs text-muted-foreground">Klicken Sie hier, um eine andere Datei auszuwählen</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {isDragOver && !disabled
                    ? "PST-Datei hier ablegen..."
                    : "PST-Datei hierher ziehen oder klicken zum Auswählen"}
                </p>
              </div>

              <Button variant="outline" size="sm" disabled={disabled} className="mx-auto">
                <File className="h-4 w-4 mr-2" />
                Datei durchsuchen
              </Button>

              <p className="text-xs text-muted-foreground">Nur PST-Dateien (.pst) werden unterstützt</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={() => setError(null)}
          onSelectNewFile={() => {
            setError(null);
            handleClick();
          }}
          compact={true}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pst"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
