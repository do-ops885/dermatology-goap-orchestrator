import { AgentAction, WorldState } from '../types';

export const AVAILABLE_ACTIONS: AgentAction[] = [
  {
    name: 'Verify Image',
    agentId: 'Image-Verification-Agent',
    cost: 1,
    preconditions: {}, 
    effects: { image_verified: true },
    description: 'Verifying image authenticity via Ed25519 signatures.'
  },
  {
    name: 'Detect Skin Tone',
    agentId: 'Skin-Tone-Detection-Agent',
    cost: 2, // Lowered cost to ensure it's prioritized early
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
    cost: 1, // Cheap operation via AgentDB
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
    name: 'Update Learning Model',
    agentId: 'Learning-Agent',
    cost: 2,
    preconditions: { recommendations_generated: true },
    effects: { learning_updated: true },
    description: 'Updating cognitive patterns with bias monitoring (SMOTE/Reflexion).'
  },
  {
    name: 'Encrypt Data',
    agentId: 'Privacy-Encryption-Agent',
    cost: 2,
    preconditions: { learning_updated: true },
    effects: { data_encrypted: true },
    description: 'Encrypting patient data with AES-256 and differential privacy.'
  },
  {
    name: 'Log Audit Trail',
    agentId: 'Audit-Trail-Agent',
    cost: 1,
    preconditions: { data_encrypted: true },
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
  private minCostCache: Map<keyof WorldState, number> = new Map();

  constructor() {
    this.initializeHeuristics();
  }

  /**
   * Pre-calculates the minimum cost to achieve any specific state property.
   * This allows the heuristic to be admissible (never overestimates) but
   * much more informative than a simple count.
   */
  private initializeHeuristics() {
    AVAILABLE_ACTIONS.forEach(action => {
      for (const [key, _] of Object.entries(action.effects)) {
        const k = key as keyof WorldState;
        const currentMin = this.minCostCache.get(k) || Infinity;
        if (action.cost < currentMin) {
          this.minCostCache.set(k, action.cost);
        }
      }
    });
  }

  /**
   * Improved Heuristic: Sum of minimum costs for all unsatisfied goal conditions.
   */
  private calculateHeuristic(state: WorldState, goal: Partial<WorldState>): number {
    let cost = 0;
    for (const key in goal) {
      const k = key as keyof WorldState;
      if (goal[k] !== undefined && state[k] !== goal[k]) {
        // Use the pre-calculated minimum cost to satisfy this specific condition
        // If unknown, default to 1 to ensure progress
        cost += this.minCostCache.get(k) || 1;
      }
    }
    return cost;
  }

  private satisfiesGoal(state: WorldState, goal: Partial<WorldState>): boolean {
    for (const key in goal) {
      const k = key as keyof WorldState;
      if (goal[k] !== undefined && state[k] !== goal[k]) {
        return false;
      }
    }
    return true;
  }

  private checkPreconditions(state: WorldState, preconditions: Partial<WorldState>): boolean {
    for (const key in preconditions) {
      const k = key as keyof WorldState;
      if (preconditions[k] !== undefined && state[k] !== preconditions[k]) {
        return false;
      }
    }
    return true;
  }

  private applyEffects(state: WorldState, effects: Partial<WorldState>): WorldState {
    return { ...state, ...effects };
  }

  private getStateKey(state: WorldState): string {
    // We only care about boolean flags for the planning graph to reduce state space
    // excluding dynamic numeric values like scores
    const flags: Partial<Record<keyof WorldState, any>> = {};
    for (const key of Object.keys(state) as Array<keyof WorldState>) {
      if (typeof state[key] === 'boolean' || state[key] === null) {
        flags[key] = state[key];
      }
    }
    return JSON.stringify(flags, Object.keys(flags).sort());
  }

  /**
   * Robust A* Planner
   * Handles non-linear dependencies by exploring the state graph based on cost.
   * Prioritizes low-cost, high-impact fairness gates via the cost definitions.
   */
  public plan(startState: WorldState, goalState: Partial<WorldState>): AgentAction[] {
    const openList: PlannerNode[] = [];
    const closedSet = new Set<string>();
    const MAX_ITERATIONS = 1000; // Safety brake

    const h = this.calculateHeuristic(startState, goalState);
    openList.push({
      state: startState,
      parent: null,
      action: null,
      g: 0,
      h: h,
      f: h
    });

    let iterations = 0;

    while (openList.length > 0) {
      if (iterations++ > MAX_ITERATIONS) {
        throw new Error("GOAP Planner exceeded maximum iterations. Complexity too high or no path found.");
      }

      // Sort by F score (lowest first)
      // Optimization: In a real heavy-duty app, use a Binary Heap here
      openList.sort((a, b) => a.f - b.f);
      const currentNode = openList.shift()!;

      if (this.satisfiesGoal(currentNode.state, goalState)) {
        return this.reconstructPath(currentNode);
      }

      const stateKey = this.getStateKey(currentNode.state);
      closedSet.add(stateKey);

      for (const action of AVAILABLE_ACTIONS) {
        if (this.checkPreconditions(currentNode.state, action.preconditions)) {
          
          const newState = this.applyEffects(currentNode.state, action.effects);
          const newStateKey = this.getStateKey(newState);

          if (closedSet.has(newStateKey)) continue;

          const g = currentNode.g + action.cost;
          const h = this.calculateHeuristic(newState, goalState);
          const f = g + h;

          const existingNodeIndex = openList.findIndex(n => this.getStateKey(n.state) === newStateKey);
          
          if (existingNodeIndex !== -1) {
            if (g < openList[existingNodeIndex].g) {
              // Found a better path to this state
              openList[existingNodeIndex].g = g;
              openList[existingNodeIndex].f = f;
              openList[existingNodeIndex].parent = currentNode;
              openList[existingNodeIndex].action = action;
            }
          } else {
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

    throw new Error("No plan found to satisfy the goal state.");
  }

  private reconstructPath(node: PlannerNode): AgentAction[] {
    const plan: AgentAction[] = [];
    let current: PlannerNode | null = node;
    while (current && current.action) {
      plan.unshift(current.action);
      current = current.parent;
    }
    return plan;
  }
}