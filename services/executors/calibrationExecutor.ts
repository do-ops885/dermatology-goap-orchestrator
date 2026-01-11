import type { AgentContext, ExecutorResult } from './types';

export const calibrationExecutor = async ({ currentState }: AgentContext): Promise<ExecutorResult> => {
  if (currentState.safety_calibrated) {
    await new Promise(r => setTimeout(r, 800));
    return { metadata: { mode: 'conservative', threshold: '0.50', bias_correction: 'max_sensitivity' } };
  }
  await new Promise(r => setTimeout(r, 600));
  return { metadata: { mode: 'optimal', threshold: '0.65' } };
};
