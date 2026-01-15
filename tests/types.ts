// Test-specific type definitions to avoid explicit 'any' usage

export interface MockAnalysisResult {
  id: string;
  timestamp: number;
  fitzpatrickType: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
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
    encrypted?: boolean;
    algorithm: string;
    timestamp: number;
    iv: number[];
    payloadSize: number;
    ciphertext?: string;
  };
  // Optional fields that may be added for specific test cases
  fairness?: number;
  differential_diagnosis?: string[];
  riskAssessment?: string;
  reasoning?: string;
  riskEngine?: string;
  similarCases?: Array<{
    outcome?: string;
    context?: string;
    taskType?: string;
    score?: number;
  }>;
}

export interface MockSimilarCase {
  outcome?: string;
  context?: string;
  taskType?: string;
  score?: number;
}

export interface MockWebSource {
  title: string;
  uri: string;
}

export interface MockBlobParts {
  parts: unknown[];
  options: { type?: string } | unknown;
}

export interface MockAgentDBInstance {
  storeClinicianFeedback: () => Promise<void>;
}

export interface MockCreateObjectURLCall {
  0: Blob;
  [key: number]: unknown;
}
