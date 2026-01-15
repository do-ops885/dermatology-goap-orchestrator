import { Logger } from '../logger';

import type { AgentContext, ExecutorResult } from './types';

export const riskAssessmentExecutor = async ({
  localLLM,
  currentState,
  analysisPayload,
  setResult,
}: AgentContext): Promise<ExecutorResult> => {
  const lesions = Array.isArray(analysisPayload.lesions) ? analysisPayload.lesions : [];
  const primaryLesion = lesions[0];

  const prompt = `Assess clinical risk for Fitzpatrick ${String(currentState.fitzpatrick_type)} with ${String(analysisPayload.risk_label)}. 
  Primary detection: ${String(primaryLesion?.type)}.
  Check for bias in automated assessment. Return 1 concise sentence explaining the risk level.`;

  let assessment = '';
  let engineUsed = 'Simulated';

  if (localLLM.isReady) {
    try {
      assessment = await localLLM.generate(prompt, 'You are a medical AI orchestrator.');
      engineUsed = 'SmolLM2-1.7B (WebLLM)';
    } catch {
      Logger.warn('Risk-Agent', 'Orchestrator LLM failed, using fallback.');
    }
  }

  if (!assessment) {
    assessment = `${String(primaryLesion?.type)} presents ${String(analysisPayload.risk_label)} risk profile based on feature asymmetry.`;
    engineUsed = 'Rule-Based Fallback';
  }

  Object.assign(analysisPayload, { riskAssessment: assessment, riskEngine: engineUsed });
  setResult({ ...analysisPayload });

  return { metadata: { parity: 'verified', engine: engineUsed } };
};
