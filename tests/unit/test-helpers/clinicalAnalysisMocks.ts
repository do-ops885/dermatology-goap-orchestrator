// Shared test mocks and helpers for useClinicalAnalysis tests
// This file extracts common mock definitions to reduce code duplication and keep test files under 500 LOC

import { vi } from 'vitest';

import { INITIAL_STATE, type WorldState } from '../../../types';

import type React from 'react';

/**
 * Creates a valid test image file with JPEG header
 */
export const createValidFile = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], 'test.jpg', {
    type: 'image/jpeg',
  });

/**
 * Mock React hooks for testing
 */
export const mockReact = () => {
  return {
    useTransition: () => [false, (cb: () => void) => cb()] as const,
    useDeferredValue: (value: unknown) => value,
  };
};

/**
 * Mock image processing utilities
 */
export const mockImageProcessing = () => ({
  default: {
    optimizeImage: vi.fn().mockResolvedValue('base64-image'),
    calculateImageHash: vi.fn().mockResolvedValue('hash123'),
    validateImageSignature: vi.fn().mockResolvedValue(true),
  },
  optimizeImage: vi.fn().mockResolvedValue('base64-image'),
  calculateImageHash: vi.fn().mockResolvedValue('hash123'),
  validateImageSignature: vi.fn().mockResolvedValue(true),
});

/**
 * Mock AgentDB service
 */
export const mockAgentDB = () => {
  const mockEmbeddingService = {
    initialize: vi.fn().mockResolvedValue(undefined),
    embed: vi.fn().mockResolvedValue(new Float32Array(384)),
  };
  const mockReasoningBank = {
    addPattern: vi.fn().mockResolvedValue(undefined),
    searchSimilar: vi.fn().mockResolvedValue([]),
  };
  const mockLocalLLMService = {
    initialize: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn().mockResolvedValue('test response'),
    unload: vi.fn(),
  };
  const createDatabaseMock = vi.fn().mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return {
      setReasoningBank: vi.fn(),
      getFairnessMetrics: vi.fn().mockReturnValue({}),
      addCase: vi.fn().mockResolvedValue(undefined),
      searchCases: vi.fn().mockResolvedValue([]),
      patterns: { bulkAdd: vi.fn() },
      execute: vi.fn().mockResolvedValue([]),
    };
  });

  const MockAgentDB = {
    getInstance: vi.fn().mockImplementation(() => ({
      setReasoningBank: vi.fn(),
      getFairnessMetrics: vi.fn().mockReturnValue({}),
      addCase: vi.fn().mockResolvedValue(undefined),
      searchCases: vi.fn().mockResolvedValue([]),
    })),
  };

  return {
    AgentDB: MockAgentDB,
    createDatabase: createDatabaseMock,
    EmbeddingService: vi.fn().mockImplementation(() => mockEmbeddingService),
    ReasoningBank: vi.fn().mockImplementation(() => mockReasoningBank),
    LocalLLMService: vi.fn().mockImplementation(() => mockLocalLLMService),
  };
};

/**
 * Mock crypto service
 */
export const mockCrypto = () => {
  const mockCryptoKey = {
    type: 'private' as const,
    extractable: true,
    algorithm: { name: 'AES-GCM' } as KeyAlgorithm,
    usages: ['encrypt', 'decrypt'] as const,
  } as unknown as CryptoKey;

  return {
    CryptoService: {
      generateEphemeralKey: vi.fn().mockResolvedValue(mockCryptoKey),
      encryptData: vi.fn().mockResolvedValue({
        ciphertext: new ArrayBuffer(16),
        iv: new Uint8Array(12),
      }),
      generateHash: vi.fn().mockResolvedValue('testhash'),
      arrayBufferToBase64: vi.fn().mockReturnValue('base64string'),
    },
  };
};

/**
 * Mock vision service
 */
export const mockVision = () => {
  const mockVisionInstance = {
    initialize: vi.fn().mockResolvedValue(undefined),
    detectSkinTone: vi.fn().mockResolvedValue({
      fitzpatrick: 'III',
      confidence: 0.85,
    }),
    extractFeatures: vi.fn().mockResolvedValue({
      embeddings: new Float32Array(384),
      bias_score: 0.1,
      disentanglement_index: 0.9,
    }),
    detectLesions: vi
      .fn()
      .mockResolvedValue([{ type: 'Melanoma', confidence: 0.75, bbox: [0, 0, 100, 100] }]),
  };

  return {
    VisionSpecialist: {
      getInstance: vi.fn().mockReturnValue(mockVisionInstance),
    },
    instance: mockVisionInstance,
  };
};

/**
 * Mock router agent
 */
export const mockRouter = () => ({
  RouterAgent: {
    getInstance: vi.fn().mockImplementation(() => ({
      route: vi.fn().mockReturnValue('VISION_ANALYSIS'),
      getRequiredSpecialist: vi.fn().mockReturnValue('Vision-Specialist-MobileNetV3'),
    })),
  },
});

/**
 * Mock logger service
 */
export const mockLogger = () => {
  const logFn = vi.fn().mockImplementation(function () {});
  return {
    Logger: {
      info: logFn,
      warn: logFn,
      error: logFn,
      log: logFn,
      debug: logFn,
    },
  };
};

/**
 * Mock Google GenAI service
 */
export const mockGoogleGenAI = () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: { text: () => 'test response' },
  });
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  }
  return { GoogleGenAI: MockGoogleGenAI };
};

/**
 * Mock GOAP agent
 */
export const mockGoapAgent = (mockExecute?: (...args: unknown[]) => Promise<unknown>) => {
  const invokeAgentCallbacks = (ctx?: {
    onAgentStart?: (_action: unknown) => string | void;
    onAgentEnd?: (
      _action: unknown,
      _record: { status: string; metadata?: Record<string, unknown> },
    ) => void;
  }) => {
    const action = {
      agentId: 'Image-Verification-Agent',
      name: 'verify-image',
      description: 'Verify Image',
    };
    const uiLogId = ctx?.onAgentStart?.(action);
    ctx?.onAgentEnd?.(action, { status: 'completed', metadata: { uiLogId } });
  };

  const mockGoapExecute =
    mockExecute ||
    vi.fn().mockImplementation(async function (..._args: unknown[]) {
      const ctx = _args[2] as Parameters<typeof invokeAgentCallbacks>[0];
      invokeAgentCallbacks(ctx);
      return {
        runId: 'run_test',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        agents: [],
        finalWorldState: { ...INITIAL_STATE, audit_logged: true },
      };
    });

  class MockGoapAgent {
    execute = mockGoapExecute;
  }
  return {
    GoapAgent: MockGoapAgent,
    mockExecute: mockGoapExecute,
  };
};

/**
 * Create a mock execution trace for testing
 */
export const createMockTrace = (
  override?: Partial<{
    runId: string;
    startTime: number;
    endTime: number;
    agents: Array<{
      id: string;
      agentId: string;
      name: string;
      startTime: number;
      endTime: number;
      status: 'completed' | 'in_progress' | 'failed';
    }>;
    finalWorldState: WorldState;
  }>,
) => ({
  runId: 'run_test123',
  startTime: Date.now(),
  endTime: Date.now() + 1000,
  agents: [
    {
      id: 'agent1',
      agentId: 'Image-Verification-Agent',
      name: 'verify-image',
      startTime: Date.now(),
      endTime: Date.now() + 500,
      status: 'completed' as const,
    },
  ],
  finalWorldState: { ...INITIAL_STATE, audit_logged: true },
  ...override,
});

/**
 * Setup all common mocks for useClinicalAnalysis tests
 */
export const setupAllMocks = () => {
  vi.mock('react', async () => {
    const actualReact = await vi.importActual<typeof React>('react');
    return {
      ...actualReact,
      ...mockReact(),
    };
  });

  vi.mock('../../../services/utils/imageProcessing', () => ({
    optimizeImage: vi.fn().mockResolvedValue('base64-image'),
    calculateImageHash: vi.fn().mockResolvedValue('hash123'),
    validateImageSignature: vi.fn().mockResolvedValue(true),
  }));

  vi.mock('../../../services/agentDB', () => mockAgentDB());

  vi.mock('../../../services/crypto', () => mockCrypto());

  vi.mock('../../../services/vision', () => mockVision());

  vi.mock('../../../services/router', () => mockRouter());

  vi.mock('../../../services/logger', () => mockLogger());

  vi.mock('@google/genai', () => mockGoogleGenAI());
};

/**
 * Mock URL APIs for testing
 */
export const mockURLAPIs = () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
};
