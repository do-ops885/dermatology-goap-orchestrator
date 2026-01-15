import { describe, it, expect, vi } from 'vitest';

import { GOAPPlanner } from '../../services/goap';
import { GoapAgent } from '../../services/goap/agent';
import { INITIAL_STATE, type WorldState, type AgentAction } from '../../types';
import { createMockAgentContext } from '../test-helpers/mock-context';

import type { ExecutorFn } from '../../services/goap/agent';

const noopExecutor: ExecutorFn = async () => Promise.resolve({ metadata: { ok: true } });

const buildExecutorMap = (actions: AgentAction[]) => {
  const map: Record<string, ExecutorFn> = {};
  actions.forEach((a) => {
    map[a.agentId] = noopExecutor;
  });
  return map;
};

describe('GoapAgent', () => {
  describe('Planning', () => {
    it('should produce a non-empty plan to reach audit_logged', () => {
      const planner = new GOAPPlanner();
      const plan = planner.plan(INITIAL_STATE, { audit_logged: true });
      expect(plan.length).toBeGreaterThan(0);
      expect(plan[0]?.agentId).toBe('Image-Verification-Agent');
    });

    it('should handle low confidence by routing through Safety-Calibration-Agent', () => {
      const planner = new GOAPPlanner();
      const lowConfidenceState: WorldState = {
        ...INITIAL_STATE,
        image_verified: true,
        skin_tone_detected: true,
        is_low_confidence: true,
      };
      const plan = planner.plan(lowConfidenceState, { calibration_complete: true });
      const calibrationAction = plan.find((a) => a.name.includes('Calibration'));
      expect(calibrationAction?.agentId).toBe('Safety-Calibration-Agent');
    });
  });

  describe('Execution', () => {
    it('should execute a plan and return a trace with final state containing audit_logged', async () => {
      const planner = new GOAPPlanner();
      const plan = planner.plan(INITIAL_STATE, { audit_logged: true });
      const executors = buildExecutorMap(plan);

      const agent = new GoapAgent(planner, executors, { perAgentTimeoutMs: 5000 });

      const trace = await agent.execute(
        INITIAL_STATE,
        { audit_logged: true },
        createMockAgentContext(),
      );

      expect(trace.runId).toBeDefined();
      expect(trace.agents.length).toBeGreaterThan(0);
      expect(trace.finalWorldState.audit_logged).toBe(true);
      expect(trace.endTime).toBeDefined();
    });

    it('should call onAgentStart and onAgentEnd callbacks', async () => {
      const planner = new GOAPPlanner();
      const plan = planner.plan(INITIAL_STATE, { image_verified: true });
      const executors = buildExecutorMap(plan);
      const agent = new GoapAgent(planner, executors);

      const onAgentStart = vi.fn();
      const onAgentEnd = vi.fn();

      await agent.execute(
        INITIAL_STATE,
        { image_verified: true },
        createMockAgentContext({ onAgentStart, onAgentEnd }),
      );

      expect(onAgentStart).toHaveBeenCalled();
      expect(onAgentEnd).toHaveBeenCalled();
    });

    it('should handle executor failures gracefully for non-critical agents', async () => {
      const planner = new GOAPPlanner();
      const failingExecutor: ExecutorFn = async () =>
        Promise.reject(new Error('Non-critical failure'));

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': noopExecutor,
        'Skin-Tone-Detection-Agent': failingExecutor,
      };

      const agent = new GoapAgent(planner, executors);

      const trace = await agent.execute(
        INITIAL_STATE,
        { skin_tone_detected: true },
        createMockAgentContext(),
      );

      const failedAgent = trace.agents.find((a) => a.status === 'skipped');
      expect(failedAgent).toBeDefined();
    });

    it('should abort on critical failures', async () => {
      const planner = new GOAPPlanner();
      const criticalFailureExecutor: ExecutorFn = async () =>
        Promise.reject(new Error('Critical: System failure'));

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': criticalFailureExecutor,
      };

      const agent = new GoapAgent(planner, executors);

      await expect(
        agent.execute(INITIAL_STATE, { image_verified: true }, createMockAgentContext()),
      ).rejects.toThrow('Critical');
    });

    it('should support replanning when shouldReplan is returned', async () => {
      const planner = new GOAPPlanner();
      let callCount = 0;

      const replanningExecutor: ExecutorFn = async () => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            metadata: {},
            shouldReplan: true,
            newStateUpdates: { is_low_confidence: true },
          });
        }
        return Promise.resolve({ metadata: { ok: true } });
      };

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': noopExecutor,
        'Skin-Tone-Detection-Agent': replanningExecutor,
        'Safety-Calibration-Agent': noopExecutor,
        'Standard-Calibration-Agent': noopExecutor,
      };

      const agent = new GoapAgent(planner, executors);

      const trace = await agent.execute(
        INITIAL_STATE,
        { calibration_complete: true },
        createMockAgentContext(),
      );

      expect(trace.agents.length).toBeGreaterThan(0);
    });

    it('should apply state updates from executors', async () => {
      const planner = new GOAPPlanner();

      const stateUpdatingExecutor: ExecutorFn = async () =>
        Promise.resolve({
          metadata: { ok: true },
          newStateUpdates: { confidence_score: 0.95 },
        });

      const executors: Record<string, ExecutorFn> = {
        'Image-Verification-Agent': stateUpdatingExecutor,
      };

      const agent = new GoapAgent(planner, executors);

      const trace = await agent.execute(
        INITIAL_STATE,
        { image_verified: true },
        createMockAgentContext(),
      );

      expect(trace.finalWorldState.confidence_score).toBe(0.95);
    });
  });
});
