import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { createErrorBoundaryError, logError } from "../lib/errorHandling";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | undefined;
  errorInfo: ErrorInfo | undefined;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: ""
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using our error handling system
    const localizedError = createErrorBoundaryError(error, errorInfo.componentStack || undefined);
    logError(localizedError, "ErrorBoundary");

    // Store error info in state
    this.setState({
      errorInfo
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In development, also log to console for debugging
    if (import.meta.env.DEV) {
      console.group("🚨 React Error Boundary");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Component Stack:", errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: ""
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;

    // Create error report data
    const errorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      },
      componentStack: errorInfo?.componentStack,
      appVersion: import.meta.env["VITE_APP_VERSION"] || "unknown"
    };

    // In a real app, you would send this to your error reporting service
    console.log("Error Report:", errorReport);

    // For now, copy to clipboard
    navigator.clipboard
      .writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert("Fehlerbericht wurde in die Zwischenablage kopiert. Bitte senden Sie ihn an den Support.");
      })
      .catch(() => {
        alert("Fehlerbericht konnte nicht kopiert werden. Bitte machen Sie einen Screenshot dieser Seite.");
      });
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-destructive">Anwendungsfehler</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ein unerwarteter Fehler ist aufgetreten</AlertTitle>
                <AlertDescription>
                  Die Anwendung ist auf einen Fehler gestoßen und konnte nicht fortgesetzt werden. Dies ist ein
                  technisches Problem, das behoben werden muss.
                </AlertDescription>
              </Alert>

              {/* Error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertTitle>Entwicklungsdetails</AlertTitle>
                  <AlertDescription>
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">Technische Fehlerdetails anzeigen</summary>
                      <div className="mt-2 p-3 bg-muted rounded text-xs font-mono space-y-2">
                        <div>
                          <strong>Fehler:</strong> {this.state.error.name}
                        </div>
                        <div>
                          <strong>Nachricht:</strong> {this.state.error.message}
                        </div>
                        <div>
                          <strong>Fehler-ID:</strong> {this.state.errorId}
                        </div>
                        {this.state.error.stack && (
                          <div>
                            <strong>Stack Trace:</strong>
                            <pre className="mt-1 whitespace-pre-wrap text-xs">{this.state.error.stack}</pre>
                          </div>
                        )}
                        {this.state.errorInfo?.componentStack && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="mt-1 whitespace-pre-wrap text-xs">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {/* Recovery actions */}
              <div className="space-y-4">
                <h3 className="font-semibold">Was können Sie tun?</h3>

                <div className="grid gap-3">
                  <Button onClick={this.handleRetry} className="w-full" size="lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Erneut versuchen
                  </Button>

                  <Button onClick={this.handleReload} variant="outline" className="w-full" size="lg">
                    <Home className="h-4 w-4 mr-2" />
                    Anwendung neu laden
                  </Button>

                  <Button onClick={this.handleReportError} variant="secondary" className="w-full" size="lg">
                    <Bug className="h-4 w-4 mr-2" />
                    Fehlerbericht erstellen
                  </Button>
                </div>
              </div>

              {/* Help text */}
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Tipp:</strong> Versuchen Sie zunächst "Erneut versuchen". Falls der Fehler weiterhin auftritt,
                  laden Sie die Anwendung neu.
                </p>
                <p>
                  Falls das Problem bestehen bleibt, erstellen Sie einen Fehlerbericht und wenden Sie sich an den
                  Support.
                </p>
                <p className="text-xs">
                  Fehler-ID: <code className="bg-muted px-1 rounded">{this.state.errorId}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for using error boundary in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // This would typically throw the error to be caught by the nearest error boundary
    // For now, we'll log it and show an alert
    const localizedError = createErrorBoundaryError(error, errorInfo?.componentStack || undefined);
    logError(localizedError, "useErrorHandler");

    // In development, also throw to trigger error boundary
    if (import.meta.env.DEV) {
      throw error;
    }
  };
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} {...(onError && { onError })}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
