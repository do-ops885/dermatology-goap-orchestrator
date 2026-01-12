export class AgentTimings {
  private static timings = new Map<string, number[]>();

  static record(agentId: string, duration: number) {
    const timings = this.timings.get(agentId) || [];
    timings.push(duration);
    this.timings.set(agentId, timings.slice(-100));
  }

  static getAverage(agentId: string): number {
    const timings = this.timings.get(agentId) || [];
    if (timings.length === 0) return 0;
    return timings.reduce((a, b) => a + b, 0) / timings.length;
  }

  static getP95(agentId: string): number {
    const timings = this.timings.get(agentId) || [];
    if (timings.length === 0) return 0;
    timings.sort((a, b) => a - b);
    return timings[Math.floor(timings.length * 0.95)];
  }

  static getP99(agentId: string): number {
    const timings = this.timings.get(agentId) || [];
    if (timings.length === 0) return 0;
    timings.sort((a, b) => a - b);
    return timings[Math.floor(timings.length * 0.99)];
  }

  static getReport(): Record<string, { avg: number; p95: number; p99: number; count: number }> {
    const report: Record<string, { avg: number; p95: number; p99: number; count: number }> = {};
    for (const [agentId, timings] of this.timings) {
      report[agentId] = {
        avg: this.getAverage(agentId),
        p95: this.getP95(agentId),
        p99: this.getP99(agentId),
        count: timings.length
      };
    }
    return report;
  }

  static getAllTimings(): Map<string, number[]> {
    return new Map(this.timings);
  }

  static clear(agentId?: string) {
    if (agentId) {
      this.timings.delete(agentId);
    } else {
      this.timings.clear();
    }
  }
}

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
  total: 72000
};

export function checkBudget(agentId: string, duration: number): boolean {
  return duration <= (PERFORMANCE_BUDGETS as any)[agentId] || false;
}

export function getBudgetForAgent(agentId: string): number {
  return (PERFORMANCE_BUDGETS as any)[agentId] || 0;
}
