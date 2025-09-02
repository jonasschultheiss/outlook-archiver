import { useState, useCallback, useEffect } from "react";
import "./styles/globals.css";
import { FileSelector } from "./components/FileSelector";
import { ConfigurationForm } from "./components/ConfigurationForm";
import { ProcessControl } from "./components/ProcessControl";
import { ProgressDisplay } from "./components/ProgressDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Separator } from "./components/ui/separator";
import { ProcessingConfig, ProcessingProgress } from "./types";
import { TypographyH1 } from "./components/typography-h1";
import { TypographyP } from "./components/typography-p";

function App() {
  // File selection state
  const [selectedFile, setSelectedFile] = useState<string>("");

  // Configuration state
  const [config, setConfig] = useState<ProcessingConfig | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    totalEmails: 0,
    processedEmails: 0,
    currentPdf: 0,
    status: "Bereit für Verarbeitung",
    isComplete: false
  });

  // Application state for UI flow control
  const [currentStep, setCurrentStep] = useState<"file" | "config" | "process" | "progress">("file");

  // File selection handler
  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    // Reset configuration when file changes
    setConfig(null);
    // Reset progress when file changes
    setProgress({
      totalEmails: 0,
      processedEmails: 0,
      currentPdf: 0,
      status: "Bereit für Verarbeitung",
      isComplete: false
    });
    // Move to configuration step
    setCurrentStep("config");
  }, []);

  // Configuration change handler
  const handleConfigChange = useCallback(
    (newConfig: ProcessingConfig) => {
      // Update the config with the selected PST file
      const updatedConfig = {
        ...newConfig,
        pstFilePath: selectedFile
      };
      setConfig(updatedConfig);
      // Move to process step when config is complete
      if (updatedConfig.baseFileName && updatedConfig.outputDirectory && updatedConfig.emailsPerPdf > 0) {
        setCurrentStep("process");
      }
    },
    [selectedFile]
  );

  // Processing start handler
  const handleStartProcessing = useCallback(() => {
    if (!config) return;

    setIsProcessing(true);
    setCurrentStep("progress");
    setProgress(prev => {
      const { error, ...rest } = prev;
      return {
        ...rest,
        status: "Verarbeitung wird gestartet...",
        isComplete: false
      };
    });

    // TODO: Implement actual processing logic in future tasks
    console.log("Starting processing with config:", config);
  }, [config]);

  // Processing cancel handler
  const handleCancelProcessing = useCallback(() => {
    setIsProcessing(false);
    setCurrentStep("process");
    setProgress(prev => ({
      ...prev,
      status: "Verarbeitung abgebrochen",
      isComplete: false,
      error: "Verarbeitung wurde vom Benutzer abgebrochen"
    }));

    // TODO: Implement actual cancellation logic in future tasks
    console.log("Processing cancelled");
  }, []);

  // Determine if processing can start
  const canStartProcessing = Boolean(
    config &&
      config.pstFilePath &&
      config.baseFileName &&
      config.outputDirectory &&
      config.emailsPerPdf > 0 &&
      !isProcessing
  );

  // Reset to file selection when no file is selected
  useEffect(() => {
    if (!selectedFile) {
      setCurrentStep("file");
      setConfig(null);
    }
  }, [selectedFile]);

  // Handle processing completion
  useEffect(() => {
    if (progress.isComplete || progress.error) {
      setIsProcessing(false);
    }
  }, [progress.isComplete, progress.error]);

  return (
    <main className="container mx-auto p-6 max-w-4xl min-h-screen">
      <Card className="w-full shadow-lg">
        <CardHeader className="text-center pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <CardTitle>
            <TypographyH1>PST E-Mail Merger</TypographyH1>
          </CardTitle>
          <TypographyP className="text-muted-foreground">
            Wählen Sie eine PST-Datei aus und konfigurieren Sie die Verarbeitung
          </TypographyP>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Step 1: File Selection Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep === "file"
                    ? "bg-blue-600 text-white"
                    : selectedFile
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                1
              </div>
              <h2 className="text-lg font-semibold">PST-Datei auswählen</h2>
            </div>
            <FileSelector onFileSelect={handleFileSelect} selectedFile={selectedFile} disabled={isProcessing} />
          </section>

          {selectedFile && (
            <>
              <Separator className="my-6" />

              {/* Step 2: Configuration Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      currentStep === "config"
                        ? "bg-blue-600 text-white"
                        : config
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    2
                  </div>
                  <h2 className="text-lg font-semibold">Konfiguration</h2>
                </div>
                <ConfigurationForm
                  onConfigChange={handleConfigChange}
                  disabled={isProcessing}
                  initialConfig={{
                    pstFilePath: selectedFile,
                    emailsPerPdf: 10,
                    baseFileName: "",
                    outputDirectory: ""
                  }}
                />
              </section>
            </>
          )}

          {config && (
            <>
              <Separator className="my-6" />

              {/* Step 3: Process Control Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      currentStep === "process"
                        ? "bg-blue-600 text-white"
                        : isProcessing || progress.isComplete
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    3
                  </div>
                  <h2 className="text-lg font-semibold">Verarbeitung starten</h2>
                </div>
                <ProcessControl
                  onStart={handleStartProcessing}
                  onCancel={handleCancelProcessing}
                  canStart={canStartProcessing}
                  isProcessing={isProcessing}
                />
              </section>
            </>
          )}

          {(isProcessing || progress.isComplete || progress.error) && (
            <>
              <Separator className="my-6" />

              {/* Step 4: Progress Display Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      currentStep === "progress"
                        ? "bg-blue-600 text-white"
                        : progress.isComplete
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    4
                  </div>
                  <h2 className="text-lg font-semibold">Fortschritt</h2>
                </div>
                <ProgressDisplay progress={progress} isProcessing={isProcessing} />
              </section>
            </>
          )}

          {/* Application State Summary for Development */}
          {import.meta.env.DEV && (
            <>
              <Separator className="my-6" />
              <details className="text-xs text-muted-foreground bg-muted p-4 rounded">
                <summary className="cursor-pointer font-medium">Debug Information (Development Only)</summary>
                <div className="mt-2 space-y-1">
                  <div>Current Step: {currentStep}</div>
                  <div>Selected File: {selectedFile || "None"}</div>
                  <div>Config Valid: {config ? "Yes" : "No"}</div>
                  <div>Can Start Processing: {canStartProcessing ? "Yes" : "No"}</div>
                  <div>Is Processing: {isProcessing ? "Yes" : "No"}</div>
                  <div>Progress Complete: {progress.isComplete ? "Yes" : "No"}</div>
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default App;
