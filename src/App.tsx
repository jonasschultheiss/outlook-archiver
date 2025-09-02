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
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { mapBackendErrorToGerman, logError } from "./lib/errorHandling";
import { germanText } from "./lib/localization";
import type { LocalizedError } from "./types";

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
    status: germanText.progress.messages.ready,
    isComplete: false
  });

  // Application state for UI flow control
  const [currentStep, setCurrentStep] = useState<"file" | "config" | "process" | "progress">("file");

  // Global error state
  const [globalError, setGlobalError] = useState<LocalizedError | null>(null);

  // File selection handler
  const handleFileSelect = useCallback((filePath: string) => {
    try {
      setSelectedFile(filePath);
      setGlobalError(null); // Clear any global errors
      // Reset configuration when file changes
      setConfig(null);
      // Reset progress when file changes
      setProgress({
        totalEmails: 0,
        processedEmails: 0,
        currentPdf: 0,
        status: germanText.progress.messages.ready,
        isComplete: false
      });
      // Move to configuration step
      setCurrentStep("config");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const localizedError = mapBackendErrorToGerman(errorMessage);
      setGlobalError(localizedError);
      logError(localizedError, "App");
    }
  }, []);

  // Configuration change handler
  const handleConfigChange = useCallback(
    (newConfig: ProcessingConfig) => {
      try {
        // Update the config with the selected PST file
        const updatedConfig = {
          ...newConfig,
          pstFilePath: selectedFile
        };
        setConfig(updatedConfig);
        setGlobalError(null); // Clear any global errors
        // Move to process step when config is complete
        if (updatedConfig.baseFileName && updatedConfig.outputDirectory && updatedConfig.emailsPerPdf > 0) {
          setCurrentStep("process");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const localizedError = mapBackendErrorToGerman(errorMessage);
        setGlobalError(localizedError);
        logError(localizedError, "App");
      }
    },
    [selectedFile]
  );

  // Processing start handler
  const handleStartProcessing = useCallback(() => {
    if (!config) return;

    try {
      setIsProcessing(true);
      setCurrentStep("progress");
      setGlobalError(null); // Clear any global errors
      setProgress(prev => {
        const { error, ...rest } = prev;
        return {
          ...rest,
          status: germanText.progress.messages.starting,
          isComplete: false
        };
      });

      // TODO: Implement actual processing logic in future tasks
      console.log("Starting processing with config:", config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const localizedError = mapBackendErrorToGerman(errorMessage);
      setGlobalError(localizedError);
      logError(localizedError, "App");
      setIsProcessing(false);
    }
  }, [config]);

  // Processing cancel handler
  const handleCancelProcessing = useCallback(() => {
    try {
      setIsProcessing(false);
      setCurrentStep("process");
      setProgress(prev => ({
        ...prev,
        status: germanText.progress.messages.cancelled,
        isComplete: false,
        error: germanText.progress.messages.cancelled
      }));

      // TODO: Implement actual cancellation logic in future tasks
      console.log("Processing cancelled");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const localizedError = mapBackendErrorToGerman(errorMessage);
      setGlobalError(localizedError);
      logError(localizedError, "App");
    }
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

  // Reset application state
  const handleReset = useCallback(() => {
    setSelectedFile("");
    setConfig(null);
    setIsProcessing(false);
    setGlobalError(null);
    setProgress({
      totalEmails: 0,
      processedEmails: 0,
      currentPdf: 0,
      status: germanText.progress.messages.ready,
      isComplete: false
    });
    setCurrentStep("file");
  }, []);

  // Retry processing
  const handleRetry = useCallback(() => {
    if (config) {
      handleStartProcessing();
    }
  }, [config, handleStartProcessing]);

  return (
    <ErrorBoundary>
      <main className="container mx-auto p-6 max-w-4xl min-h-screen">
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <CardTitle>
              <TypographyH1>{germanText.appTitle}</TypographyH1>
            </CardTitle>
            <TypographyP className="text-muted-foreground">{germanText.appDescription}</TypographyP>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            {/* Global Error Display */}
            {globalError && (
              <ErrorDisplay
                error={globalError}
                onDismiss={() => setGlobalError(null)}
                onReset={handleReset}
                onRetry={handleRetry}
              />
            )}
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
                <h2 className="text-lg font-semibold">{germanText.steps.fileSelection}</h2>
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
                    <h2 className="text-lg font-semibold">{germanText.steps.configuration}</h2>
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
                    <h2 className="text-lg font-semibold">{germanText.steps.processing}</h2>
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
                    <h2 className="text-lg font-semibold">{germanText.steps.progress}</h2>
                  </div>
                  <ProgressDisplay
                    progress={progress}
                    isProcessing={isProcessing}
                    onRetry={handleRetry}
                    onReset={handleReset}
                  />
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
    </ErrorBoundary>
  );
}

export default App;
