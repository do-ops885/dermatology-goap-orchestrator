import { Logger } from '../logger';

import type { AgentAction, WorldState } from '../../types';
import type { GOAPPlanner } from '../goap';

export interface ExecutionAgentRecord {
  id: string;
  agentId: string;
  name?: string | undefined;
  startTime: number;
  endTime?: number | undefined;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  metadata?: Record<string, unknown> | undefined;
  error?: string | undefined;
}

export interface ExecutionTrace {
  runId: string;
  startTime: number;
  endTime?: number;
  agents: ExecutionAgentRecord[];
  finalWorldState: WorldState;
}

export type ExecutorFn = (_ctx: Record<string, unknown>) => Promise<{
  metadata?: Record<string, unknown>;
  newStateUpdates?: Partial<WorldState>;
  shouldReplan?: boolean;
}>;

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

  public async execute(
    startState: WorldState,
    goalState: Partial<WorldState>,
    ctx: Record<string, unknown>,
  ): Promise<ExecutionTrace> {
    const runId = 'run_' + Math.random().toString(36).slice(2, 9);
    const startTime = Date.now();
    Logger.info('goap-agent', 'plan_start', { runId, goalState });

    let currentState = { ...startState };
    const trace: ExecutionTrace = { runId, startTime, agents: [], finalWorldState: currentState };

    let plan = this.plan(currentState, goalState);

    let index = 0;
    while (index < plan.length) {
      const action = plan[index];
      if (!action) {
        throw new Error(`Action at index ${index} is undefined`);
      }
      const agentRecord: ExecutionAgentRecord = {
        id: Math.random().toString(36).substring(2, 11),
        agentId: action.agentId,
        name: action.name,
        startTime: Date.now(),
        status: 'running',
      };

      trace.agents.push(agentRecord);
      Logger.info('goap-agent', 'agent_start', {
        runId,
        agent: action.agentId,
        action: action.name,
      });

      // UI callbacks (if provided) and capture returned UI log id
      let uiLogId: string | undefined;
      if (typeof ctx.onAgentStart === 'function') {
        try {
          const result = ctx.onAgentStart(action);
          if (typeof result === 'string') {
            uiLogId = result;
          }
        } catch {
          /* ignore */
        }
      }

      const executor = this.executors[action.agentId];
      if (uiLogId !== undefined) {
        agentRecord.metadata = { ...(agentRecord.metadata || {}), uiLogId };
      }
      if (executor === undefined) {
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
          new Promise<never>((_, reject) =>
            setTimeout(() => {
              reject(new Error('executor_timeout'));
            }, this.perAgentTimeoutMs),
          ),
        ]);

        agentRecord.endTime = Date.now();
        agentRecord.status = 'completed';
        agentRecord.metadata = result.metadata;

        // Apply any state updates and action.effects
        if (result.newStateUpdates) {
          currentState = { ...currentState, ...result.newStateUpdates };
        }
        currentState = { ...currentState, ...action.effects };

        if (typeof ctx.onAgentEnd === 'function') ctx.onAgentEnd(action, agentRecord);

        Logger.info('goap-agent', 'agent_end', {
          runId,
          agent: action.agentId,
          status: 'completed',
          durationMs: agentRecord.endTime - agentRecord.startTime,
        });

        // Replan if needed
        if (result?.shouldReplan === true) {
          Logger.info('goap-agent', 'replan_triggered', { runId, agent: action.agentId });
          const replanStart = Date.now();
          plan = this.planner.plan(currentState, goalState);
          index = -1; // will increment to 0 for next loop
          Logger.info('goap-agent', 'replan_complete', {
            runId,
            durationMs: Date.now() - replanStart,
            newPlan: plan.map((a) => a.name),
          });
        }
      } catch (e: unknown) {
        agentRecord.endTime = Date.now();
        agentRecord.status = 'failed';
        agentRecord.error = e instanceof Error ? e.message : String(e);
        Logger.error('goap-agent', 'agent_failed', {
          runId,
          agent: action.agentId,
          error: e instanceof Error ? e.message : String(e),
        });

        if (typeof ctx.onAgentEnd === 'function') ctx.onAgentEnd(action, agentRecord);

        // Decide failure policy: skip non-critical and continue, abort on critical
        // Critical failure if executor throws a fatal error string 'Critical'
        if (e instanceof Error && e.message.includes('Critical')) {
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
