import { z } from "zod";

// Core data interfaces
export interface ProcessingConfig {
  pstFilePath: string;
  emailsPerPdf: number;
  baseFileName: string;
  outputDirectory: string;
}

export interface ProcessingProgress {
  totalEmails: number;
  processedEmails: number;
  currentPdf: number;
  status: string;
  isComplete: boolean;
  error?: string;
}

export interface PstInfo {
  filePath: string;
  emailCount: number;
  isValid: boolean;
}

export interface Email {
  subject: string;
  sender: string;
  recipient: string;
  date: string;
  body: string;
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  size: number;
  contentType: string;
}

// Zod validation schemas with German error messages
export const processingConfigSchema = z.object({
  pstFilePath: z
    .string()
    .min(1, "PST-Datei ist erforderlich")
    .refine(path => path.toLowerCase().endsWith(".pst"), "Datei muss eine PST-Datei sein"),

  emailsPerPdf: z
    .number({
      message: "Anzahl muss eine Zahl sein"
    })
    .min(1, "Mindestens 1 E-Mail pro PDF erforderlich")
    .max(25, "Maximal 25 E-Mails pro PDF erlaubt")
    .default(10),

  baseFileName: z
    .string()
    .min(1, "Basis-Dateiname ist erforderlich")
    .regex(/^[a-zA-Z0-9_-]+$/, "Dateiname darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten"),

  outputDirectory: z
    .string()
    .min(1, "Ausgabeverzeichnis ist erforderlich")
    .refine(path => path.trim().length > 0, "Ausgabeverzeichnis darf nicht leer sein")
});

// Additional validation schemas
export const pstInfoSchema = z.object({
  filePath: z.string().min(1, "Dateipfad ist erforderlich"),
  emailCount: z.number().min(0, "E-Mail-Anzahl muss positiv sein"),
  isValid: z.boolean()
});

export const attachmentSchema = z.object({
  name: z.string().min(1, "Anhang-Name ist erforderlich"),
  size: z.number().min(0, "Anhang-Größe muss positiv sein"),
  contentType: z.string().min(1, "Content-Type ist erforderlich")
});

export const emailSchema = z.object({
  subject: z.string().default(""),
  sender: z.string().min(1, "Absender ist erforderlich"),
  recipient: z.string().min(1, "Empfänger ist erforderlich"),
  date: z.string().min(1, "Datum ist erforderlich"),
  body: z.string().default(""),
  attachments: z.array(attachmentSchema).optional()
});

export const processingProgressSchema = z.object({
  totalEmails: z.number().min(0, "Gesamt-E-Mails muss positiv sein"),
  processedEmails: z.number().min(0, "Verarbeitete E-Mails muss positiv sein"),
  currentPdf: z.number().min(0, "Aktuelle PDF-Nummer muss positiv sein"),
  status: z.string().min(1, "Status ist erforderlich"),
  isComplete: z.boolean(),
  error: z.string().optional()
});

// Type inference from Zod schemas for type safety
export type ProcessingConfigInput = z.input<typeof processingConfigSchema>;
export type ProcessingConfigOutput = z.output<typeof processingConfigSchema>;
export type PstInfoType = z.infer<typeof pstInfoSchema>;
export type EmailType = z.infer<typeof emailSchema>;
export type AttachmentType = z.infer<typeof attachmentSchema>;
export type ProcessingProgressType = z.infer<typeof processingProgressSchema>;

// Form validation helper types
export type ValidationErrors = {
  [K in keyof ProcessingConfig]?: string[];
};

// German error message mapping for common validation scenarios
export const germanErrorMessages = {
  required: "Dieses Feld ist erforderlich",
  invalidType: "Ungültiger Datentyp",
  tooSmall: "Wert ist zu klein",
  tooBig: "Wert ist zu groß",
  invalidString: "Ungültige Zeichenkette",
  invalidNumber: "Ungültige Zahl",
  invalidBoolean: "Ungültiger Boolean-Wert",
  invalidDate: "Ungültiges Datum",
  invalidEmail: "Ungültige E-Mail-Adresse",
  invalidUrl: "Ungültige URL",
  invalidPath: "Ungültiger Dateipfad",
  fileNotFound: "Datei nicht gefunden",
  accessDenied: "Zugriff verweigert",
  diskFull: "Nicht genügend Speicherplatz",
  processingCancelled: "Verarbeitung abgebrochen",
  unknownError: "Unbekannter Fehler aufgetreten"
} as const;

// Helper function to transform Zod errors to German messages
export function transformZodError(error: z.ZodError<any>): ValidationErrors {
  const errors: ValidationErrors = {};

  error.issues.forEach((err: z.ZodIssue) => {
    const path = err.path.join(".") as keyof ProcessingConfig;
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path]!.push(err.message);
  });

  return errors;
}

// Type guards for runtime type checking
export function isProcessingConfig(obj: unknown): obj is ProcessingConfig {
  return processingConfigSchema.safeParse(obj).success;
}

export function isPstInfo(obj: unknown): obj is PstInfo {
  return pstInfoSchema.safeParse(obj).success;
}

export function isEmail(obj: unknown): obj is Email {
  return emailSchema.safeParse(obj).success;
}

export function isProcessingProgress(obj: unknown): obj is ProcessingProgress {
  return processingProgressSchema.safeParse(obj).success;
}
