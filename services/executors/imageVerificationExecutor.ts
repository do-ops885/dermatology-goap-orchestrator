import type { AgentContext, ExecutorResult } from './types';

export const imageVerificationExecutor = async ({ imageHash }: AgentContext): Promise<ExecutorResult> => {
  await new Promise(r => setTimeout(r, 400));
  return { metadata: { method: 'SHA-256 + Ed25519', hash: imageHash.substring(0, 16) + '...' } };
};
