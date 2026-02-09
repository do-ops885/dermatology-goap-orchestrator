import { createDatabase } from 'agentdb';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Logger } from '../../services/logger';
import { ServiceRegistry } from '../../services/serviceRegistry';

vi.mock('../../services/logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('agentdb', async () => {
  const actual = await vi.importActual('agentdb');
  return {
    ...actual,
    createDatabase: vi.fn().mockResolvedValue({
      mock: 'database',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
    EmbeddingService: class MockEmbeddingService {
      initialize = vi.fn().mockResolvedValue(undefined);
    },
    ReasoningBank: class MockReasoningBank {
      constructor() {
        return { mock: 'reasoningBank' } as any;
      }
    },
  };
});

vi.mock('../../services/vision', () => ({
  VisionSpecialist: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('../../services/agentDB', () => ({
  LocalLLMService: class MockLocalLLMService {
    mock = 'localLLM';
  },
  default: {
    getInstance: vi.fn().mockReturnValue({
      logAuditEvent: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = ServiceRegistry.getInstance();
    vi.clearAllMocks();
    (createDatabase as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      mock: 'database',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ServiceRegistry.getInstance();
      const instance2 = ServiceRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should always return the same instance', () => {
      const instances = Array.from({ length: 5 }, () => ServiceRegistry.getInstance());

      instances.forEach((instance, index) => {
        if (index > 0) {
          expect(instance).toBe(instances[0]);
        }
      });
    });
  });

  describe('register', () => {
    it('should register a service', () => {
      const mockService = { name: 'testService' };

      registry.register('test', mockService);
      const retrieved = registry.get<{ name: string }>('test');

      expect(retrieved).toBe(mockService);
    });

    it('should register multiple services', () => {
      const service1 = { name: 'service1' };
      const service2 = { name: 'service2' };
      const service3 = { name: 'service3' };

      registry.register('s1', service1);
      registry.register('s2', service2);
      registry.register('s3', service3);

      expect(registry.get('s1')).toBe(service1);
      expect(registry.get('s2')).toBe(service2);
      expect(registry.get('s3')).toBe(service3);
    });

    it('should overwrite existing service with same key', () => {
      const service1 = { version: 1 };
      const service2 = { version: 2 };

      registry.register('service', service1);
      registry.register('service', service2);

      expect(registry.get('service')).toBe(service2);
    });

    it('should handle different types of services', () => {
      const stringService = 'test';
      const numberService = 42;
      const objectService = { key: 'value' };
      const functionService = () => 'hello';

      registry.register('string', stringService);
      registry.register('number', numberService);
      registry.register('object', objectService);
      registry.register('function', functionService);

      expect(registry.get('string')).toBe(stringService);
      expect(registry.get('number')).toBe(numberService);
      expect(registry.get('object')).toBe(objectService);
      expect(registry.get('function')).toBe(functionService);
    });
  });

  describe('get', () => {
    it('should return registered service', () => {
      const mockService = { name: 'test' };
      registry.register('test', mockService);

      const result = registry.get('test');

      expect(result).toBe(mockService);
    });

    it('should return undefined for non-existent service', () => {
      const result = registry.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return correct type', () => {
      interface TestService {
        method: () => string;
      }

      const mockService: TestService = {
        method: () => 'test',
      };

      registry.register('typed', mockService);
      const result = registry.get<TestService>('typed');

      expect(result?.method()).toBe('test');
    });
  });

  describe('getOrInitialize', () => {
    it('should return existing service if already registered', async () => {
      const existingService = { name: 'existing' };
      registry.register('test', existingService);

      const initializer = vi.fn().mockResolvedValue({ name: 'new' });
      const result = await registry.getOrInitialize('test', initializer);

      expect(result).toBe(existingService);
      expect(initializer).not.toHaveBeenCalled();
    });

    it('should initialize and register service if not exists', async () => {
      const newService = { name: 'initialized' };
      const initializer = vi.fn().mockResolvedValue(newService);

      const result = await registry.getOrInitialize('new', initializer);

      expect(result).toBe(newService);
      expect(initializer).toHaveBeenCalledOnce();
      expect(registry.get('new')).toBe(newService);
    });

    it('should call initializer only once for same key', async () => {
      const service = { name: 'test' };
      const initializer = vi.fn().mockResolvedValue(service);

      const result1 = await registry.getOrInitialize('lazy', initializer);
      const result2 = await registry.getOrInitialize('lazy', initializer);

      expect(result1).toBe(service);
      expect(result2).toBe(service);
      expect(initializer).toHaveBeenCalledOnce();
    });

    it('should handle async initializers', async () => {
      const asyncService = { async: true };
      const initializer = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(asyncService), 10)),
        );

      const result = await registry.getOrInitialize('async', initializer);

      expect(result).toBe(asyncService);
      expect(registry.get('async')).toBe(asyncService);
    });

    it('should propagate initializer errors', async () => {
      const error = new Error('Initialization failed');
      const initializer = vi.fn().mockRejectedValue(error);

      await expect(registry.getOrInitialize('failing', initializer)).rejects.toThrow(
        'Initialization failed',
      );
    });
  });

  describe('initialize', () => {
    it('should initialize all services', async () => {
      await registry.initialize();

      // Verify Logger was called
      expect(Logger.info).toHaveBeenCalledWith('ServiceRegistry', 'All services initialized');
    });

    it('should register agentDB service', async () => {
      await registry.initialize();

      const agentDB = registry.get('agentDB');
      expect(agentDB).toBeDefined();
    });

    it('should register embedder service', async () => {
      await registry.initialize();

      const embedder = registry.get('embedder');
      expect(embedder).toBeDefined();
    });

    it('should register reasoningBank service', async () => {
      await registry.initialize();

      const reasoningBank = registry.get('reasoningBank');
      expect(reasoningBank).toBeDefined();
    });

    it('should register vision service', async () => {
      await registry.initialize();

      const vision = registry.get('vision');
      expect(vision).toBeDefined();
    });

    it('should register localLLM service', async () => {
      await registry.initialize();

      const localLLM = registry.get('localLLM');
      expect(localLLM).toBeDefined();
    });
  });
});
