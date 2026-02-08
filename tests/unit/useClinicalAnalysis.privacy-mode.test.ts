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
    getInstance: vi.fn().mockImplementation(() => ({
      route: vi.fn().mockReturnValue('VISION_ANALYSIS'),
      getRequiredSpecialist: vi.fn().mockReturnValue('Vision-Specialist-MobileNetV3'),
    })),
  },
}));

vi.mock('../../services/logger', () => {
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

describe('useClinicalAnalysis - Privacy Mode', () => {
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

  it('should toggle privacy mode', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    expect(result.current).not.toBeNull();
    expect(result.current?.privacyMode).toBe(false);

    await act(async () => {
      result.current.setPrivacyMode(true);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current?.privacyMode).toBe(true);
  });
});

describe('useClinicalAnalysis - Privacy Mode', () => {
  it('should skip API key check in privacy mode', async () => {
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

    const mockTrace = {
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
    };

    mockGoapExecute.mockResolvedValue(mockTrace);

    await act(async () => {
      await result.current.executeAnalysis();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current?.error).not.toContain('API_KEY');
  });
});

describe('useClinicalAnalysis - Log Filtering', () => {
  it('should filter logs by search query', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const mockTrace = {
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
    };

    mockGoapExecute.mockResolvedValue(mockTrace);

    const validFile = createValidFile();

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setPrivacyMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.executeAnalysis();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current?.logs.length).toBeGreaterThan(0);

    await act(async () => {
      result.current.setSearchQuery('Router');
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const filteredLogs = result.current?.logs;
    expect(filteredLogs?.every((log) => log.agent.includes('Router'))).toBe(true);
  });

  it('should filter logs case-insensitively', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = createValidFile();

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const mockTrace = {
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
    };

    mockGoapExecute.mockResolvedValue(mockTrace);

    await act(async () => {
      result.current.setPrivacyMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.executeAnalysis();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current?.logs.length).toBeGreaterThan(0);

    await act(async () => {
      result.current.setSearchQuery('router');
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const filteredLogs = result.current?.logs;
    expect(filteredLogs?.some((log) => log.agent.toLowerCase().includes('router'))).toBe(true);
  });
});
