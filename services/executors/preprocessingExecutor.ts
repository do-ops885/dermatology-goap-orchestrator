import type { ExecutorResult } from './types';

export const preprocessingExecutor = async (): Promise<ExecutorResult> => {
  await new Promise(r => setTimeout(r, 400));
  return { metadata: { method: 'melanin_preserving_normalization' } };
};
