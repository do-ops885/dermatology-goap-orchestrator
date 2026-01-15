import { vi } from 'vitest';

import { INITIAL_STATE } from '../../types';

import type { AgentContext } from '../../services/executors/types';
import type { WorldState } from '../../types';

export const createMockAgentContext = (overrides: Partial<AgentContext> = {}): AgentContext => ({
  ai: {} as any,
  reasoningBank: {
    storePattern: vi.fn().mockResolvedValue(undefined),
    retrievePatterns: vi.fn().mockResolvedValue([]),
  } as any,
  agentDB: {} as any,
  localLLM: {
    generate: vi.fn().mockResolvedValue(''),
    unload: vi.fn(),
  } as any,
  visionSpecialist: {} as any,
  router: {} as any,
  file: new File([''], 'test.jpg', { type: 'image/jpeg' }),
  base64Image: 'data:image/jpeg;base64,test',
  imageHash: 'mock-hash',
  currentState: { ...INITIAL_STATE },
  actionTrace: [],
  setResult: vi.fn(),
  setWarning: vi.fn(),
  analysisPayload: {},
  encryptionKey: null,
  lastAuditHashRef: { current: '' },
  privacyMode: false,
  ...overrides,
});

export const createMockWorldState = (overrides: Partial<WorldState> = {}): WorldState => ({
  ...INITIAL_STATE,
  ...overrides,
});
