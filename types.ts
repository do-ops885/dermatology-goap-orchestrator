export type FitzpatrickType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export interface ReasoningPattern {
  id: string;
  taskType: string;
  context: string; // e.g. "Fitzpatrick V, Lesion on arm"
  approach: string; // e.g. "Used safety calibration"
  outcome: string;
  confidence: number;
  timestamp: number;
  score?: number; // Similarity score for search results
  metadata?: {
    fitzpatrick: FitzpatrickType;
    risk: string;
    verified: boolean;
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