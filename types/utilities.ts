import type { WorldState } from '../types';

export type AgentID = `agent-${string}`;
export type TaskID = `task-${string}`;
export type SessionID = `session-${string}`;
export type LogID = `log-${string}`;

export type Hashed = string & { readonly __brand: unique symbol };
export type Encrypted = string & { readonly __brand: unique symbol };
export type UUID = string & { readonly __brand: unique symbol };

export function assertHashed(value: string): asserts value is Hashed {
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('Invalid SHA-256 hash format');
  }
}

export function assertUUID(value: string): asserts value is UUID {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error('Invalid UUID format');
  }
}

export function assertAgentID(value: string): asserts value is AgentID {
  if (!value.startsWith('agent-')) {
    throw new Error('Invalid AgentID format');
  }
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type PartialWorldState = DeepPartial<WorldState>;

export type ValueOf<T> = T[keyof T];

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type NonNullableFields<T> = {
  [K in keyof T]: null extends T[K] ? never : K;
}[keyof T];

export type NullableFields<T> = {
  [K in keyof T]: null extends T[K] ? K : never;
}[keyof T];

export type MaybePromise<T> = T | Promise<T>;

export type AsyncReturnType<T extends (..._args: unknown[]) => unknown> = Promise<
  Awaited<ReturnType<T>>
>;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
