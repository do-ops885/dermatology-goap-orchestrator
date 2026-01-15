import type { WorldState, AgentAction, ClinicalAnalysisResult } from '../../types';
import type { Dispatch, SetStateAction } from 'react';
import type { ReasoningBank, LocalLLMService } from '../agentDB';
import type AgentDB from '../agentDB';
import type { ExecutionAgentRecord } from '../goap/agent';
import type { RouterAgent } from '../router';
import type { VisionSpecialist } from '../vision';
import type { GoogleGenAI } from '@google/genai';

export type { ClinicalAnalysisResult };

export interface AgentContext {
  ai: GoogleGenAI;
  reasoningBank: ReasoningBank;
  agentDB: AgentDB;
  localLLM: LocalLLMService;
  visionSpecialist: VisionSpecialist;
  router: RouterAgent;
  file: File;
  base64Image: string;
  imageHash: string;
  currentState: WorldState;
  actionTrace: string[];
  setResult: Dispatch<SetStateAction<ClinicalAnalysisResult | null>>;
  setWarning: (_msg: string | null) => void;
  analysisPayload: Record<string, unknown>;
  encryptionKey: CryptoKey | null;
  lastAuditHashRef: { current: string };
  privacyMode: boolean;
  _action?: AgentAction;
  onAgentStart?: (_action: AgentAction) => string | void;
  onAgentEnd?: (_action: AgentAction, _record: ExecutionAgentRecord) => void;
}

export interface ExecutorResult {
  metadata: Record<string, unknown>;
  newStateUpdates?: Partial<WorldState>;
  shouldReplan?: boolean;
}

export const cleanAndParseJSON = (text: string | undefined): Record<string, unknown> => {
  if (text === undefined) return {};
  try {
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanText) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      resolve(img);
    };
    img.onerror = reject;
  });
};
