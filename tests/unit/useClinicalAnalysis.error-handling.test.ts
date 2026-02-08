import { act, renderHook, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_STATE } from '../../types';

import type { useClinicalAnalysis as UseClinicalAnalysisType } from '../../hooks/useClinicalAnalysis';
import type React from 'react';
const createValidFile = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], 'test.jpg', {
    type: 'image/jpeg',
  });

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof React>('react');
  return {
    ...actual,
    useTransition: () => [false, (cb: () => void) => cb()] as const,
    useDeferredValue: (value: unknown) => value,
  };
});

let useClinicalAnalysis: typeof UseClinicalAnalysisType;

vi.mock('../../services/utils/imageProcessing', () => ({
  optimizeImage: vi.fn().mockResolvedValue('base64-image'),
  calculateImageHash: vi.fn().mockResolvedValue('hash123'),
  validateImageSignature: vi.fn().mockResolvedValue(true),
}));

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

describe('useClinicalAnalysis - Error Handling', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ useClinicalAnalysis } = await import('../../hooks/useClinicalAnalysis'));
    const imageProcessing = await import('../../services/utils/imageProcessing');
    vi.spyOn(imageProcessing, 'optimizeImage').mockResolvedValue('base64-image');
    vi.spyOn(imageProcessing, 'calculateImageHash').mockResolvedValue('hash123');
    vi.spyOn(imageProcessing, 'validateImageSignature').mockResolvedValue(true);
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

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 100));
    vi.clearAllTimers();
  });

  it('should return null when no file is selected', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const response = await act(async () => {
      return await result.current.executeAnalysis();
    });

    expect(response).toBeNull();
  });

  it('should handle API key missing error', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = createValidFile();

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.executeAnalysis();
    });

    expect(result.current.error).toBe('System Configuration Error: API_KEY is missing.');
  });

  it('should clear error on new file selection', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = createValidFile();

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current?.error).toBeNull();
  });
});

describe('useClinicalAnalysis - Error Handling', () => {
  it('should handle planning failure error', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = createValidFile();

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setPrivacyMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    mockGoapExecute.mockRejectedValue(new Error('No plan found to reach goal state'));

    let executeResult;
    await act(async () => {
      executeResult = await result.current.executeAnalysis();
    });

    expect(executeResult).toEqual({
      success: false,
      error: 'The AI planner could not formulate a valid strategy.',
    });
    expect(result.current?.error).toBe('The AI planner could not formulate a valid strategy.');
  });

  it('should handle vision model failure', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = createValidFile();

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setPrivacyMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    mockGoapExecute.mockRejectedValue(new Error('Vision Model Inference Failed'));

    let executeResult;
    await act(async () => {
      executeResult = await result.current.executeAnalysis();
    });

    expect(executeResult).toEqual({
      success: false,
      error: 'The client-side neural network crashed.',
    });
    expect(result.current?.error).toBe('The client-side neural network crashed.');
  });

  it('should set analyzing to false on error', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = createValidFile();

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setPrivacyMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    mockGoapExecute.mockRejectedValue(new Error('Test error'));

    await act(async () => {
      await result.current.executeAnalysis();
    });

    expect(result.current?.analyzing).toBe(false);
  });
});
