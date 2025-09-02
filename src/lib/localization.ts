// German localization for all UI text
export const germanText = {
  // Application title and description
  appTitle: "PST E-Mail Merger",
  appDescription: "Wählen Sie eine PST-Datei aus und konfigurieren Sie die Verarbeitung",

  // Step labels
  steps: {
    fileSelection: "PST-Datei auswählen",
    configuration: "Konfiguration",
    processing: "Verarbeitung starten",
    progress: "Fortschritt"
  },

  // File selection
  fileSelection: {
    title: "PST-Datei auswählen",
    selectFile: "PST-Datei auswählen",
    fileSelected: "PST-Datei ausgewählt",
    dragDropText: "PST-Datei hierher ziehen oder klicken zum Auswählen",
    dragDropActive: "PST-Datei hier ablegen...",
    browseFiles: "Datei durchsuchen",
    fileReady: "PST-Datei bereit",
    selectDifferentFile: "Klicken Sie hier, um eine andere Datei auszuwählen",
    supportedFiles: "Nur PST-Dateien (.pst) werden unterstützt"
  },

  // Configuration form
  configuration: {
    title: "Konfiguration",
    emailsPerPdf: {
      label: "E-Mails pro PDF",
      description: "Anzahl der E-Mails, die in eine PDF-Datei zusammengefasst werden (1-25)",
      placeholder: "10"
    },
    baseFileName: {
      label: "Basis-Dateiname",
      description: "Grundname für die generierten PDF-Dateien (nur Buchstaben, Zahlen, _ und -)",
      placeholder: "z.B. emails_archiv"
    },
    outputDirectory: {
      label: "Ausgabeverzeichnis",
      description: "Wählen Sie das Verzeichnis aus, in dem die PDF-Dateien gespeichert werden sollen",
      placeholder: "Verzeichnis auswählen...",
      browse: "Durchsuchen",
      selecting: "Auswählen...",
      selected: "Verzeichnis ausgewählt",
      writable: "Schreibbar",
      fullPath: "Vollständiger Pfad:"
    },
    preview: {
      label: "Vorschau:",
      filename: "Dateiname-Vorschau"
    },
    status: {
      label: "Konfigurationsstatus:",
      ready: "Bereit",
      incomplete: "Unvollständig",
      allValid: "Alle Eingaben sind gültig. Sie können mit der Verarbeitung beginnen."
    }
  },

  // Process control
  processControl: {
    title: "Verarbeitung",
    startButton: "Verarbeitung starten",
    startButtonProcessing: "Verarbeitung läuft...",
    cancelButton: "Abbrechen",
    cancelDialog: {
      title: "Verarbeitung abbrechen?",
      description:
        "Sind Sie sicher, dass Sie die Verarbeitung abbrechen möchten? Bereits erstellte PDF-Dateien bleiben erhalten, aber der aktuelle Vorgang wird gestoppt und kann nicht fortgesetzt werden.",
      continue: "Fortsetzen",
      confirm: "Ja, abbrechen"
    },
    status: {
      notReady: "Bitte vervollständigen Sie alle Eingaben, um die Verarbeitung zu starten.",
      ready: "Alle Eingaben sind gültig. Bereit zum Starten der Verarbeitung.",
      processing: "Verarbeitung läuft. Sie können den Vorgang jederzeit abbrechen."
    }
  },

  // Progress display
  progress: {
    title: "Verarbeitungsfortschritt",
    percentage: "Fortschritt",
    badges: {
      error: "Fehler",
      completed: "Abgeschlossen",
      processing: "Verarbeitung läuft",
      ready: "Bereit"
    },
    stats: {
      total: "Gesamt",
      processed: "Verarbeitet",
      pdfs: "PDF-Dateien"
    },
    messages: {
      ready: "Bereit für Verarbeitung",
      starting: "Verarbeitung wird gestartet...",
      processing: "Verarbeitung läuft...",
      processingEmails: "Verarbeite E-Mail {processed} von {total}. Erstelle PDF {current}...",
      completed: "Verarbeitung erfolgreich abgeschlossen. {count} PDF-Dateien erstellt.",
      error: "Fehler: {error}",
      cancelled: "Verarbeitung abgebrochen"
    }
  },

  // Error messages
  errors: {
    title: "Fehler aufgetreten",
    inputErrors: "Eingabefehler",
    inputErrorsCount: "{count} {count, plural, one {Fehler} other {Fehler}}",
    technicalDetails: "Technische Details (nur in Entwicklung)",
    suggestions: "Lösungsvorschläge:",
    actions: {
      dismiss: "Schließen",
      retry: "Wiederholen",
      retryAgain: "Erneut versuchen",
      reset: "Zurücksetzen",
      selectNewFile: "Andere Datei wählen",
      selectNewDirectory: "Anderes Verzeichnis wählen"
    },
    fields: {
      pstFilePath: "PST-Datei",
      emailsPerPdf: "E-Mails pro PDF",
      baseFileName: "Basis-Dateiname",
      outputDirectory: "Ausgabeverzeichnis"
    }
  },

  // Error boundary
  errorBoundary: {
    title: "Anwendungsfehler",
    subtitle: "Ein unerwarteter Fehler ist aufgetreten",
    description:
      "Die Anwendung ist auf einen Fehler gestoßen und konnte nicht fortgesetzt werden. Dies ist ein technisches Problem, das behoben werden muss.",
    developmentDetails: "Entwicklungsdetails",
    showDetails: "Technische Fehlerdetails anzeigen",
    actions: {
      retry: "Erneut versuchen",
      reload: "Anwendung neu laden",
      report: "Fehlerbericht erstellen"
    },
    help: {
      tip: 'Tipp: Versuchen Sie zunächst "Erneut versuchen". Falls der Fehler weiterhin auftritt, laden Sie die Anwendung neu.',
      persistent:
        "Falls das Problem bestehen bleibt, erstellen Sie einen Fehlerbericht und wenden Sie sich an den Support.",
      errorId: "Fehler-ID:"
    },
    reportSuccess: "Fehlerbericht wurde in die Zwischenablage kopiert. Bitte senden Sie ihn an den Support.",
    reportFailed: "Fehlerbericht konnte nicht kopiert werden. Bitte machen Sie einen Screenshot dieser Seite."
  },

  // Development/Debug
  debug: {
    title: "Debug Information (Development Only)",
    currentStep: "Current Step:",
    selectedFile: "Selected File:",
    configValid: "Config Valid:",
    canStartProcessing: "Can Start Processing:",
    isProcessing: "Is Processing:",
    progressComplete: "Progress Complete:",
    none: "None",
    yes: "Yes",
    no: "No"
  },

  // Common UI elements
  common: {
    loading: "Laden...",
    saving: "Speichern...",
    cancel: "Abbrechen",
    confirm: "Bestätigen",
    close: "Schließen",
    ok: "OK",
    yes: "Ja",
    no: "Nein",
    continue: "Fortsetzen",
    back: "Zurück",
    next: "Weiter",
    finish: "Fertig",
    save: "Speichern",
    delete: "Löschen",
    edit: "Bearbeiten",
    view: "Anzeigen",
    download: "Herunterladen",
    upload: "Hochladen",
    search: "Suchen",
    filter: "Filtern",
    sort: "Sortieren",
    refresh: "Aktualisieren",
    settings: "Einstellungen",
    help: "Hilfe",
    about: "Über",
    version: "Version"
  },

  // Date and time formatting
  dateTime: {
    formats: {
      short: "dd.MM.yyyy",
      long: "dd. MMMM yyyy",
      time: "HH:mm",
      dateTime: "dd.MM.yyyy HH:mm",
      iso: "yyyy-MM-dd'T'HH:mm:ss"
    },
    relative: {
      now: "Jetzt",
      secondsAgo: "vor {seconds} Sekunden",
      minutesAgo: "vor {minutes} Minuten",
      hoursAgo: "vor {hours} Stunden",
      daysAgo: "vor {days} Tagen",
      weeksAgo: "vor {weeks} Wochen",
      monthsAgo: "vor {months} Monaten",
      yearsAgo: "vor {years} Jahren"
    }
  },

  // File size formatting
  fileSize: {
    bytes: "Bytes",
    kb: "KB",
    mb: "MB",
    gb: "GB",
    tb: "TB"
  },

  // Validation messages (used by Zod schemas)
  validation: {
    required: "Dieses Feld ist erforderlich",
    invalidType: "Ungültiger Datentyp",
    tooSmall: "Wert ist zu klein",
    tooBig: "Wert ist zu groß",
    invalidString: "Ungültige Zeichenkette",
    invalidNumber: "Ungültige Zahl",
    invalidEmail: "Ungültige E-Mail-Adresse",
    invalidUrl: "Ungültige URL",
    invalidDate: "Ungültiges Datum",
    custom: {
      pstFileRequired: "PST-Datei ist erforderlich",
      pstFileInvalid: "Datei muss eine PST-Datei sein",
      emailCountRange: "Anzahl muss zwischen 1 und 25 liegen",
      baseFileNameRequired: "Basis-Dateiname ist erforderlich",
      baseFileNameInvalid: "Dateiname darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten",
      outputDirectoryRequired: "Ausgabeverzeichnis ist erforderlich",
      outputDirectoryInvalid: "Ausgabeverzeichnis darf nicht leer sein"
    }
  }
} as const;

// Type for accessing nested properties safely
export type GermanTextKey = keyof typeof germanText;

// Helper function to get nested text with fallback
export function getGermanText(key: string, fallback?: string): string {
  const keys = key.split(".");
  let current: any = germanText;

  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = current[k];
    } else {
      return fallback || key;
    }
  }

  return typeof current === "string" ? current : fallback || key;
}

// Helper function for pluralization
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

// Helper function for string interpolation
export function interpolate(template: string, values: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

// Format file size in German
export function formatFileSize(bytes: number): string {
  const sizes = [
    germanText.fileSize.bytes,
    germanText.fileSize.kb,
    germanText.fileSize.mb,
    germanText.fileSize.gb,
    germanText.fileSize.tb
  ];

  if (bytes === 0) return `0 ${sizes[0]}`;

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

// Format date in German locale
export function formatDate(date: Date, format: "short" | "long" | "time" | "dateTime" = "short"): string {
  const options: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case "short":
      options.day = "2-digit";
      options.month = "2-digit";
      options.year = "numeric";
      break;
    case "long":
      options.day = "numeric";
      options.month = "long";
      options.year = "numeric";
      break;
    case "time":
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
    case "dateTime":
      options.day = "2-digit";
      options.month = "2-digit";
      options.year = "numeric";
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
  }

  return date.toLocaleDateString("de-DE", options);
}
