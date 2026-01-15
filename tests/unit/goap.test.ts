import { describe, it, expect } from 'vitest';

import { GOAPPlanner } from '../../services/goap';
import { INITIAL_STATE, type AgentAction, type WorldState } from '../../types';

describe('GOAPPlanner', () => {
  const mockActions: AgentAction[] = [
    {
      name: 'Action A',
      agentId: 'agent-a',
      cost: 1,
      preconditions: {},
      effects: { image_verified: true },
      description: 'Verifies image',
    },
    {
      name: 'Action B',
      agentId: 'agent-b',
      cost: 2,
      preconditions: { image_verified: true },
      effects: { skin_tone_detected: true },
      description: 'Detects skin tone',
    },
    {
      name: 'Action C',
      agentId: 'agent-c',
      cost: 1,
      preconditions: { skin_tone_detected: true },
      effects: { calibration_complete: true },
      description: 'Calibrates',
    },
    {
      name: 'Action D (Expensive Shortcut)',
      agentId: 'agent-d',
      cost: 50,
      preconditions: {},
      effects: { calibration_complete: true },
      description: 'Expensive calibration',
    },
  ];

  const planner = new GOAPPlanner(mockActions);

  it('should plan a sequence of actions to reach the goal (A -> B -> C)', () => {
    const startState: WorldState = { ...INITIAL_STATE };
    const goalState: Partial<WorldState> = { calibration_complete: true };

    const plan = planner.plan(startState, goalState);

    expect(plan).toHaveLength(3);
    expect(plan[0]?.agentId).toBe('agent-a');
    expect(plan[1]?.agentId).toBe('agent-b');
    expect(plan[2]?.agentId).toBe('agent-c');
  });

  it('should respect preconditions', () => {
    const startState: WorldState = { ...INITIAL_STATE, image_verified: true };
    const goalState: Partial<WorldState> = { skin_tone_detected: true };

    const plan = planner.plan(startState, goalState);

    expect(plan).toHaveLength(1);
    expect(plan[0]?.agentId).toBe('agent-b');
  });

  it('should replan correctly when starting from an intermediate state', () => {
    const startState: WorldState = {
      ...INITIAL_STATE,
      image_verified: true,
      skin_tone_detected: true,
    };
    const goalState: Partial<WorldState> = { calibration_complete: true };

    const plan = planner.plan(startState, goalState);

    expect(plan).toHaveLength(1);
    expect(plan[0]?.agentId).toBe('agent-c');
  });

  it('should calculate heuristics to avoid expensive paths', () => {
    const actionsWithShortcut = [
      ...mockActions,
      {
        name: 'Cheap Shortcut',
        agentId: 'agent-cheap',
        cost: 2,
        preconditions: {},
        effects: { calibration_complete: true },
        description: 'Cheap',
      },
    ];

    const cheapPlanner = new GOAPPlanner(actionsWithShortcut);
    const startState = { ...INITIAL_STATE };
    const goalState = { calibration_complete: true };

    const plan = cheapPlanner.plan(startState, goalState);
    expect(plan).toHaveLength(1);
    expect(plan[0]?.agentId).toBe('agent-cheap');
  });

  it('should handle multi-effect actions optimal path selection', () => {
    const multiEffectActions: AgentAction[] = [
      {
        name: 'Multi',
        agentId: 'multi',
        cost: 5,
        preconditions: {},
        effects: { features_extracted: true, risk_assessed: true } as Partial<WorldState>,
        description: '',
      },
      {
        name: 'Sep1',
        agentId: 'sep1',
        cost: 4,
        preconditions: {},
        effects: { features_extracted: true },
        description: '',
      },
      {
        name: 'Sep2',
        agentId: 'sep2',
        cost: 4,
        preconditions: {},
        effects: { risk_assessed: true },
        description: '',
      },
    ];

    const mePlanner = new GOAPPlanner(multiEffectActions);
    const startState = { ...INITIAL_STATE };
    const goalState = { features_extracted: true, risk_assessed: true };

    const plan = mePlanner.plan(startState, goalState);
    expect(plan).toHaveLength(1);
    expect(plan[0]?.agentId).toBe('multi');
  });

  it('should throw error if goal is unreachable', () => {
    const startState = { ...INITIAL_STATE };
    const goalState = { audit_logged: true };

    expect(() => {
      planner.plan(startState, goalState);
    }).toThrow('No plan found');
  });

  it('should return empty plan if goal is already met', () => {
    const startState = { ...INITIAL_STATE, calibration_complete: true };
    const goalState = { calibration_complete: true };

    const plan = planner.plan(startState, goalState);
    expect(plan).toHaveLength(0);
  });
});
