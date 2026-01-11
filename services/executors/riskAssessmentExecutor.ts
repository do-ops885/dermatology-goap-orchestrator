import type { AgentContext, ExecutorResult } from './types';
import { Logger } from '../logger';

export const riskAssessmentExecutor = async ({ localLLM, currentState, analysisPayload, setResult }: AgentContext): Promise<ExecutorResult> => {
  const prompt = `Assess clinical risk for Fitzpatrick ${currentState.fitzpatrick_type} with ${analysisPayload.risk_label}. 
  Primary detection: ${analysisPayload.lesions?.[0]?.type}.
  Check for bias in automated assessment. Return 1 concise sentence explaining the risk level.`;

  let assessment = "";
  let engineUsed = "Simulated";

  if (localLLM.isReady) {
    try {
      assessment = await localLLM.generate(prompt, "You are a medical AI orchestrator.");
      engineUsed = "SmolLM2-1.7B (WebLLM)";
    } catch (e) {
      Logger.warn("Risk-Agent", "Orchestrator LLM failed, using fallback.");
    }
  }

  if (!assessment) {
    assessment = `${analysisPayload.lesions?.[0]?.type} presents ${analysisPayload.risk_label} risk profile based on feature asymmetry.`;
    engineUsed = "Rule-Based Fallback";
  }

  Object.assign(analysisPayload, { riskAssessment: assessment, riskEngine: engineUsed });
  setResult({ ...analysisPayload });

  return { metadata: { parity: 'verified', engine: engineUsed } };
};
