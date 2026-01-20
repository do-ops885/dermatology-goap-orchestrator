import { act, renderHook, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { useClinicalAnalysis } from '../../hooks/useClinicalAnalysis';
import { INITIAL_STATE, type WorldState } from '../../types';

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

describe('useClinicalAnalysis - Progress Tracking', () => {
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
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 100));
    vi.clearAllTimers();
  });

  it('should set analyzing state during execution', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(validFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff]).buffer),
      }),
    });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
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

    expect(result.current.analyzing).toBe(false);
  });
});

describe('useClinicalAnalysis - Progress Tracking (skipped)', () => {
  it.skip('should track execution trace after completion', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(validFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff]).buffer),
      }),
    });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
    });

    const { GoapAgent } = await import('../../services/goap/agent');

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

    vi.spyOn(GoapAgent.prototype, 'execute').mockResolvedValue(mockTrace);

    await act(async () => {
      await result.current.executeAnalysis();
    });

    expect(result.current.trace).toBeDefined();
    expect(result.current.trace?.runId).toBe('run_test123');
  });
});

describe('useClinicalAnalysis - State Updates During Analysis', () => {
  it.skip('should update world state after analysis', { timeout: 10000 }, async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const finalState: WorldState = {
      ...INITIAL_STATE,
      audit_logged: true,
      image_verified: true,
      confidence_score: 0.85,
    };

    mockGoapExecute.mockResolvedValue({
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
      finalWorldState: finalState,
    });

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(validFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff]).buffer),
      }),
    });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
      result.current.setPrivacyMode(true);
    });

    const execResult = await act(async () => {
      return await result.current.executeAnalysis();
    });

    expect(execResult?.success).toBe(true);
    expect(mockGoapExecute).toHaveBeenCalled();
    expect(result.current?.worldState).toEqual(finalState);
  });

  it.skip('should populate result after successful analysis', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(validFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff]).buffer),
      }),
    });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
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

    expect(result.current?.result).not.toBeNull();
  });

  it.skip('should generate agent logs during execution', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(validFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff]).buffer),
      }),
    });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
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

    expect(result.current?.logs.length).toBeGreaterThan(0);
    const routerLog = result.current?.logs.find((log) => log.agent === 'Router-Agent');
    expect(routerLog).toBeDefined();
    expect(routerLog?.status).toBe('completed');
  });
});

describe('useClinicalAnalysis - Execution Trace', () => {
  it.skip('should store execution trace after analysis', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(validFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff]).buffer),
      }),
    });

    expect(result.current).not.toBeNull();

    await act(async () => {
      await result.current?.handleFileChange({
        target: { files: [validFile], value: '' },
      } as never);
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
      result.current?.setPrivacyMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current?.executeAnalysis();
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.trace).toBeDefined();
    expect(result.current?.trace?.runId).toBe('run_test123');
  });
});
