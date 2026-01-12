import { GoogleGenAI } from '@google/genai';
import AgentDB, { ReasoningBank, LocalLLMService } from '../agentDB';
import type { VisionSpecialist } from '../vision';
import { RouterAgent } from '../router';
import { WorldState } from '../../types';

export interface AgentExecutor {
  agentId: string;
  cost: number;
  execute(context: AgentContext): Promise<ExecutorResult>;
}

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
  setResult: (res: any) => void;
  setWarning: (msg: string | null) => void;
  analysisPayload: any;
  encryptionKey: CryptoKey | null;
  lastAuditHashRef: { current: string };
  privacyMode: boolean;
}

export interface ExecutorResult {
  metadata: Record<string, any>;
  newStateUpdates?: Partial<WorldState>;
  shouldReplan?: boolean;
}

export const cleanAndParseJSON = (text: string | undefined): any => {
  if (!text) return {};
  try {
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    return {};
  }
};

export const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => { resolve(img); };
    img.onerror = reject;
  });
};
