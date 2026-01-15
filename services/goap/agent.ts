import { Logger } from '../logger';

import type { AgentAction, WorldState } from '../../types';
import type { AgentContext } from '../executors/types';
import type { GOAPPlanner } from '../goap';

/**
 * Agent Handoff Coordination Protocol
 * Ensures proper state management and quality gate validation during agent transitions
 */
export class AgentHandoffCoordinator {
  /**
   * Validates that an agent can safely hand off to the next agent in the pipeline
   */
  validateHandoff(
    currentAgent: string,
    nextAgent: string,
    currentState: WorldState,
    nextAction: AgentAction,
  ): { valid: boolean; reason?: string; warnings?: string[] } {
    const warnings: string[] = [];

    // Quality Gate 1: Low Confidence Safety Routing
    if (nextAgent === 'Safety-Calibration-Agent' && !currentState.is_low_confidence) {
      return {
        valid: false,
        reason: 'Safety-Calibration-Agent can only be executed when is_low_confidence is true',
      };
    }

    if (nextAgent === 'Standard-Calibration-Agent' && currentState.is_low_confidence) {
      return {
        valid: false,
        reason:
          'Standard-Calibration-Agent cannot be executed when is_low_confidence is true - must use Safety-Calibration-Agent',
      };
    }

    // Quality Gate 2: Sequential Dependency Validation
    const agentOrder = [
      'Image-Verification-Agent',
      'Skin-Tone-Detection-Agent',
      'Standard-Calibration-Agent', // or Safety-Calibration-Agent
      'Safety-Calibration-Agent', // or Standard-Calibration-Agent
      'Image-Preprocessing-Agent',
      'Segmentation-Agent',
      'Feature-Extraction-Agent',
      'Lesion-Detection-Agent',
      'Similarity-Search-Agent',
      'Risk-Assessment-Agent',
      'Fairness-Audit-Agent',
      'Web-Verification-Agent',
      'Recommendation-Agent',
      'Learning-Agent',
      'Privacy-Encryption-Agent',
      'Audit-Trail-Agent',
    ];

    const currentIndex = agentOrder.indexOf(currentAgent);
    const nextIndex = agentOrder.indexOf(nextAgent);

    if (nextIndex === -1) {
      return { valid: false, reason: `Unknown agent: ${nextAgent}` };
    }

    if (nextIndex < currentIndex && nextIndex !== currentIndex) {
      return { valid: false, reason: 'Cannot go backwards in agent sequence' };
    }

    // Quality Gate 3: State Consistency Checks
    if (nextAgent === 'Image-Preprocessing-Agent' && !currentState.calibration_complete) {
      return {
        valid: false,
        reason: 'Image-Preprocessing-Agent requires calibration_complete to be true',
      };
    }

    if (nextAgent === 'Segmentation-Agent' && !currentState.image_preprocessed) {
      return {
        valid: false,
        reason: 'Segmentation-Agent requires image_preprocessed to be true',
      };
    }

    // Quality Gate 4: Confidence Threshold Validation
    if (currentState.is_low_confidence && currentState.confidence_score > 0.65) {
      warnings.push('State inconsistency: is_low_confidence is true but confidence_score > 0.65');
    }

    if (!currentState.is_low_confidence && currentState.confidence_score < 0.65) {
      warnings.push('State inconsistency: is_low_confidence is false but confidence_score < 0.65');
    }

    // Quality Gate 5: Safety Calibration Validation
    if (currentState.safety_calibrated && nextAgent !== 'Safety-Calibration-Agent') {
      // Allow subsequent agents to run with safety calibration
    }

    // Validate action preconditions
    for (const key in nextAction.preconditions) {
      const k = key as keyof WorldState;
      if (
        nextAction.preconditions[k] !== undefined &&
        currentState[k] !== nextAction.preconditions[k]
      ) {
        return {
          valid: false,
          reason: `Precondition not met: ${key} must be ${nextAction.preconditions[k]}, but is ${currentState[k]}`,
        };
      }
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Logs quality gate violations for monitoring
   */
  logQualityGateViolation(violation: string, context: Record<string, unknown>): void {
    Logger.warn('quality-gate', 'violation_detected', {
      violation,
      ...context,
    });
  }

  /**
   * Ensures state consistency before agent execution
   */
  ensureStateConsistency(state: WorldState): WorldState {
    const correctedState = { ...state };

    // Auto-correct confidence flags if inconsistent
    if (correctedState.confidence_score < 0.65 && !correctedState.is_low_confidence) {
      correctedState.is_low_confidence = true;
      Logger.warn('state-consistency', 'auto_corrected_low_confidence', {
        confidence_score: correctedState.confidence_score,
      });
    }

    if (correctedState.confidence_score >= 0.65 && correctedState.is_low_confidence) {
      correctedState.is_low_confidence = false;
      Logger.warn('state-consistency', 'auto_corrected_high_confidence', {
        confidence_score: correctedState.confidence_score,
      });
    }

    return correctedState;
  }
}

export type ExecutorFn = (_ctx: AgentContext) => Promise<ExecutorResult>;

export interface ExecutorResult {
  metadata: Record<string, unknown>;
  newStateUpdates?: Partial<WorldState>;
  shouldReplan?: boolean;
}

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

export type ExecutorMap = Record<string, ExecutorFn>;

export class GoapAgent {
  private planner: GOAPPlanner;
  private executors: ExecutorMap;
  private perAgentTimeoutMs: number;
  private handoffCoordinator: AgentHandoffCoordinator;

  constructor(planner: GOAPPlanner, executors: ExecutorMap, opts?: { perAgentTimeoutMs?: number }) {
    this.planner = planner;
    this.executors = executors;
    this.perAgentTimeoutMs = opts?.perAgentTimeoutMs ?? 10000;
    this.handoffCoordinator = new AgentHandoffCoordinator();
  }

  public plan(startState: WorldState, goalState: Partial<WorldState>): AgentAction[] {
    return this.planner.plan(startState, goalState);
  }

  public async execute(
    startState: WorldState,
    goalState: Partial<WorldState>,
    ctx: AgentContext,
  ): Promise<ExecutionTrace> {
    const runId = 'run_' + Math.random().toString(36).slice(2, 9);
    const startTime = Date.now();
    Logger.info('goap-agent', 'plan_start', { runId, goalState });

    let currentState = { ...startState };
    const trace: ExecutionTrace = { runId, startTime, agents: [], finalWorldState: currentState };

    let plan = this.plan(currentState, goalState);

    let index = 0;
    let previousAgent: string | null = null;

    while (index < plan.length) {
      const action = plan[index];
      if (!action) {
        throw new Error(`Action at index ${index} is undefined`);
      }

      // Quality Gate Validation: Validate handoff from previous agent
      if (previousAgent) {
        const validation = this.handoffCoordinator.validateHandoff(
          previousAgent,
          action.agentId,
          currentState,
          action,
        );

        if (!validation.valid) {
          const error = new Error(`Agent handoff validation failed: ${validation.reason}`);
          Logger.error('goap-agent', 'handoff_validation_failed', {
            runId,
            fromAgent: previousAgent,
            toAgent: action.agentId,
            reason: validation.reason,
          });
          throw error;
        }

        if (validation.warnings) {
          for (const warning of validation.warnings) {
            Logger.warn('goap-agent', 'handoff_warning', {
              runId,
              fromAgent: previousAgent,
              toAgent: action.agentId,
              warning,
            });
          }
        }
      }

      // Ensure state consistency before execution
      currentState = this.handoffCoordinator.ensureStateConsistency(currentState);

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
        const execPromise = executor(ctx);
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

        // Update previous agent for next handoff validation
        previousAgent = action.agentId;

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
          // Mark as skipped and continue - do not update previousAgent for skipped agents
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
