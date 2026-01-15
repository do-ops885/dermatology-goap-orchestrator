// Convert static class to module export (2025 best practice)
const timings = new Map<string, number[]>();

export const AgentTimings = {
  record(agentId: string, duration: number): void {
    const agentTimings = timings.get(agentId) ?? [];
    agentTimings.push(duration);
    timings.set(agentId, agentTimings.slice(-100));
  },

  getAverage(agentId: string): number {
    const agentTimings = timings.get(agentId);
    if (!agentTimings || agentTimings.length === 0) return 0;
    return agentTimings.reduce((a, b) => a + b, 0) / agentTimings.length;
  },

  getP95(agentId: string): number {
    const agentTimings = timings.get(agentId);
    if (!agentTimings || agentTimings.length === 0) return 0;
    const sorted = [...agentTimings].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] ?? 0;
  },

  getP99(agentId: string): number {
    const agentTimings = timings.get(agentId);
    if (!agentTimings || agentTimings.length === 0) return 0;
    const sorted = [...agentTimings].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.99);
    return sorted[index] ?? 0;
  },

  getReport(): Record<string, { avg: number; p95: number; p99: number; count: number }> {
    const report: Record<string, { avg: number; p95: number; p99: number; count: number }> = {};
    for (const [agentId, agentTimings] of timings) {
      report[agentId] = {
        avg: this.getAverage(agentId),
        p95: this.getP95(agentId),
        p99: this.getP99(agentId),
        count: agentTimings.length,
      };
    }
    return report;
  },

  getAllTimings(): Map<string, number[]> {
    return new Map(timings);
  },

  clear(agentId?: string): void {
    if (agentId !== undefined) {
      timings.delete(agentId);
    } else {
      timings.clear();
    }
  },
};

export const PERFORMANCE_BUDGETS = {
  verification: 2000,
  detection: 5000,
  calibration: 1000,
  preprocessing: 3000,
  segmentation: 5000,
  featureExtraction: 10000,
  lesionDetection: 15000,
  similaritySearch: 2000,
  riskAssessment: 5000,
  fairnessAudit: 3000,
  webVerification: 10000,
  recommendations: 5000,
  learning: 3000,
  encryption: 2000,
  audit: 1000,
  total: 72000,
} as const;

export type PerformanceBudgetKey = keyof typeof PERFORMANCE_BUDGETS;

export function checkBudget(agentId: string, duration: number): boolean {
  const budget = (PERFORMANCE_BUDGETS as Record<string, number>)[agentId];
  return budget !== undefined && duration <= budget;
}

export function getBudgetForAgent(agentId: string): number {
  return (PERFORMANCE_BUDGETS as Record<string, number>)[agentId] ?? 0;
}
