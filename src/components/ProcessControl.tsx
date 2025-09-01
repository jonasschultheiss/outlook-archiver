import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "./ui/alert-dialog";
import { Play, Square, AlertTriangle } from "lucide-react";

interface ProcessControlProps {
  onStart: () => void;
  onCancel: () => void;
  canStart: boolean;
  isProcessing: boolean;
}

export function ProcessControl({ onStart, onCancel, canStart, isProcessing }: ProcessControlProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleStart = () => {
    if (!canStart || isProcessing) return;
    onStart();
  };

  const handleCancelConfirm = () => {
    onCancel();
    setShowCancelDialog(false);
  };

  const handleCancelDialog = () => {
    setShowCancelDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Verarbeitung
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex gap-3">
          {/* Start Button */}
          <Button onClick={handleStart} disabled={!canStart || isProcessing} className="flex-1" size="lg">
            <Play className="h-4 w-4 mr-2" />
            {isProcessing ? "Verarbeitung läuft..." : "Verarbeitung starten"}
          </Button>

          {/* Cancel Button with AlertDialog */}
          {isProcessing && (
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg">
                  <Square className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Verarbeitung abbrechen?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Sind Sie sicher, dass Sie die Verarbeitung abbrechen möchten? Bereits erstellte PDF-Dateien bleiben
                    erhalten, aber der aktuelle Vorgang wird gestoppt und kann nicht fortgesetzt werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleCancelDialog}>Fortsetzen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelConfirm}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Ja, abbrechen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Status Information */}
        <div className="mt-4 text-sm text-muted-foreground">
          {!canStart && !isProcessing && (
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Bitte vervollständigen Sie alle Eingaben, um die Verarbeitung zu starten.
            </p>
          )}
          {canStart && !isProcessing && (
            <p className="text-green-600">Alle Eingaben sind gültig. Bereit zum Starten der Verarbeitung.</p>
          )}
          {isProcessing && (
            <p className="text-blue-600">Verarbeitung läuft. Sie können den Vorgang jederzeit abbrechen.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
