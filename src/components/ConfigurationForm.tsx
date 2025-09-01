import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { FolderOpen, Settings, AlertCircle, CheckCircle } from "lucide-react";
import { ProcessingConfig, processingConfigSchema, type ProcessingConfigInput } from "../types";

interface ConfigurationFormProps {
  onConfigChange: (config: ProcessingConfig) => void;
  disabled?: boolean;
  initialConfig?: Partial<ProcessingConfig>;
}

export function ConfigurationForm({ onConfigChange, disabled = false, initialConfig }: ConfigurationFormProps) {
  const [isSelectingDirectory, setIsSelectingDirectory] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  // Initialize form with react-hook-form and Zod validation
  const form = useForm<ProcessingConfigInput>({
    resolver: zodResolver(processingConfigSchema),
    defaultValues: {
      pstFilePath: initialConfig?.pstFilePath || "",
      emailsPerPdf: initialConfig?.emailsPerPdf || 10,
      baseFileName: initialConfig?.baseFileName || "",
      outputDirectory: initialConfig?.outputDirectory || ""
    },
    mode: "onChange" // Validate on change for real-time feedback
  });

  const { watch, setValue, formState } = form;
  const watchedValues = watch();

  // Handle directory selection
  const handleDirectorySelect = async () => {
    if (disabled) return;

    setIsSelectingDirectory(true);
    setDirectoryError(null);

    try {
      const result = await invoke<string | null>("select_directory");

      if (result) {
        setValue("outputDirectory", result, {
          shouldValidate: true,
          shouldDirty: true
        });
        setDirectoryError(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setDirectoryError(errorMessage);
    } finally {
      setIsSelectingDirectory(false);
    }
  };

  // Handle form submission and validation
  const handleFormChange = (data: ProcessingConfigInput) => {
    const validation = processingConfigSchema.safeParse(data);

    if (validation.success) {
      onConfigChange(validation.data);
    }
  };

  // Watch for form changes and notify parent
  React.useEffect(() => {
    const subscription = form.watch(data => {
      handleFormChange(data as ProcessingConfigInput);
    });

    return () => subscription.unsubscribe();
  }, [form.watch, onConfigChange]);

  // Get display name from directory path
  const getDirectoryName = (dirPath: string): string => {
    return dirPath.split(/[\\/]/).pop() || dirPath;
  };

  // Generate filename preview
  const generateFilenamePreview = (baseName: string): string => {
    if (!baseName) return "";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return `${timestamp}_${baseName}_001.pdf`;
  };

  const isFormValid = formState.isValid && !directoryError;

  return (
    <Card className={`transition-opacity ${disabled ? "opacity-50" : ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Konfiguration
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            {/* Email Count Input */}
            <FormField
              control={form.control}
              name="emailsPerPdf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mails pro PDF</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={25}
                      disabled={disabled}
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Anzahl der E-Mails, die in eine PDF-Datei zusammengefasst werden (1-25)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Base Filename Input */}
            <FormField
              control={form.control}
              name="baseFileName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Basis-Dateiname</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. emails_archiv" disabled={disabled} {...field} className="w-full" />
                  </FormControl>
                  <FormDescription>
                    Grundname für die generierten PDF-Dateien (nur Buchstaben, Zahlen, _ und -)
                  </FormDescription>
                  {watchedValues.baseFileName && (
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">Vorschau:</p>
                      <p className="text-sm font-mono">{generateFilenamePreview(watchedValues.baseFileName)}</p>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Output Directory Selection */}
            <FormField
              control={form.control}
              name="outputDirectory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ausgabeverzeichnis</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="Verzeichnis auswählen..."
                          disabled={true}
                          value={field.value ? getDirectoryName(field.value) : ""}
                          className="flex-1"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDirectorySelect}
                        disabled={disabled || isSelectingDirectory}
                        className="shrink-0"
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        {isSelectingDirectory ? "Auswählen..." : "Durchsuchen"}
                      </Button>
                    </div>

                    {field.value && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">Verzeichnis ausgewählt</span>
                        <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
                          Schreibbar
                        </Badge>
                      </div>
                    )}

                    {field.value && (
                      <p className="text-xs text-muted-foreground break-all">Vollständiger Pfad: {field.value}</p>
                    )}
                  </div>
                  <FormDescription>
                    Wählen Sie das Verzeichnis aus, in dem die PDF-Dateien gespeichert werden sollen
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Directory Selection Error */}
            {directoryError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{directoryError}</AlertDescription>
              </Alert>
            )}

            {/* Configuration Status */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Konfigurationsstatus:</span>
                <Badge variant={isFormValid ? "default" : "secondary"}>
                  {isFormValid ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Bereit
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unvollständig
                    </>
                  )}
                </Badge>
              </div>

              {isFormValid && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Alle Eingaben sind gültig. Sie können mit der Verarbeitung beginnen.
                </div>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
