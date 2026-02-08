/* eslint-disable no-unused-vars */
// Stub for agentdb package to avoid loading hnswlib-node native bindings in tests

export class ReasoningBank {
  constructor() {
    this.patterns = [];
  }

  async storePattern(pattern) {
    this.patterns.push(pattern);
  }

  async findSimilarPatterns(embedding, k) {
    return [];
  }

  async getAllPatterns() {
    return this.patterns;
  }

  async clear() {
    this.patterns = [];
  }
}

export class EmbeddingService {
  async embed(text) {
    return new Float32Array(128);
  }
}

export function createDatabase(config) {
  return {
    reasoningBank: new ReasoningBank(),
    embeddingService: new EmbeddingService(),
  };
}

export default { ReasoningBank, EmbeddingService, createDatabase };
