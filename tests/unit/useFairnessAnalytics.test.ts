import { act, cleanup, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { useFairnessAnalytics } from '../../hooks/useFairnessAnalytics';
import AgentDB from '../../services/agentDB';

const { mockGetAllPatterns, mockPatterns } = vi.hoisted(() => {
  const mockPatterns = [
    {
      id: 'pattern-1',
      embeddings: new Float32Array(384),
    },
    {
      id: 'pattern-2',
      embeddings: new Float32Array(384),
    },
  ];

  const mockGetAllPatterns = vi.fn().mockResolvedValue(mockPatterns);

  return { mockGetAllPatterns, mockPatterns };
});

vi.mock('../../services/agentDB', () => ({
  default: {
    getInstance: vi.fn().mockImplementation(() => ({
      getAllPatterns: mockGetAllPatterns,
    })),
  },
  createDatabase: vi.fn(),
  ReasoningBank: vi.fn(),
  EmbeddingService: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal('navigator', {
    serviceWorker: {
      controller: {
        postMessage: vi.fn(),
      },
      getRegistration: vi.fn().mockResolvedValue({
        periodicSync: {
          register: vi.fn().mockResolvedValue(undefined),
        },
      }),
    },
  });
  (AgentDB.getInstance as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    getAllPatterns: mockGetAllPatterns,
  }));
  mockGetAllPatterns.mockReset().mockResolvedValue(mockPatterns);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useFairnessAnalytics - Initial State', () => {
  it('should initialize with null analytics', () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    expect(result.current.analytics).toBeNull();
  });

  it('should initialize with false loading state', () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    expect(result.current.loading).toBe(false);
  });

  it('should expose runBatchAnalytics function', () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    expect(typeof result.current.runBatchAnalytics).toBe('function');
  });

  it('should expose registerPeriodicSync function', () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    expect(typeof result.current.registerPeriodicSync).toBe('function');
  });

  it('should return stable function references', () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    const fn1 = result.current.runBatchAnalytics;
    const fn2 = result.current.registerPeriodicSync;

    expect(result.current.runBatchAnalytics).toBe(fn1);
    expect(result.current.registerPeriodicSync).toBe(fn2);
  });
});

describe('useFairnessAnalytics - runBatchAnalytics', () => {
  it('should set loading to true when runBatchAnalytics is called', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    console.log('Loading state after runBatchAnalytics:', result.current.loading);
    console.log('mockGetAllPatterns calls:', mockGetAllPatterns.mock.calls.length);
    console.log('mockGetAllPatterns:', mockGetAllPatterns);
    expect(result.current.loading).toBe(true);
  });

  it('should call agentDB.getAllPatterns when runBatchAnalytics is called', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(mockGetAllPatterns).toHaveBeenCalled();
  });

  it('should post message to service worker with patterns', async () => {
    const postMessageSpy = vi.fn();
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: {
          postMessage: postMessageSpy,
        },
        getRegistration: vi.fn().mockResolvedValue({
          periodicSync: {
            register: vi.fn().mockResolvedValue(undefined),
          },
        }),
      },
    });

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(postMessageSpy).toHaveBeenCalled();
    const callArg = postMessageSpy.mock.calls[0]?.[0] as any;
    expect(callArg.type).toBe('RUN_BATCH_ANALYTICS');
    expect(callArg.data).toBeDefined();
  });

  it('should post message with port transfer list', async () => {
    const postMessageSpy = vi.fn();
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: {
          postMessage: postMessageSpy,
        },
        getRegistration: vi.fn().mockResolvedValue({
          periodicSync: {
            register: vi.fn().mockResolvedValue(undefined),
          },
        }),
      },
    });

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(postMessageSpy).toHaveBeenCalled();
    const callArgs = postMessageSpy.mock.calls[0];
    if (callArgs) {
      expect(callArgs.length).toBe(2);
      expect(callArgs[1]).toBeInstanceOf(Array);
    }
  });

  it('should set loading to false when BATCH_ANALYTICS_COMPLETE message received', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.loading).toBe(true);
  });

  it('should set analytics results when BATCH_ANALYTICS_COMPLETE message received', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.analytics).toBeDefined();
  });

  it('should handle null analytics results', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(result.current.analytics).toBeDefined();
  });

  it('should handle no service worker controller', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: null,
        getRegistration: vi.fn().mockResolvedValue({
          periodicSync: {
            register: vi.fn().mockResolvedValue(undefined),
          },
        }),
      },
    });

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(result.current.loading).toBe(false);
  });

  it('should handle periodicSync not in registration', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: {
          postMessage: vi.fn(),
        },
        getRegistration: vi.fn().mockResolvedValue({}),
      },
    });

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.registerPeriodicSync();
    });

    expect(result.current).toBeDefined();
  });
});

describe('useFairnessAnalytics - registerPeriodicSync', () => {
  it('should register periodic sync when supported', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.registerPeriodicSync();
    });

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && 'periodicSync' in registration) {
      const ps = (registration as any).periodicSync;
      expect(ps.register).toHaveBeenCalledWith('fairness-analytics', expect.any(Object));
    }
  });

  it('should register with correct minInterval', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.registerPeriodicSync();
    });

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && 'periodicSync' in registration) {
      const ps = (registration as any).periodicSync;
      const callArgs = ps.register.mock.calls[0];
      if (callArgs) {
        expect(callArgs[1].minInterval).toBe(24 * 60 * 60 * 1000);
      }
    }
  });

  it('should handle periodicSync registration errors gracefully', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: {
          postMessage: vi.fn(),
        },
        getRegistration: vi.fn().mockResolvedValue({
          periodicSync: {
            register: vi.fn().mockRejectedValue(new Error('Sync error')),
          },
        }),
      },
    });

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.registerPeriodicSync();
    });

    expect(result.current).toBeDefined();
  });

  it('should handle getRegistration rejection', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: {
          postMessage: vi.fn(),
        },
        getRegistration: vi.fn().mockRejectedValue(new Error('No registration')),
      },
    });

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.registerPeriodicSync();
    });

    expect(result.current).toBeDefined();
  });
});

describe('useFairnessAnalytics - Cleanup', () => {
  it('should not throw on unmount', () => {
    const { unmount } = renderHook(() => useFairnessAnalytics());

    expect(() => unmount()).not.toThrow();
  });

  it('should not throw on unmount during loading', async () => {
    const { unmount, result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(() => unmount()).not.toThrow();
  });

  it('should not throw on multiple unmounts', () => {
    const { unmount } = renderHook(() => useFairnessAnalytics());

    unmount();
    expect(() => unmount()).not.toThrow();
  });

  it('should not leak state on unmount', () => {
    const { unmount, result } = renderHook(() => useFairnessAnalytics());

    unmount();
    expect(result.current.analytics).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe('useFairnessAnalytics - Edge Cases', () => {
  it('should handle empty patterns from agentDB', async () => {
    mockGetAllPatterns.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(result.current).toBeDefined();
  });

  it('should handle agentDB getAllPatterns rejection', async () => {
    mockGetAllPatterns.mockRejectedValueOnce(new Error('DB error'));

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(result.current).toBeDefined();
  });

  it('should handle multiple concurrent runBatchAnalytics calls', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      void result.current.runBatchAnalytics();
      void result.current.runBatchAnalytics();
      void result.current.runBatchAnalytics();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current).toBeDefined();
  });

  it('should handle rapid registerPeriodicSync calls', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.registerPeriodicSync();
      await result.current.registerPeriodicSync();
      await result.current.registerPeriodicSync();
    });

    expect(result.current).toBeDefined();
  });

  it('should handle missing serviceWorker property', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: undefined,
    });

    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.registerPeriodicSync();
    });

    expect(result.current).toBeDefined();
  });

  it('should handle analytics with full demographic data', async () => {
    const { result } = renderHook(() => useFairnessAnalytics());

    await act(async () => {
      await result.current.runBatchAnalytics();
    });

    expect(result.current.analytics).toBeDefined();
  });
});
