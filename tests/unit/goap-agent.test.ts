import { describe, it, expect } from 'vitest';
import { GoapAgent } from '../../services/goap/agent';
import { GOAPPlanner } from '../../services/goap';
import { INITIAL_STATE } from '../../types';

// Minimal executor that simply returns completed metadata
const noopExecutor = async () => ({ metadata: { ok: true } });

// Build an executor map that returns noop for all agent ids used in the domain
const buildExecutorMap = (actions: any[]) => {
  const map: Record<string, any> = {};
  actions.forEach(a => { map[a.agentId] = noopExecutor; });
  return map;
};

describe('GoapAgent', () => {
  it('should produce a non-empty plan to reach audit_logged', () => {
    const planner = new GOAPPlanner();
    const plan = planner.plan(INITIAL_STATE, { audit_logged: true });
    expect(plan.length).toBeGreaterThan(0);
  });

  it('should execute a plan and return a trace with final state containing audit_logged', async () => {
    const planner = new GOAPPlanner();
    const plan = planner.plan(INITIAL_STATE, { audit_logged: true });
    const executors = buildExecutorMap(plan);

    const agent = new GoapAgent(planner, executors, { perAgentTimeoutMs: 5000 });

    const trace = await agent.execute(INITIAL_STATE, { audit_logged: true }, {} as any);

    expect(trace.runId).toBeDefined();
    expect(trace.agents.length).toBeGreaterThan(0);
    expect(trace.finalWorldState.audit_logged).toBe(true);
  });
});
