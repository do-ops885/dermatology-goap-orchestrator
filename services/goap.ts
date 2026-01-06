import { AgentAction, WorldState } from '../types';

export const AVAILABLE_ACTIONS: AgentAction[] = [
  {
    name: 'Verify Image',
    agentId: 'Image-Verification-Agent',
    cost: 1,
    preconditions: {}, // No specific world state, just needs input
    effects: { image_verified: true },
    description: 'Verifying image authenticity via Ed25519 signatures.'
  },
  {
    name: 'Detect Skin Tone',
    agentId: 'Skin-Tone-Detection-Agent',
    cost: 3,
    preconditions: { image_verified: true },
    effects: { skin_tone_detected: true },
    description: 'Classifying skin tone (Monk Scale/ITA) for fairness calibration.'
  },
  {
    name: 'Preprocess Image',
    agentId: 'Image-Preprocessing-Agent',
    cost: 2,
    preconditions: { skin_tone_detected: true },
    effects: { image_preprocessed: true },
    description: 'Applying melanin-preserving histogram equalization.'
  },
  {
    name: 'Segment Skin',
    agentId: 'Segmentation-Agent',
    cost: 5,
    preconditions: { image_preprocessed: true },
    effects: { segmentation_complete: true },
    description: 'Isolating skin regions using Fitzpatrick-calibrated thresholds.'
  },
  {
    name: 'Extract Features',
    agentId: 'Feature-Extraction-Agent',
    cost: 8,
    preconditions: { segmentation_complete: true },
    effects: { features_extracted: true },
    description: 'Running MobileNetV2 with FairDisCo disentanglement.'
  },
  {
    name: 'Detect Lesions',
    agentId: 'Lesion-Detection-Agent',
    cost: 10,
    preconditions: { features_extracted: true },
    effects: { lesions_detected: true },
    description: 'Identifying patterns using YOLOv11 + Skin Color Analysis.'
  },
  {
    name: 'Search Similar Cases',
    agentId: 'Similarity-Search-Agent',
    cost: 1,
    preconditions: { lesions_detected: true },
    effects: { similarity_searched: true },
    description: 'Querying AgentDB vector store for diverse historical cases.'
  },
  {
    name: 'Assess Risk',
    agentId: 'Risk-Assessment-Agent',
    cost: 3,
    preconditions: { similarity_searched: true },
    effects: { risk_assessed: true },
    description: 'Calculating risk score with equalized odds correction.'
  },
  {
    name: 'Validate Fairness',
    agentId: 'Fairness-Audit-Agent',
    cost: 2,
    preconditions: { risk_assessed: true },
    effects: { fairness_validated: true },
    description: 'Checking TPR/FPR gaps against thresholds.'
  },
  {
    name: 'Generate Recommendations',
    agentId: 'Recommendation-Agent',
    cost: 4,
    preconditions: { fairness_validated: true },
    effects: { recommendations_generated: true },
    description: 'Synthesizing actionable advice calibrated for skin tone.'
  },
  {
    name: 'Log Audit Trail',
    agentId: 'Audit-Trail-Agent',
    cost: 1,
    preconditions: { recommendations_generated: true },
    effects: { audit_logged: true },
    description: 'Committing Merkle proof to AgentDB.'
  }
];

interface PlannerNode {
  state: WorldState;
  parent: PlannerNode | null;
  action: AgentAction | null;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total estimated cost (g + h)
}

export class GOAPPlanner {
  
  /**
   * Calculates the heuristic cost (estimated cost to reach goal).
   * Uses the count of unsatisfied goal conditions.
   */
  private calculateHeuristic(state: WorldState, goal: Partial<WorldState>): number {
    let cost = 0;
    for (const key in goal) {
      const k = key as keyof WorldState;
      if (goal[k] !== undefined && state[k] !== goal[k]) {
        // We assume at least cost 1 per missing action to drive A* towards goal
        cost += 1;
      }
    }
    return cost;
  }

  /**
   * Checks if the current state satisfies the goal state.
   */
  private satisfiesGoal(state: WorldState, goal: Partial<WorldState>): boolean {
    for (const key in goal) {
      const k = key as keyof WorldState;
      if (goal[k] !== undefined && state[k] !== goal[k]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if an action's preconditions are met by the current state.
   */
  private checkPreconditions(state: WorldState, preconditions: Partial<WorldState>): boolean {
    for (const key in preconditions) {
      const k = key as keyof WorldState;
      if (preconditions[k] !== undefined && state[k] !== preconditions[k]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Applies an action's effects to the current state to produce a new state.
   */
  private applyEffects(state: WorldState, effects: Partial<WorldState>): WorldState {
    return { ...state, ...effects };
  }

  /**
   * Generates a unique string key for a WorldState for hashing in the closed set.
   */
  private getStateKey(state: WorldState): string {
    // Sort keys to ensure deterministic stringify
    return JSON.stringify(state, Object.keys(state).sort());
  }

  /**
   * Plans a sequence of actions to reach the goal state from the current state using A* search.
   */
  public plan(startState: WorldState, goalState: Partial<WorldState>): AgentAction[] {
    const openList: PlannerNode[] = [];
    const closedSet = new Set<string>();

    // Initial Node
    const h = this.calculateHeuristic(startState, goalState);
    openList.push({
      state: startState,
      parent: null,
      action: null,
      g: 0,
      h: h,
      f: 0 + h
    });

    while (openList.length > 0) {
      // Get node with lowest f score (Priority Queue simulation)
      openList.sort((a, b) => a.f - b.f);
      const currentNode = openList.shift()!;

      // Check if goal reached
      if (this.satisfiesGoal(currentNode.state, goalState)) {
        // Reconstruct path
        const plan: AgentAction[] = [];
        let node: PlannerNode | null = currentNode;
        while (node.action) {
          plan.unshift(node.action);
          node = node.parent;
        }
        return plan;
      }

      const stateKey = this.getStateKey(currentNode.state);
      closedSet.add(stateKey);

      // Explore neighbors (available actions)
      for (const action of AVAILABLE_ACTIONS) {
        // Can we perform this action in the current state?
        if (this.checkPreconditions(currentNode.state, action.preconditions)) {
          
          const newState = this.applyEffects(currentNode.state, action.effects);
          const newStateKey = this.getStateKey(newState);

          if (closedSet.has(newStateKey)) continue;

          const g = currentNode.g + action.cost;
          const h = this.calculateHeuristic(newState, goalState);
          const f = g + h;

          // Check if neighbor is already in open list with lower cost
          const existingNodeIndex = openList.findIndex(n => this.getStateKey(n.state) === newStateKey);
          
          if (existingNodeIndex !== -1) {
            if (g < openList[existingNodeIndex].g) {
               // Found a better path to an existing node
               openList[existingNodeIndex].g = g;
               openList[existingNodeIndex].f = f;
               openList[existingNodeIndex].parent = currentNode;
               openList[existingNodeIndex].action = action;
            }
          } else {
            // New node discovered
            openList.push({
              state: newState,
              parent: currentNode,
              action,
              g,
              h,
              f
            });
          }
        }
      }
    }

    // If loop finishes without returning, no plan exists
    throw new Error("GOAP Planner could not find a valid plan to reach the goal state.");
  }
}