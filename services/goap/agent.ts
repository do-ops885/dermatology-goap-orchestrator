import { LOG_COMPONENT_GOAP_AGENT } from '../../config/constants';
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
    const safetyValidation = this.validateSafetyCalibration(nextAgent, currentState);
    if (!safetyValidation.valid) return safetyValidation;

    // Quality Gate 2: Sequential Dependency Validation
    const sequenceValidation = this.validateSequentialDependency(currentAgent, nextAgent);
    if (!sequenceValidation.valid) return sequenceValidation;

    // Quality Gate 3: State Consistency Checks
    const stateValidation = this.validateStateConsistency(nextAgent, currentState);
    if (!stateValidation.valid) return stateValidation;

    // Quality Gate 4: Confidence Threshold Validation
    warnings.push(...this.validateConfidenceThreshold(currentState));

    // Quality Gate 5: Safety Calibration Validation
    // Allow subsequent agents to run with safety calibration

    // Validate action preconditions
    const preconditionValidation = this.validatePreconditions(nextAction, currentState);
    if (!preconditionValidation.valid) return preconditionValidation;

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private validateSafetyCalibration(
    nextAgent: string,
    currentState: WorldState,
  ): { valid: boolean; reason?: string } {
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

    return { valid: true };
  }

  private validateSequentialDependency(
    currentAgent: string,
    nextAgent: string,
  ): { valid: boolean; reason?: string } {
    const agentOrder = [
      'Image-Verification-Agent',
      'Skin-Tone-Detection-Agent',
      'Standard-Calibration-Agent',
      'Safety-Calibration-Agent',
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

    return { valid: true };
  }

  private validateStateConsistency(
    nextAgent: string,
    currentState: WorldState,
  ): { valid: boolean; reason?: string } {
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

    return { valid: true };
  }

  private validateConfidenceThreshold(currentState: WorldState): string[] {
    const warnings: string[] = [];

    if (currentState.is_low_confidence && currentState.confidence_score > 0.65) {
      warnings.push('State inconsistency: is_low_confidence is true but confidence_score > 0.65');
    }

    if (!currentState.is_low_confidence && currentState.confidence_score < 0.65) {
      warnings.push('State inconsistency: is_low_confidence is false but confidence_score < 0.65');
    }

    return warnings;
  }

  private validatePreconditions(
    nextAction: AgentAction,
    currentState: WorldState,
  ): { valid: boolean; reason?: string } {
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

    return { valid: true };
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
    Logger.info(LOG_COMPONENT_GOAP_AGENT, 'plan_start', { runId, goalState });

    let currentState = { ...startState };
    const trace: ExecutionTrace = { runId, startTime, agents: [], finalWorldState: currentState };

    let plan = this.plan(currentState, goalState);
    let previousAgent: string | null = null;

    for (let index = 0; index < plan.length; index++) {
      const action = plan[index];
      if (!action) {
        throw new Error(`Action at index ${index} is undefined`);
      }

      const result = await this.executeAgent(
        runId,
        action,
        currentState,
        previousAgent,
        ctx,
        trace,
      );
      currentState = result.newState;
      previousAgent = result.previousAgent;

      if (result.shouldReplan) {
        plan = this.replan(runId, currentState, goalState, action.agentId);
        index = -1; // restart loop
      }
    }

    trace.endTime = Date.now();
    trace.finalWorldState = currentState;
    Logger.info(LOG_COMPONENT_GOAP_AGENT, 'plan_end', {
      runId,
      durationMs: trace.endTime - trace.startTime,
    });
    return trace;
  }

  private async executeAgent(
    runId: string,
    action: AgentAction,
    currentState: WorldState,
    previousAgent: string | null,
    ctx: AgentContext,
    trace: ExecutionTrace,
  ): Promise<{ newState: WorldState; previousAgent: string; shouldReplan: boolean }> {
    this.validateHandoffIfNeeded(runId, previousAgent, action, currentState);
    currentState = this.handoffCoordinator.ensureStateConsistency(currentState);

    const agentRecord = this.createAgentRecord(action);
    trace.agents.push(agentRecord);
    this.logAgentStart(runId, action);

    const uiLogId = this.handleUIStart(ctx, action);
    if (uiLogId !== undefined) {
      agentRecord.metadata = { ...(agentRecord.metadata ?? {}), uiLogId };
    }

    const executor = this.executors[action.agentId];
    if (!executor) {
      this.handleMissingExecutor(runId, action, agentRecord, ctx);
      throw new Error(`No executor found for agent: ${action.agentId}`);
    }

    try {
      const result = await this.runExecutorWithTimeout(executor, ctx);
      return this.handleExecutionSuccess(runId, action, result, currentState, agentRecord, ctx);
    } catch (e: unknown) {
      return this.handleExecutionError(runId, action, e, currentState, agentRecord, ctx, trace);
    }
  }

  private validateHandoffIfNeeded(
    runId: string,
    previousAgent: string | null,
    action: AgentAction,
    currentState: WorldState,
  ): void {
    if (previousAgent === undefined || previousAgent === null) return;

    const validation = this.handoffCoordinator.validateHandoff(
      previousAgent,
      action.agentId,
      currentState,
      action,
    );
    if (!validation.valid) {
      const error = new Error(`Agent handoff validation failed: ${validation.reason}`);
      Logger.error(LOG_COMPONENT_GOAP_AGENT, 'handoff_validation_failed', {
        runId,
        fromAgent: previousAgent,
        toAgent: action.agentId,
        reason: validation.reason,
      });
      throw error;
    }

    if (validation.warnings) {
      for (const warning of validation.warnings) {
        Logger.warn(LOG_COMPONENT_GOAP_AGENT, 'handoff_warning', {
          runId,
          fromAgent: previousAgent,
          toAgent: action.agentId,
          warning,
        });
      }
    }
  }

  private createAgentRecord(action: AgentAction): ExecutionAgentRecord {
    return {
      id: Math.random().toString(36).substring(2, 11),
      agentId: action.agentId,
      name: action.name,
      startTime: Date.now(),
      status: 'running',
    };
  }

  private logAgentStart(runId: string, action: AgentAction): void {
    Logger.info(LOG_COMPONENT_GOAP_AGENT, 'agent_start', {
      runId,
      agent: action.agentId,
      action: action.name,
    });
  }

  private handleUIStart(ctx: AgentContext, action: AgentAction): string | undefined {
    if (typeof ctx.onAgentStart !== 'function') return;
    try {
      const result = ctx.onAgentStart(action);
      return typeof result === 'string' ? result : undefined;
    } catch {
      return undefined;
    }
  }

  private handleMissingExecutor(
    runId: string,
    action: AgentAction,
    agentRecord: ExecutionAgentRecord,
    ctx: AgentContext,
  ): void {
    agentRecord.endTime = Date.now();
    agentRecord.status = 'failed';
    agentRecord.error = 'executor_missing';
    Logger.error(LOG_COMPONENT_GOAP_AGENT, 'executor_missing', { runId, agent: action.agentId });
    if (typeof ctx.onAgentEnd === 'function') ctx.onAgentEnd(action, agentRecord);
  }

  private async runExecutorWithTimeout(
    executor: ExecutorFn,
    ctx: AgentContext,
  ): Promise<ExecutorResult> {
    const execPromise = executor(ctx);
    return await Promise.race([
      execPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('executor_timeout')), this.perAgentTimeoutMs),
      ),
    ]);
  }

  private handleExecutionSuccess(
    runId: string,
    action: AgentAction,
    result: ExecutorResult,
    currentState: WorldState,
    agentRecord: ExecutionAgentRecord,
    ctx: AgentContext,
  ): { newState: WorldState; previousAgent: string; shouldReplan: boolean } {
    agentRecord.endTime = Date.now();
    agentRecord.status = 'completed';
    agentRecord.metadata = result.metadata ?? {};

    let newState = currentState;
    if (result.newStateUpdates) {
      newState = { ...newState, ...result.newStateUpdates };
    }
    newState = { ...newState, ...action.effects };

    if (typeof ctx.onAgentEnd === 'function') ctx.onAgentEnd(action, agentRecord);

    Logger.info(LOG_COMPONENT_GOAP_AGENT, 'agent_end', {
      runId,
      agent: action.agentId,
      status: 'completed',
      durationMs: agentRecord.endTime - agentRecord.startTime,
    });

    return { newState, previousAgent: action.agentId, shouldReplan: result.shouldReplan === true };
  }

  private handleExecutionError(
    runId: string,
    action: AgentAction,
    e: unknown,
    currentState: WorldState,
    agentRecord: ExecutionAgentRecord,
    ctx: AgentContext,
    trace: ExecutionTrace,
  ): { newState: WorldState; previousAgent: string; shouldReplan: boolean } {
    agentRecord.endTime = Date.now();
    agentRecord.status = 'failed';
    agentRecord.error = e instanceof Error ? e.message : String(e);
    Logger.error(LOG_COMPONENT_GOAP_AGENT, 'agent_failed', {
      runId,
      agent: action.agentId,
      error: e instanceof Error ? e.message : String(e),
    });

    if (typeof ctx.onAgentEnd === 'function') ctx.onAgentEnd(action, agentRecord);

    if (e instanceof Error && e.message.includes('Critical')) {
      trace.endTime = Date.now();
      trace.finalWorldState = currentState;
      Logger.error(LOG_COMPONENT_GOAP_AGENT, 'plan_aborted', { runId, reason: e.message });
      throw e;
    } else {
      agentRecord.status = 'skipped';
    }

    return { newState: currentState, previousAgent: action.agentId, shouldReplan: false };
  }

  private replan(
    runId: string,
    currentState: WorldState,
    goalState: Partial<WorldState>,
    agentId: string,
  ): AgentAction[] {
    Logger.info(LOG_COMPONENT_GOAP_AGENT, 'replan_triggered', { runId, agent: agentId });
    const replanStart = Date.now();
    const newPlan = this.planner.plan(currentState, goalState);
    Logger.info(LOG_COMPONENT_GOAP_AGENT, 'replan_complete', {
      runId,
      durationMs: Date.now() - replanStart,
      newPlan: newPlan.map((a) => a.name),
    });
    return newPlan;
  }
}
