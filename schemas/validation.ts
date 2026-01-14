import { z } from 'zod';
import type { FitzpatrickType } from '../types';

export const FitzpatrickTypeSchema = z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']);

export const WorldStateSchema = z.object({
  image_verified: z.boolean(),
  skin_tone_detected: z.boolean(),
  fitzpatrick_type: FitzpatrickTypeSchema.nullable(),
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

export type WorldState = z.infer<typeof WorldStateSchema>;

export const FileUploadSchema = z.object({
  name: z
    .string()
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().max(10 * 1024 * 1024),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;

export const AgentLogSchema = z.object({
  id: z.string().uuid(),
  agent: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  message: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentLog = z.infer<typeof AgentLogSchema>;

export const AnalysisResultSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number(),
  fitzpatrickType: FitzpatrickTypeSchema,
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
  recommendations: z.array(z.string().max(25)),
  signature: z.string(),
  webVerification: z
    .object({
      verified: z.boolean(),
      sources: z.array(
        z.object({
          title: z.string(),
          uri: z.string().url(),
        }),
      ),
      summary: z.string(),
    })
    .optional(),
  securityContext: z
    .object({
      encrypted: z.boolean(),
      algorithm: z.string(),
      timestamp: z.number(),
      iv: z.array(z.number()),
      payloadSize: z.number(),
      ciphertext: z.string().optional(),
    })
    .optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const SafetyLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export type SafetyLevel = z.infer<typeof SafetyLevelSchema>;
