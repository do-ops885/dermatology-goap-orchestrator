/**
 * Runtime validation schemas using Zod for enhanced security.
 */

import { z } from 'zod';

// File upload validation schema
export const FileUploadSchema = z.object({
  name: z
    .string()
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid file name format'),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Only JPEG, PNG, and WebP images are supported' }),
  }),
  size: z.number().max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
  lastModified: z.number().optional(),
});

// World state validation schema
export const WorldStateSchema = z.object({
  image_verified: z.boolean(),
  skin_tone_detected: z.boolean(),
  fitzpatrick_type: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']).nullable(),
  image_preprocessed: z.boolean(),
  segmentation_complete: z.boolean(),
  features_extracted: z.boolean(),
  lesions_detected: z.boolean(),
  fairness_validated: z.boolean(),
  similarity_searched: z.boolean(),
  risk_assessed: z.boolean(),
  web_verified: z.boolean(),
  recommendations_generated: z.boolean(),
  learning_updated: z.boolean(),
  data_encrypted: z.boolean(),
  audit_logged: z.boolean(),
  confidence_score: z.number().min(0).max(1),
  fairness_score: z.number().min(0).max(1),
  is_low_confidence: z.boolean(),
  safety_calibrated: z.boolean(),
  calibration_complete: z.boolean(),
});

// Consent state validation schema
export const ConsentStateSchema = z.object({
  localProcessing: z.boolean().default(true), // Always true - local processing is required
  cloudGemini: z.boolean().default(false), // For skin tone detection
  offlineAnalysis: z.boolean().default(false), // For local-only mode
  dataStorage: z.boolean().default(true), // For IndexedDB
  analytics: z.boolean().default(false), // For anonymous telemetry
  timestamp: z.number().default(() => Date.now()),
  userId: z.string().optional(), // Anonymous user ID for consent tracking
});

// Analysis result validation schema
export const AnalysisResultSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().min(0),
  fitzpatrickType: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']),
  lesions: z.array(
    z.object({
      type: z.string(),
      confidence: z.number().min(0).max(1),
      risk: z.enum(['Low', 'Medium', 'High']),
    }),
  ),
  fairnessMetrics: z.object({
    tpr: z.number().min(0).max(1),
    fpr: z.number().min(0).max(1),
    calibrationError: z.number().min(0).max(1),
  }),
  recommendations: z.array(z.string()),
  signature: z.string(),
  webVerification: z
    .object({
      verified: z.boolean(),
      sources: z.array(
        z.object({
          title: z.string(),
          uri: z.string(),
        }),
      ),
      summary: z.string(),
    })
    .optional(),
  securityContext: z
    .object({
      encrypted: z.boolean().optional(),
      algorithm: z.string(),
      timestamp: z.number(),
      iv: z.array(z.number()),
      payloadSize: z.number(),
      ciphertext: z.string().optional(),
    })
    .optional(),
  clinicianFeedback: z
    .object({
      id: z.string(),
      analysisId: z.string(),
      diagnosis: z.string(),
      correctedDiagnosis: z.string().optional(),
      confidence: z.number().min(0).max(1),
      notes: z.string(),
      timestamp: z.number(),
      fitzpatrickType: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']).optional(),
      clinicianId: z.string().optional(),
      isCorrection: z.boolean(),
    })
    .optional(),
});

// PII redaction validation schema
export const PIIRedactionOptionsSchema = z.object({
  maskPhone: z.boolean().default(true),
  maskEmail: z.boolean().default(true),
  maskSSN: z.boolean().default(true),
  maskDOB: z.boolean().default(true),
  customPatterns: z.array(z.instanceof(RegExp)).optional(),
});

// Validation helper functions
export const ValidationService = {
  /**
   * Validates file upload data with detailed error messages.
   */
  validateFileUpload(
    data: unknown,
  ):
    | { success: true; data: z.infer<typeof FileUploadSchema> }
    | { success: false; errors: string[] } {
    const result = FileUploadSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
  },

  /**
   * Validates world state data.
   */
  validateWorldState(
    data: unknown,
  ):
    | { success: true; data: z.infer<typeof WorldStateSchema> }
    | { success: false; errors: string[] } {
    const result = WorldStateSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
  },

  /**
   * Validates consent state data.
   */
  validateConsentState(
    data: unknown,
  ):
    | { success: true; data: z.infer<typeof ConsentStateSchema> }
    | { success: false; errors: string[] } {
    const result = ConsentStateSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
  },

  /**
   * Validates analysis result data.
   */
  validateAnalysisResult(
    data: unknown,
  ):
    | { success: true; data: z.infer<typeof AnalysisResultSchema> }
    | { success: false; errors: string[] } {
    const result = AnalysisResultSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
  },

  /**
   * Validates PII redaction options.
   */
  validatePIIRedactionOptions(
    data: unknown,
  ):
    | { success: true; data: z.infer<typeof PIIRedactionOptionsSchema> }
    | { success: false; errors: string[] } {
    const result = PIIRedactionOptionsSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
  },
};

// Export type inference
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type WorldStateValidated = z.infer<typeof WorldStateSchema>;
export type ConsentState = z.infer<typeof ConsentStateSchema>;
export type AnalysisResultValidated = z.infer<typeof AnalysisResultSchema>;
export type PIIRedactionOptions = z.infer<typeof PIIRedactionOptionsSchema>;
