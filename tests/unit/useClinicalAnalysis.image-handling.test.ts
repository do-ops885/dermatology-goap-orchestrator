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
  const logFn = vi.fn().mockImplementation(() => {});
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

describe('useClinicalAnalysis - Image Upload Handling', () => {
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

  it('should handle valid image file upload', async () => {
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
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.file).not.toBeNull();
    expect(result.current.preview).toBe('blob:mock-url');
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('should reject invalid file types', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [invalidFile], value: '' },
      } as never);
    });

    expect(result.current.file).toBeNull();
    expect(result.current.preview).toBeNull();
    expect(result.current.error).toBe('Security Protocol: Invalid file format.');
  });

  it('should reject files exceeding size limit', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const largeFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [largeFile], value: '' },
      } as never);
    });

    expect(result.current.file).toBeNull();
    expect(result.current.preview).toBeNull();
    expect(result.current.error).toBe(
      'Security Alert: File size exceeds safe processing limit (10MB).',
    );
  });

  it('should validate file signature', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const invalidSignatureFile = new File(['test'], 'fake.jpg', { type: 'image/jpeg' });
    Object.defineProperty(invalidSignatureFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(invalidSignatureFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer),
      }),
    });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [invalidSignatureFile], value: '' },
      } as never);
    });

    expect(result.current.file).toBeNull();
    expect(result.current.preview).toBeNull();
    expect(result.current.error).toBe('Security Alert: File signature mismatch.');
  });

  it('should reset previous results when new file is selected', async () => {
    const { result } = renderHook(() => useClinicalAnalysis());

    const firstFile = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    Object.defineProperty(firstFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(firstFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff]).buffer),
      }),
    });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [firstFile], value: '' },
      } as never);
    });

    expect(result.current.file).toBe(firstFile);

    const secondFile = new File(['test2'], 'test2.png', { type: 'image/png' });
    Object.defineProperty(secondFile, 'size', { value: 1024 * 1024 });
    Object.defineProperty(secondFile, 'slice', {
      value: () => ({
        arrayBuffer: () => Promise.resolve(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer),
      }),
    });

    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [secondFile], value: '' },
      } as never);
    });

    expect(result.current.file).toBe(secondFile);
    expect(result.current.logs).toEqual([]);
    expect(result.current.worldState).toEqual(INITIAL_STATE);
    expect(result.current.result).toBeNull();
  });
});
