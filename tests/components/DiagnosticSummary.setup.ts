import { vi } from 'vitest';

import AgentDB from '../../services/agentDB';

export interface MockAgentDBInstance {
  storeClinicianFeedback: () => Promise<void>;
}

export interface MockBlobType {
  new (
    _parts: unknown[],
    _options: { type?: string } | unknown,
  ): {
    parts: unknown[];
    options: { type?: string } | unknown;
    text: () => Promise<string>;
    type: string;
  };
}

export const setupGlobalMocks = () => {
  // Mock Blob for testing
  const MockBlob = class MockBlob {
    constructor(
      public readonly parts: unknown[],
      public readonly options: { type?: string } | unknown,
    ) {}

    async text(): Promise<string> {
      return this.parts[0] as string;
    }

    get type(): string {
      return (this.options as { type?: string })?.type ?? 'application/json';
    }
  };

  globalThis.Blob = MockBlob as unknown as typeof globalThis.Blob;
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url');
  globalThis.URL.revokeObjectURL = vi.fn();

  return MockBlob;
};

export const mockAgentDBSpy = () => {
  const mockAgentDBInstance: MockAgentDBInstance = {
    storeClinicianFeedback: vi.fn().mockResolvedValue(undefined),
  };
  return vi
    .spyOn(AgentDB, 'getInstance')
    .mockReturnValue(mockAgentDBInstance as unknown as AgentDB);
};
