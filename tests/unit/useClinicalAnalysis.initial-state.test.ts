import { act, renderHook, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { useClinicalAnalysis } from '../../hooks/useClinicalAnalysis';
import { INITIAL_STATE } from '../../types';

vi.mock('../../services/agentDB', () => {
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
  const createDatabaseMock = vi.fn().mockImplementation(async function () {
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
    getInstance: vi.fn().mockImplementation(function () {
      return {
        setReasoningBank: vi.fn(),
        getFairnessMetrics: vi.fn().mockReturnValue({}),
        addCase: vi.fn().mockResolvedValue(undefined),
        searchCases: vi.fn().mockResolvedValue([]),
      };
    }),
  };

  return {
    AgentDB: MockAgentDB,
    createDatabase: createDatabaseMock,
    EmbeddingService: vi.fn().mockImplementation(function () {
      return mockEmbeddingService;
    }),
    ReasoningBank: vi.fn().mockImplementation(function () {
      return mockReasoningBank;
    }),
    LocalLLMService: vi.fn().mockImplementation(function () {
      return mockLocalLLMService;
    }),
  };
});

vi.mock('../../services/crypto', () => {
  const mockCryptoKey = {
    type: 'secret',
    extractable: true,
    algorithm: { name: 'AES-GCM' } as KeyAlgorithm,
    usages: ['encrypt', 'decrypt'],
  } as CryptoKey;

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
});

const { mockVisionInstance } = vi.hoisted(() => {
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
  return { mockVisionInstance };
});

vi.mock('../../services/vision', () => ({
  VisionSpecialist: {
    getInstance: vi.fn().mockReturnValue(mockVisionInstance),
  },
}));

vi.mock('../../services/router', () => ({
  RouterAgent: {
    getInstance: vi.fn().mockImplementation(function () {
      return {
        route: vi.fn().mockReturnValue('VISION_ANALYSIS'),
        getRequiredSpecialist: vi.fn().mockReturnValue('Vision-Specialist-MobileNetV3'),
      };
    }),
  },
}));

vi.mock('../../services/logger', () => {
  const logFn = vi.fn().mockImplementation(function () {
    /* empty */
  });
  return {
    Logger: {
      info: logFn,
      warn: logFn,
      error: logFn,
      log: logFn,
      debug: logFn,
    },
  };
});

vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: { text: () => 'test response' },
  });
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  }
  return { GoogleGenAI: MockGoogleGenAI };
});

const { mockGoapExecute } = vi.hoisted(() => {
  const mockGoapExecute = vi.fn().mockImplementation(async function (..._args: unknown[]) {
    return {
      runId: 'run_test',
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      agents: [],
      finalWorldState: { ...INITIAL_STATE, audit_logged: true },
    };
  });
  return { mockGoapExecute };
});

vi.mock('../../services/goap/agent', () => {
  class MockGoapAgent {
    execute = mockGoapExecute;
  }
  return {
    GoapAgent: MockGoapAgent,
  };
});

describe('useClinicalAnalysis - Initial State', () => {
  beforeEach(() => {
    mockGoapExecute.mockReset();
    mockGoapExecute.mockImplementation(async function (..._args: unknown[]) {
      return {
        runId: 'run_test',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        agents: [],
        finalWorldState: { ...INITIAL_STATE, audit_logged: true },
      };
    });

    mockVisionInstance.initialize.mockClear();
    mockVisionInstance.initialize.mockResolvedValue(undefined);
    mockVisionInstance.detectSkinTone.mockClear();
    mockVisionInstance.detectSkinTone.mockResolvedValue({
      fitzpatrick: 'III',
      confidence: 0.85,
    });

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(function () {
        /* empty */
      }),
    });
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 100));
    vi.clearAllTimers();
  });

  it('should initialize with default state values', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    expect(result.current.file).toBeNull();
    expect(result.current.preview).toBeNull();
    expect(result.current.logs).toEqual([]);
    expect(result.current.worldState).toEqual(INITIAL_STATE);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.warning).toBeNull();
    expect(result.current.modelProgress).toBeNull();
    expect(result.current.analyzing).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(result.current.pending).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.trace).toBeNull();
    expect(result.current.currentAgent).toBeUndefined();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('should have dbReady transition to true after initialization', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.dbReady).toBe(true);
  });

  it('should expose action and actionState from useActionState', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.action).toBeDefined();
    expect(typeof result.current?.action).toBe('function');
    expect(result.current?.actionState).toBeNull();
  });

  it('should have pending state from useActionState', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.pending || false).toBe(false);
  });

  it('should not throw on unmount', () => {
    const { unmount } = renderHook(() => useClinicalAnalysis());

    expect(() => unmount()).not.toThrow();
  });
});

describe('useClinicalAnalysis - Action State', () => {
  it('should expose action and actionState from useActionState', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.action).toBeDefined();
    expect(typeof result.current?.action).toBe('function');
    expect(result.current?.actionState).toBeNull();
  });

  it('should have pending state from useActionState', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.pending || false).toBe(false);
  });
});

describe('useClinicalAnalysis - Cleanup', () => {
  it('should not throw on unmount', () => {
    const { unmount } = renderHook(() => useClinicalAnalysis());

    expect(() => unmount()).not.toThrow();
  });
});
