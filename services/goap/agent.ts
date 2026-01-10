import { GOAPPlanner, AVAILABLE_ACTIONS } from '../goap';
import { AgentAction, WorldState } from '../../types';
import { Logger } from '../logger';

export type ExecutionAgentRecord = {
  id: string;
  agentId: string;
  name?: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  metadata?: Record<string, any>;
  error?: string;
};

export type ExecutionTrace = {
  runId: string;
  startTime: number;
  endTime?: number;
  agents: ExecutionAgentRecord[];
  finalWorldState: WorldState;
};

export type ExecutorFn = (ctx: Record<string, any>) => Promise<{ metadata?: any; newStateUpdates?: Partial<WorldState>; shouldReplan?: boolean }>;

export type ExecutorMap = Record<string, ExecutorFn>;

export class GoapAgent {
  private planner: GOAPPlanner;
  private executors: ExecutorMap;
  private perAgentTimeoutMs: number;

  constructor(planner: GOAPPlanner, executors: ExecutorMap, opts?: { perAgentTimeoutMs?: number }) {
    this.planner = planner;
    this.executors = executors;
    this.perAgentTimeoutMs = opts?.perAgentTimeoutMs ?? 10000;
  }

  public plan(startState: WorldState, goalState: Partial<WorldState>): AgentAction[] {
    return this.planner.plan(startState, goalState);
  }

  public async execute(startState: WorldState, goalState: Partial<WorldState>, ctx: Record<string, any>): Promise<ExecutionTrace> {
    const runId = 'run_' + Math.random().toString(36).slice(2, 9);
    const startTime = Date.now();
    Logger.info('goap-agent', 'plan_start', { runId, goalState });

    let currentState = { ...startState };
    const trace: ExecutionTrace = { runId, startTime, agents: [], finalWorldState: currentState };

    let plan = this.plan(currentState, goalState);

    let index = 0;
    while (index < plan.length) {
      const action = plan[index];
      const agentRecord: ExecutionAgentRecord = {
        id: Math.random().toString(36).substr(2, 9),
        agentId: action.agentId,
        name: action.name,
        startTime: Date.now(),
        status: 'running'
      };

      trace.agents.push(agentRecord);
      Logger.info('goap-agent', 'agent_start', { runId, agent: action.agentId, action: action.name });

      // UI callbacks (if provided) and capture returned UI log id
      let uiLogId: string | undefined;
      if (typeof ctx.onAgentStart === 'function') {
        try { uiLogId = ctx.onAgentStart(action); } catch (e) { /* ignore */ }
      }

      const executor = this.executors[action.agentId];
      if (uiLogId) {
        agentRecord.metadata = { ...(agentRecord.metadata || {}), uiLogId };
      }
      if (!executor) {
        agentRecord.endTime = Date.now();
        agentRecord.status = 'failed';
        agentRecord.error = 'executor_missing';
        Logger.error('goap-agent', 'executor_missing', { runId, agent: action.agentId });
        if (typeof ctx.onAgentEnd === 'function') ctx.onAgentEnd(action, agentRecord);
        throw new Error(`No executor found for agent: ${action.agentId}`);
      }

      try {
        const execPromise = executor({ ...ctx, currentState, action });
        const result = await Promise.race([
          execPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('executor_timeout')), this.perAgentTimeoutMs))
        ]) as any;

        agentRecord.endTime = Date.now();
        agentRecord.status = 'completed';
        agentRecord.metadata = result?.metadata;

        // Apply any state updates and action.effects
        if (result?.newStateUpdates) {
          currentState = { ...currentState, ...result.newStateUpdates };
        }
        currentState = { ...currentState, ...action.effects };

        if (typeof ctx.onAgentEnd === 'function') ctx.onAgentEnd(action, agentRecord);

        Logger.info('goap-agent', 'agent_end', { runId, agent: action.agentId, status: 'completed', durationMs: agentRecord.endTime - agentRecord.startTime });

        // Replan if needed
        if (result?.shouldReplan) {
          Logger.info('goap-agent', 'replan_triggered', { runId, agent: action.agentId });
          const replanStart = Date.now();
          plan = this.planner.plan(currentState, goalState);
          index = -1; // will increment to 0 for next loop
          Logger.info('goap-agent', 'replan_complete', { runId, durationMs: Date.now() - replanStart, newPlan: plan.map(a => a.name) });
        }
      } catch (e: any) {
        agentRecord.endTime = Date.now();
        agentRecord.status = 'failed';
        agentRecord.error = e.message;
        Logger.error('goap-agent', 'agent_failed', { runId, agent: action.agentId, error: e.message });

        if (typeof ctx.onAgentEnd === 'function') ctx.onAgentEnd(action, agentRecord);

        // Decide failure policy: skip non-critical and continue, abort on critical
        // Critical failure if executor throws a fatal error string 'Critical'
        if (e.message && e.message.includes('Critical')) {
          trace.endTime = Date.now();
          trace.finalWorldState = currentState;
          Logger.error('goap-agent', 'plan_aborted', { runId, reason: e.message });
          throw e;
        } else {
          // Mark as skipped and continue
          agentRecord.status = 'skipped';
        }
      }

      index++;
    }

    trace.endTime = Date.now();
    trace.finalWorldState = currentState;
    Logger.info('goap-agent', 'plan_end', { runId, durationMs: trace.endTime - trace.startTime });
    return trace;
  }
}
