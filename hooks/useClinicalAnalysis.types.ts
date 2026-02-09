import type { ExecutionTrace } from '../services/goap/agent';
import type { RouterAgent } from '../services/router';
import type { VisionSpecialist } from '../services/vision';
import type { AgentLogEntry, WorldState, AgentAction } from '../types';
import type React from 'react';

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

export interface UseClinicalAnalysisReturn {
  file: File | null;
  preview: string | null;
  logs: AgentLogEntry[];
  worldState: WorldState;
  result: ClinicalAnalysisResult | null;
  error: string | null;
  warning: string | null;
  modelProgress: { text: string; percent: number } | null;
  analyzing: boolean;
  dbReady: boolean;
  isPending: boolean;
  pending: boolean;
  searchQuery: string;
  setSearchQuery: (_query: string) => void;
  handleFileChange: (_event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  executeAnalysis: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  } | null>;
  privacyMode: boolean;
  setPrivacyMode: (_mode: boolean) => void;
  action: (_formData: FormData) => void;
  actionState: null;
  trace: ExecutionTrace | null;
  currentAgent: string | undefined;
}

export interface AnalysisContext {
  ai: unknown;
  agentDB: unknown;
  reasoningBank: unknown;
  localLLM: unknown;
  visionSpecialist: ReturnType<typeof VisionSpecialist.getInstance>;
  router: RouterAgent;
  file: File;
  base64Image: string;
  imageHash: string;
  currentState: WorldState;
  setResult: React.Dispatch<React.SetStateAction<ClinicalAnalysisResult | null>>;
  setWarning: React.Dispatch<React.SetStateAction<string | null>>;
  analysisPayload: Record<string, unknown>;
  encryptionKey: CryptoKey | null;
  lastAuditHashRef: React.MutableRefObject<string>;
  privacyMode: boolean;
  actionTrace: string[];
  onAgentStart: (_agentAction: AgentAction) => string;
  onAgentEnd: (
    _agentAction: AgentAction,
    _agentRecord: { status: string; metadata?: Record<string, unknown> },
  ) => void;
}
