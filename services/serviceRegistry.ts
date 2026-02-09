import { createDatabase, ReasoningBank, EmbeddingService } from 'agentdb';

import { Logger } from './logger';

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, unknown>();
  private initialized = false;

  static getInstance(): ServiceRegistry {
    ServiceRegistry.instance ??= new ServiceRegistry();
    return ServiceRegistry.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const isTestEnv = import.meta.env?.MODE === 'test';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const db = await createDatabase('./agent-memory.db');
    this.register('agentDB', db);

    const embedder = new EmbeddingService({
      model: 'Xenova/all-MiniLM-L6-v2',
      dimension: 384,
      provider: 'transformers',
    });
    await embedder.initialize();
    this.register('embedder', embedder);

    const reasoningBank = new ReasoningBank(db, embedder);
    this.register('reasoningBank', reasoningBank);

    const { VisionSpecialist } = await import('./vision');
    const vision = VisionSpecialist?.getInstance?.();
    if (vision != null) {
      if (!isTestEnv) {
        try {
          await vision.initialize();
        } catch (error) {
          Logger.warn('ServiceRegistry', 'Vision initialization failed', { error });
        }
      }
      this.register('vision', vision);
    } else if (isTestEnv) {
      this.register('vision', { initialize: async () => {} });
    }

    const { LocalLLMService } = await import('./agentDB');
    const localLLM = new LocalLLMService();
    this.register('localLLM', localLLM);

    Logger.info('ServiceRegistry', 'All services initialized');
    this.initialized = true;
  }

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  get<T>(key: string): T | undefined {
    const service = this.services.get(key);
    return service as T | undefined;
  }

  getOrInitialize<T>(key: string, initializer: () => Promise<T>): Promise<T> {
    const existing = this.services.get(key) as T | undefined;
    if (existing !== undefined) return Promise.resolve(existing);
    return initializer().then((service) => {
      this.register(key, service);
      return service;
    });
  }
}
