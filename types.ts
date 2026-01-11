export type FitzpatrickType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
export type SafetyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface NotificationAction {
  type: 'review' | 'callback' | 'escalate' | 'dismiss';
  timestamp: number;
  clinicianId?: string;
  notes?: string;
}

export interface ClinicianNotification {
  id: string;
  timestamp: number;
  safetyLevel: SafetyLevel;
  analysisId: string;
  patientId?: string;
  triggerReason: string;
  diagnosis?: string;
  riskLevel?: 'Low' | 'Medium' | 'High';
  actions: NotificationAction[];
  status: 'pending' | 'acknowledged' | 'dismissed';
}

export interface ReasoningPattern {
  id: string;
  taskType: string;
  context?: string; // Optional for generic patterns
  approach?: string; // Optional
  outcome?: string; // Optional
  confidence?: number; // Optional
  successRate?: number; // Alias for confidence/success metric
  timestamp: number;
  score?: number; // Similarity score for search results
  metadata?: {
    fitzpatrick?: FitzpatrickType;
    risk?: string;
    verified?: boolean;
    [key: string]: any;
  };
}

export interface FeatureMetadata {
  agentId: string;
  bias_score: number;
  disentanglement_index: number;
  fairness_validated: boolean;
  fitzpatrick: FitzpatrickType | null;
  model: string;
}

export interface WorldState {
  image_verified: boolean;
  skin_tone_detected: boolean;
  fitzpatrick_type: FitzpatrickType | null;
  image_preprocessed: boolean;
  segmentation_complete: boolean;
  features_extracted: boolean;
  lesions_detected: boolean;
  fairness_validated: boolean;
  similarity_searched: boolean;
  risk_assessed: boolean;
  web_verified: boolean;
  recommendations_generated: boolean;
  learning_updated: boolean;
  data_encrypted: boolean;
  audit_logged: boolean;
  confidence_score: number;
  fairness_score: number;
  is_low_confidence: boolean;
  safety_calibrated: boolean;
  calibration_complete: boolean;
}

export interface AgentAction {
  name: string;
  cost: number;
  preconditions: Partial<WorldState>;
  effects: Partial<WorldState>;
  description: string;
  agentId: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  fitzpatrickType: FitzpatrickType;
  lesions: Array<{
    type: string;
    confidence: number;
    risk: 'Low' | 'Medium' | 'High';
  }>;
  fairnessMetrics: {
    tpr: number;
    fpr: number;
    calibrationError: number;
  };
  recommendations: string[];
  signature: string;
  webVerification?: {
    verified: boolean;
    sources: Array<{ title: string; uri: string }>;
    summary: string;
  };
  securityContext?: {
    encrypted: boolean;
    algorithm: string;
    timestamp: number;
    iv: number[]; // Array from Uint8Array
    payloadSize: number;
    ciphertext?: string; // Base64 encoded ciphertext
  };
}

export interface AgentLogEntry {
  id: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export const INITIAL_STATE: WorldState = {
  image_verified: false,
  skin_tone_detected: false,
  fitzpatrick_type: null,
  image_preprocessed: false,
  segmentation_complete: false,
  features_extracted: false,
  lesions_detected: false,
  fairness_validated: false,
  similarity_searched: false,
  risk_assessed: false,
  web_verified: false,
  recommendations_generated: false,
  learning_updated: false,
  data_encrypted: false,
  audit_logged: false,
  confidence_score: 0,
  fairness_score: 0,
  is_low_confidence: false,
  safety_calibrated: false,
  calibration_complete: false,
};