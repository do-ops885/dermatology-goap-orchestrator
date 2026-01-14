import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClinicalAnalysis } from '../../hooks/useClinicalAnalysis';
import { INITIAL_STATE, type WorldState } from '../../types';

vi.mock('../../services/agentDB', async () => {
  const actual =
    await vi.importActual<typeof import('../../services/agentDB')>('../../services/agentDB');
  return {
    ...actual,
    createDatabase: vi.fn().mockResolvedValue({
      patterns: { bulkAdd: vi.fn() },
      execute: vi.fn().mockResolvedValue([]),
    }),
    EmbeddingService: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      embed: vi.fn().mockResolvedValue(new Float32Array(384)),
    })),
    ReasoningBank: vi.fn().mockImplementation(() => ({
      addPattern: vi.fn().mockResolvedValue(undefined),
      searchSimilar: vi.fn().mockResolvedValue([]),
    })),
    LocalLLMService: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue('test response'),
      unload: vi.fn(),
    })),
  };
});

vi.mock('../../services/crypto', () => ({
  CryptoService: {
    generateEphemeralKey: vi.fn().mockResolvedValue({
      type: 'secret',
      extractable: true,
      algorithm: { name: 'AES-GCM' } as KeyAlgorithm,
      usages: ['encrypt', 'decrypt'],
    } as CryptoKey),
    encryptData: vi.fn().mockResolvedValue({
      ciphertext: new ArrayBuffer(16),
      iv: new Uint8Array(12),
    }),
    generateHash: vi.fn().mockResolvedValue('testhash'),
    arrayBufferToBase64: vi.fn().mockReturnValue('base64string'),
  },
}));

vi.mock('../../services/vision', () => ({
  VisionSpecialist: {
    getInstance: vi.fn().mockReturnValue({
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
    }),
  },
}));

vi.mock('../../services/router', () => ({
  RouterAgent: {
    getInstance: vi.fn().mockReturnValue({
      route: vi.fn().mockReturnValue('VISION_ANALYSIS'),
      getRequiredSpecialist: vi.fn().mockReturnValue('Vision-Specialist-MobileNetV3'),
    }),
  },
}));

vi.mock('../../services/logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

vi.mock('@google/genai', () => {
  const MockGoogleGenAI = vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        response: { text: vi.fn().mockReturnValue('test response') },
      }),
    },
  }));
  return { GoogleGenAI: MockGoogleGenAI };
});

describe('useClinicalAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  describe('Initial State', () => {
    it('should initialize with default state values', () => {
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
    });

    it('should have dbReady transition to true after initialization', async () => {
      const { result } = renderHook(() => useClinicalAnalysis());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.dbReady).toBe(true);
    });
  });

  describe('Image Upload Handling', () => {
    it('should handle valid image file upload', async () => {
      const { result } = renderHook(() => useClinicalAnalysis());

      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });
      Object.defineProperty(validFile, 'slice', {
        value: () => ({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(12)),
        }),
      });

      await act(async () => {
        await result.current.handleFileChange({
          target: { files: [validFile], value: '' },
        } as never);
        await new Promise((resolve) => setTimeout(resolve, 10));
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

  describe('Progress Tracking', () => {
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

      expect(result.current.analyzing).toBe(false);
    });

    it('should track execution trace after completion', async () => {
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

  describe('State Updates During Analysis', () => {
    it('should update world state after analysis', async () => {
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

      const finalState: WorldState = {
        ...INITIAL_STATE,
        audit_logged: true,
        image_verified: true,
        confidence_score: 0.85,
      };

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
        finalWorldState: finalState,
      };

      const executeSpy = vi.spyOn(GoapAgent.prototype, 'execute').mockResolvedValue(mockTrace);

      await act(async () => {
        const execResult = await result.current.executeAnalysis();
        expect(execResult?.success).toBe(true);
      });

      expect(executeSpy).toHaveBeenCalled();
      expect(result.current.worldState).toEqual(finalState);
      executeSpy.mockRestore();
    });

    it('should populate result after successful analysis', async () => {
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

      const executeSpy = vi.spyOn(GoapAgent.prototype, 'execute').mockResolvedValue(mockTrace);

      await act(async () => {
        await result.current.executeAnalysis();
      });

      expect(result.current.result).not.toBeNull();
      executeSpy.mockRestore();
    });

    it('should generate agent logs during execution', async () => {
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

      const executeSpy = vi.spyOn(GoapAgent.prototype, 'execute').mockResolvedValue(mockTrace);

      await act(async () => {
        await result.current.executeAnalysis();
      });

      expect(result.current.logs.length).toBeGreaterThan(0);
      const routerLog = result.current.logs.find((log) => log.agent === 'Router-Agent');
      expect(routerLog).toBeDefined();
      expect(routerLog?.status).toBe('completed');
      executeSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should return null when no file is selected', async () => {
      const { result } = renderHook(() => useClinicalAnalysis());

      const response = await act(async () => result.current.executeAnalysis());

      expect(response).toBeNull();
    });

    it('should handle API key missing error', async () => {
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

      const response = await act(async () => result.current.executeAnalysis());

      expect(response).toBeNull();
      expect(result.current.error).toBe('System Configuration Error: API_KEY is missing.');
    });

    it('should handle planning failure error', async () => {
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

      act(() => {
        result.current.setPrivacyMode(true);
      });

      const { GoapAgent } = await import('../../services/goap/agent');

      vi.spyOn(GoapAgent.prototype, 'execute').mockRejectedValue(
        new Error('No plan found to reach goal state'),
      );

      await act(async () => {
        await result.current.executeAnalysis();
      });

      expect(result.current.error).toBe('The AI planner could not formulate a valid strategy.');
    });

    it('should handle vision model failure', async () => {
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

      act(() => {
        result.current.setPrivacyMode(true);
      });

      const { GoapAgent } = await import('../../services/goap/agent');

      vi.spyOn(GoapAgent.prototype, 'execute').mockRejectedValue(
        new Error('Vision Model Inference Failed'),
      );

      await act(async () => {
        await result.current.executeAnalysis();
      });

      expect(result.current.error).toBe('The client-side neural network crashed.');
    });

    it('should set analyzing to false on error', async () => {
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

      act(() => {
        result.current.setPrivacyMode(true);
      });

      const { GoapAgent } = await import('../../services/goap/agent');

      vi.spyOn(GoapAgent.prototype, 'execute').mockRejectedValue(new Error('Test error'));

      await act(async () => {
        await result.current.executeAnalysis();
      });

      expect(result.current.analyzing).toBe(false);
    });

    it('should clear error on new file selection', async () => {
      const { result } = renderHook(() => useClinicalAnalysis());

      const { GoapAgent } = await import('../../services/goap/agent');
      vi.spyOn(GoapAgent.prototype, 'execute').mockRejectedValue(new Error('Test error'));

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

      expect(result.current.error).toBeNull();
    });
  });

  describe('Privacy Mode', () => {
    it('should toggle privacy mode', () => {
      const { result } = renderHook(() => useClinicalAnalysis());

      expect(result.current.privacyMode).toBe(false);

      act(() => {
        result.current.setPrivacyMode(true);
      });

      expect(result.current.privacyMode).toBe(true);
    });

    it('should skip API key check in privacy mode', async () => {
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

      act(() => {
        result.current.setPrivacyMode(true);
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

      expect(result.current.error).not.toContain('API_KEY');
    });
  });

  describe('Log Filtering', () => {
    it('should filter logs by search query', async () => {
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

      expect(result.current.logs.length).toBeGreaterThan(0);

      act(() => {
        result.current.setSearchQuery('Router');
      });

      const filteredLogs = result.current.logs;
      expect(filteredLogs.every((log) => log.agent.includes('Router'))).toBe(true);
    });

    it('should filter logs case-insensitively', async () => {
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

      expect(result.current.logs.length).toBeGreaterThan(0);

      act(() => {
        result.current.setSearchQuery('router');
      });

      const filteredLogs = result.current.logs;
      expect(filteredLogs.some((log) => log.agent.toLowerCase().includes('router'))).toBe(true);
    });
  });

  describe('Action State', () => {
    it('should expose action and actionState from useActionState', () => {
      const { result } = renderHook(() => useClinicalAnalysis());

      expect(result.current.action).toBeDefined();
      expect(typeof result.current.action).toBe('function');
      expect(result.current.actionState).toBeNull();
    });

    it('should have pending state from useActionState', () => {
      const { result } = renderHook(() => useClinicalAnalysis());

      expect(result.current.pending).toBe(false);
    });
  });

  describe('Execution Trace', () => {
    it('should store execution trace after analysis', async () => {
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

  describe('Cleanup', () => {
    it('should not throw on unmount', () => {
      const { unmount } = renderHook(() => useClinicalAnalysis());

      expect(() => unmount()).not.toThrow();
    });
  });
});
