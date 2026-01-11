import { createDatabase, ReasoningBank, EmbeddingService, LocalLLMService } from 'agentdb';
import type { VisionSpecialist } from './vision';
import { Logger } from './logger';

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, any>();

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  async initialize(): Promise<void> {
    const db = await createDatabase('./agent-memory.db');
    this.register('agentDB', db);

    const embedder = new EmbeddingService({ 
      model: 'Xenova/all-MiniLM-L6-v2',
      dimension: 384,
      provider: 'transformers'
    });
    await embedder.initialize();
    this.register('embedder', embedder);

    const reasoningBank = new ReasoningBank(db, embedder);
    this.register('reasoningBank', reasoningBank);

    const { VisionSpecialist } = await import('./vision');
    const vision = VisionSpecialist.getInstance();
    await vision.initialize();
    this.register('vision', vision);

    const localLLM = new LocalLLMService();
    this.register('localLLM', localLLM);

    Logger.info('ServiceRegistry', 'All services initialized');
  }

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  get<T>(key: string): T {
    return this.services.get(key);
  }

  getOrInitialize<T>(key: string, initializer: () => Promise<T>): Promise<T> {
    const existing = this.services.get(key);
    if (existing) return Promise.resolve(existing);
    return initializer().then(service => {
      this.register(key, service);
      return service;
    });
  }
}
