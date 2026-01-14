import type { AgentContext, ExecutorResult } from './types';

export const segmentationExecutor = async ({
  currentState,
}: AgentContext): Promise<ExecutorResult> => {
  await new Promise((r) => setTimeout(r, 500));
  return { metadata: { threshold: currentState.safety_calibrated ? 0.55 : 0.65 } };
};
