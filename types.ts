export type FitzpatrickType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
export type SafetyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface NotificationAction {
  type: 'review' | 'callback' | 'escalate' | 'dismiss';
  timestamp: number;
  clinicianId?: string | undefined;
  notes?: string | undefined;
}

export interface ClinicianNotification {
  id: string;
  timestamp: number;
  safetyLevel: SafetyLevel;
  analysisId: string;
  patientId?: string | undefined;
  triggerReason: string;
  diagnosis?: string | undefined;
  riskLevel?: 'Low' | 'Medium' | 'High' | undefined;
  actions: NotificationAction[];
  status: 'pending' | 'acknowledged' | 'dismissed';
}

export interface ReasoningPatternMetadata {
  fitzpatrick?: FitzpatrickType;
  risk?: string;
  verified?: boolean;
  [key: string]: string | number | boolean | undefined;
}

// AgentDB library uses number for id, but we want string for internal use
export interface ReasoningPattern {
  id: number | undefined;
  taskType: string;
  context?: string; // Optional for generic patterns
  approach: string;
  outcome?: string; // Optional
  confidence?: number; // Optional
  successRate: number;
  timestamp: number;
  score?: number; // Similarity score for search results
  metadata?: ReasoningPatternMetadata;
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
  skin_tone?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'unknown' | undefined;
  confidence_threshold?: number | undefined;
}

export interface AgentAction {
  name: string;
  cost: number;
  preconditions: Partial<WorldState>;
  effects: Partial<WorldState>;
  description: string;
  agentId: string;
}

export interface ClinicianFeedback {
  id: string;
  analysisId: string;
  diagnosis: string;
  correctedDiagnosis?: string | undefined;
  confidence: number;
  notes: string;
  timestamp: number;
  fitzpatrickType?: FitzpatrickType | undefined;
  clinicianId?: string | undefined;
  isCorrection: boolean;
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  fitzpatrickType: FitzpatrickType;
  lesions: {
    type: string;
    confidence: number;
    risk: 'Low' | 'Medium' | 'High';
  }[];
  fairnessMetrics: {
    tpr: number;
    fpr: number;
    calibrationError: number;
  };
  recommendations: string[];
  signature: string;
  webVerification?: {
    verified: boolean;
    sources: { title: string; uri: string }[];
    summary: string;
  };
  securityContext?:
    | {
        encrypted?: boolean;
        algorithm: string;
        timestamp: number;
        iv: number[];
        payloadSize: number;
        ciphertext?: string | undefined;
      }
    | undefined;
  clinicianFeedback?: ClinicianFeedback;
}

export interface AgentLogEntry {
  id: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown> | undefined;
}

export interface ClinicalAnalysisResult {
  skinTone?: string;
  confidence?: number;
  lesions?: {
    type: string;
    confidence: number;
    heatmap?: string;
  }[];
  riskLevel?: string;
  recommendation?: string;
  fairnessMetrics?: unknown;
  similarCases?: unknown[];
  webVerification?: unknown;
  encryptedPayload?: string;
  auditHash?: string;
}

// AgentDB Pattern Types
export interface AgentDBPattern {
  id: string;
  taskType: string;
  context?: string;
  approach?: string;
  outcome?: string;
  confidence?: number;
  successRate?: number;
  timestamp: number;
  score?: number;
  metadata?: ReasoningPatternMetadata;
}

export interface FairnessStats {
  tpr: number;
  fpr: number;
  count: number;
}

export interface FeedbackStats {
  totalFeedback: number;
  corrections: number;
  confirmations: number;
  avgConfidence: number;
  byFitzpatrick: Record<FitzpatrickType, { count: number; corrections: number }>;
}

export interface AuditEventPayload {
  type: string;
  hash: string;
  prev_hash: string;
  agent_trace: string[];
  safety_level: 'LOW' | 'MEDIUM' | 'HIGH';
  [key: string]: unknown;
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
  skin_tone: undefined,
  confidence_threshold: undefined,
};

export type AgentEventType =
  | 'agent:start'
  | 'agent:complete'
  | 'agent:fail'
  | 'state:change'
  | 'plan:created'
  | 'plan:execute'
  | 'action:pre'
  | 'action:post'
  | 'error:occurred'
  | 'cleanup:requested'
  | 'replay:start'
  | 'replay:complete';

export interface AgentEventPayload {
  agentId: string;
  timestamp: number;
  data?: Record<string, unknown> | undefined;
  error?: Error | undefined;
}

export interface StateChangeEventPayload {
  prevState: WorldState;
  newState: WorldState;
  changedKeys: Array<keyof WorldState>;
}

export interface PlanEventPayload {
  plan: AgentAction[];
  startState: WorldState;
  goalState: Partial<WorldState>;
}

export interface ActionEventPayload {
  action: AgentAction;
  state: WorldState;
  duration?: number | undefined;
}

export interface EventMap {
  'agent:start': AgentEventPayload;
  'agent:complete': AgentEventPayload;
  'agent:fail': AgentEventPayload;
  'state:change': StateChangeEventPayload;
  'plan:created': PlanEventPayload;
  'plan:execute': PlanEventPayload;
  'action:pre': ActionEventPayload;
  'action:post': ActionEventPayload;
  'error:occurred': { error: Error; context?: Record<string, unknown> | undefined };
  'cleanup:requested': { reason?: string | undefined };
  'replay:start': { fromTime?: number | undefined; eventTypes?: AgentEventType[] | undefined };
  'replay:complete': { replayedEvents: number };
  [key: string]: unknown;
}

export type EventHandler<T = unknown> = (_payload: T) => void | Promise<void>;

export interface EventHistoryEntry<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

export interface EventBusConfig {
  maxHistorySize?: number | undefined;
  enableHistory?: boolean | undefined;
}

/**
 * Error Recovery Strategy Configuration
 * Defines how each agent should handle failures
 */
export interface RecoveryStrategy {
  critical: boolean; // Halt pipeline if true
  retry: boolean; // Attempt retry if true
  fallbackAgentId?: string | undefined; // Agent ID to fallback to
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * Recovery Strategies for each agent type
 * Configured per agent to enable graceful degradation
 */
export const RECOVERY_STRATEGIES: Record<string, RecoveryStrategy> = {
  // Quick checks - high availability, minimal retries
  'Image-Verification-Agent': {
    critical: true,
    retry: true,
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  // Skin tone detection - critical for calibration path
  'Skin-Tone-Detection-Agent': {
    critical: true,
    retry: true,
    maxRetries: 3,
    retryDelayMs: 2000,
  },
  // Calibration agents - can fallback between standard and safety
  'Standard-Calibration-Agent': {
    critical: false,
    retry: true,
    fallbackAgentId: 'Safety-Calibration-Agent',
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  'Safety-Calibration-Agent': {
    critical: false,
    retry: true,
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  // Image preprocessing - non-critical, can skip
  'Image-Preprocessing-Agent': {
    critical: false,
    retry: true,
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  // Segmentation - non-critical, can proceed with caution
  'Segmentation-Agent': {
    critical: false,
    retry: true,
    maxRetries: 3,
    retryDelayMs: 2000,
  },
  // Feature extraction - critical for downstream agents
  'Feature-Extraction-Agent': {
    critical: false,
    retry: true,
    maxRetries: 3,
    retryDelayMs: 2000,
  },
  // Lesion detection - most critical, with fallback path
  'Lesion-Detection-Agent': {
    critical: false,
    retry: true,
    maxRetries: 3,
    retryDelayMs: 3000,
  },
  // Similarity search - can use degraded results
  'Similarity-Search-Agent': {
    critical: false,
    retry: true,
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  // Risk assessment - critical for final output
  'Risk-Assessment-Agent': {
    critical: false,
    retry: true,
    maxRetries: 2,
    retryDelayMs: 2000,
  },
  // Fairness audit - non-critical, can proceed
  'Fairness-Audit-Agent': {
    critical: false,
    retry: true,
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  // Web verification - can use cached results
  'Web-Verification-Agent': {
    critical: false,
    retry: true,
    maxRetries: 2,
    retryDelayMs: 2000,
  },
  // Recommendations - non-critical, can use generic advice
  'Recommendation-Agent': {
    critical: false,
    retry: true,
    maxRetries: 2,
    retryDelayMs: 1000,
  },
  // Learning - non-critical, can be retried later
  'Learning-Agent': {
    critical: false,
    retry: false,
    maxRetries: 0,
    retryDelayMs: 0,
  },
  // Privacy encryption - critical for HIPAA
  'Privacy-Encryption-Agent': {
    critical: true,
    retry: true,
    maxRetries: 3,
    retryDelayMs: 1000,
  },
  // Audit trail - critical for compliance
  'Audit-Trail-Agent': {
    critical: true,
    retry: true,
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};
