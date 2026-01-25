import type { EventHandler, EventMap, EventHistoryEntry } from '../types';

type EventKey = keyof EventMap;
type ListenerId = string;

interface Listener<T> {
  id: ListenerId;
  handler: EventHandler<T>;
  once: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventBus<TEventMap extends Record<string, any> = EventMap> {
  private listeners: Map<EventKey, Set<Listener<unknown>>> = new Map();
  private history: EventHistoryEntry<unknown>[] = [];
  private readonly maxHistorySize: number;
  private readonly enableHistory: boolean;
  private listenerCounter = 0;

  constructor(config: { maxHistorySize?: number; enableHistory?: boolean } = {}) {
    this.maxHistorySize = config.maxHistorySize ?? 100;
    this.enableHistory = config.enableHistory ?? true;
  }

  public on<K extends EventKey>(eventType: K, handler: EventHandler<TEventMap[K]>): () => void {
    const id = this.generateListenerId();
    const typedListener: Listener<TEventMap[K]> = {
      id,
      handler: handler as EventHandler<unknown>,
      once: false,
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listenerSet = this.listeners.get(eventType);
    if (!listenerSet) {
      throw new Error(`Failed to initialize listener set for event type: ${String(eventType)}`);
    }

    listenerSet.add(typedListener as Listener<unknown>);

    return () => this.off(eventType, id);
  }

  public once<K extends EventKey>(eventType: K, handler: EventHandler<TEventMap[K]>): () => void {
    const id = this.generateListenerId();
    const typedListener: Listener<TEventMap[K]> = {
      id,
      handler: handler as EventHandler<unknown>,
      once: true,
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listenerSet = this.listeners.get(eventType);
    if (!listenerSet) {
      throw new Error(`Failed to initialize listener set for event type: ${String(eventType)}`);
    }

    listenerSet.add(typedListener as Listener<unknown>);

    return () => this.off(eventType, id);
  }

  public off(eventType: EventKey, listenerId: ListenerId): void {
    const listenerSet = this.listeners.get(eventType);
    if (!listenerSet) {
      return;
    }

    const listenerToRemove = Array.from(listenerSet).find((listener) => listener.id === listenerId);
    if (listenerToRemove) {
      listenerSet.delete(listenerToRemove);
    }

    if (listenerSet.size === 0) {
      this.listeners.delete(eventType);
    }
  }

  public removeAllListeners(eventType?: EventKey): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  public async emit<K extends EventKey>(eventType: K, payload: TEventMap[K]): Promise<void> {
    const listenerSet = this.listeners.get(eventType);
    if (!listenerSet || listenerSet.size === 0) {
      this.addToHistory(eventType, payload);
      return;
    }

    const listenersCopy = Array.from(listenerSet);
    const promises: Array<Promise<unknown>> = [];
    const toRemove: Listener<unknown>[] = [];

    for (const listener of listenersCopy) {
      if (listener.once) {
        toRemove.push(listener);
      }

      try {
        const result = listener.handler(payload);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        console.error(`Error in event handler for ${String(eventType)}:`, error);
      }
    }

    for (const listener of toRemove) {
      listenerSet.delete(listener);
    }

    if (listenerSet.size === 0) {
      this.listeners.delete(eventType);
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    this.addToHistory(eventType, payload);
  }

  public async emitSync<K extends EventKey>(eventType: K, payload: TEventMap[K]): Promise<void> {
    const listenerSet = this.listeners.get(eventType);
    if (!listenerSet || listenerSet.size === 0) {
      this.addToHistory(eventType, payload);
      return;
    }

    const listenersCopy = Array.from(listenerSet);
    const toRemove: Listener<unknown>[] = [];

    for (const listener of listenersCopy) {
      if (listener.once) {
        toRemove.push(listener);
      }

      try {
        const result = listener.handler(payload);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error(`Error in event handler for ${String(eventType)}:`, error);
      }
    }

    for (const listener of toRemove) {
      listenerSet.delete(listener);
    }

    if (listenerSet.size === 0) {
      this.listeners.delete(eventType);
    }

    this.addToHistory(eventType, payload);
  }

  public async replay<K extends EventKey>(
    eventType: K,
    options?: { fromTime?: number; limit?: number },
  ): Promise<number> {
    if (!this.enableHistory) {
      throw new Error('History replay is disabled');
    }

    const matchingEvents = this.history.filter((entry) => entry.type === String(eventType));

    let eventsToReplay = matchingEvents;

    const fromTime = options?.fromTime;
    if (fromTime !== undefined) {
      eventsToReplay = eventsToReplay.filter((entry) => entry.timestamp >= fromTime);
    }

    const limit = options?.limit;
    if (limit !== undefined) {
      eventsToReplay = eventsToReplay.slice(0, limit);
    }

    for (const entry of eventsToReplay) {
      await this.emit(eventType, entry.payload as TEventMap[K]);
    }

    return eventsToReplay.length;
  }

  public async replayAll(options?: { fromTime?: number; limit?: number }): Promise<number> {
    if (!this.enableHistory) {
      throw new Error('History replay is disabled');
    }

    let eventsToReplay = [...this.history];

    const fromTime = options?.fromTime;
    if (fromTime !== undefined) {
      eventsToReplay = eventsToReplay.filter((entry) => entry.timestamp >= fromTime);
    }

    const limit = options?.limit;
    if (limit !== undefined) {
      eventsToReplay = eventsToReplay.slice(0, limit);
    }

    for (const entry of eventsToReplay) {
      const eventType = entry.type as EventKey;
      await this.emit(eventType, entry.payload as TEventMap[EventKey]);
    }

    return eventsToReplay.length;
  }

  public getHistory<K extends EventKey>(eventType?: K): EventHistoryEntry<TEventMap[K]>[] {
    if (eventType) {
      return this.history
        .filter((entry) => entry.type === String(eventType))
        .map((entry) => entry as EventHistoryEntry<TEventMap[K]>);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.history as EventHistoryEntry<TEventMap[K]>[];
  }

  public clearHistory(): void {
    this.history = [];
  }

  public getListenerCount(eventType?: EventKey): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size ?? 0;
    }

    let total = 0;
    for (const listenerSet of this.listeners.values()) {
      total += listenerSet.size;
    }
    return total;
  }

  public getEventTypes(): EventKey[] {
    return Array.from(this.listeners.keys());
  }

  public destroy(): void {
    this.removeAllListeners();
    this.clearHistory();
  }

  private addToHistory<K extends EventKey>(eventType: K, payload: TEventMap[K]): void {
    if (!this.enableHistory) {
      return;
    }

    const entry: EventHistoryEntry<TEventMap[K]> = {
      type: String(eventType),
      payload,
      timestamp: Date.now(),
    };

    this.history.push(entry as EventHistoryEntry<unknown>);

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  private generateListenerId(): string {
    return `listener_${++this.listenerCounter}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const globalEventBus = new EventBus();
