import type { AgentAction, WorldState } from '../types';

export const AVAILABLE_ACTIONS: AgentAction[] = [
  {
    name: 'Verify Image',
    agentId: 'Image-Verification-Agent',
    cost: 1,
    preconditions: {},
    effects: { image_verified: true },
    description: 'Verifying image authenticity via Ed25519 signatures.',
  },
  {
    name: 'Detect Skin Tone',
    agentId: 'Skin-Tone-Detection-Agent',
    cost: 2,
    preconditions: { image_verified: true },
    effects: { skin_tone_detected: true },
    description: 'Classifying skin tone (Monk Scale/ITA) and measuring detection confidence.',
  },
  {
    name: 'Standard Calibration',
    agentId: 'Standard-Calibration-Agent',
    cost: 1,
    preconditions: { skin_tone_detected: true, is_low_confidence: false },
    effects: { calibration_complete: true, safety_calibrated: false },
    description: 'Applying standard fairness thresholds for high-confidence classification.',
  },
  {
    name: 'Safety Calibration',
    agentId: 'Safety-Calibration-Agent',
    cost: 1,
    preconditions: { skin_tone_detected: true, is_low_confidence: true },
    effects: { calibration_complete: true, safety_calibrated: true },
    description: 'Enforcing conservative safety margins due to low detection confidence.',
  },
  {
    name: 'Preprocess Image',
    agentId: 'Image-Preprocessing-Agent',
    cost: 2,
    preconditions: { calibration_complete: true },
    effects: { image_preprocessed: true },
    description: 'Applying melanin-preserving histogram equalization.',
  },
  {
    name: 'Segment Skin',
    agentId: 'Segmentation-Agent',
    cost: 5,
    preconditions: { image_preprocessed: true },
    effects: { segmentation_complete: true },
    description: 'Isolating skin regions using calibrated thresholds.',
  },
  {
    name: 'Extract Features',
    agentId: 'Feature-Extraction-Agent',
    cost: 8,
    preconditions: { segmentation_complete: true },
    effects: { features_extracted: true },
    description: 'Running MobileNetV2 with FairDisCo disentanglement.',
  },
  {
    name: 'Detect Lesions',
    agentId: 'Lesion-Detection-Agent',
    cost: 10,
    preconditions: { features_extracted: true },
    effects: { lesions_detected: true },
    description: 'Identifying patterns using YOLOv11 + Skin Color Analysis.',
  },
  {
    name: 'Search Similar Cases',
    agentId: 'Similarity-Search-Agent',
    cost: 1,
    preconditions: { lesions_detected: true },
    effects: { similarity_searched: true },
    description: 'Querying AgentDB vector store for diverse historical cases.',
  },
  {
    name: 'Assess Risk',
    agentId: 'Risk-Assessment-Agent',
    cost: 3,
    preconditions: { similarity_searched: true },
    effects: { risk_assessed: true },
    description: 'Calculating risk score with equalized odds correction.',
  },
  {
    name: 'Validate Fairness',
    agentId: 'Fairness-Audit-Agent',
    cost: 2,
    preconditions: { risk_assessed: true },
    effects: { fairness_validated: true },
    description: 'Checking TPR/FPR gaps against thresholds.',
  },
  {
    name: 'Verify Diagnosis (Web)',
    agentId: 'Web-Verification-Agent',
    cost: 4,
    preconditions: { fairness_validated: true },
    effects: { web_verified: true },
    description: 'Grounding diagnosis with real-time medical literature search.',
  },
  {
    name: 'Generate Recommendations',
    agentId: 'Recommendation-Agent',
    cost: 4,
    preconditions: { web_verified: true },
    effects: { recommendations_generated: true },
    description: 'Synthesizing actionable advice calibrated for skin tone.',
  },
  {
    name: 'Update Learning Model',
    agentId: 'Learning-Agent',
    cost: 2,
    preconditions: { recommendations_generated: true },
    effects: { learning_updated: true },
    description: 'Updating cognitive patterns with bias monitoring.',
  },
  {
    name: 'Encrypt Data',
    agentId: 'Privacy-Encryption-Agent',
    cost: 2,
    preconditions: { learning_updated: true },
    effects: { data_encrypted: true },
    description: 'Encrypting patient data with AES-256.',
  },
  {
    name: 'Log Audit Trail',
    agentId: 'Audit-Trail-Agent',
    cost: 1,
    preconditions: { data_encrypted: true },
    effects: { audit_logged: true },
    description: 'Committing Merkle proof to AgentDB.',
  },
];

interface PlannerNode {
  state: WorldState;
  parent: PlannerNode | null;
  action: AgentAction | null;
  g: number;
  h: number;
  f: number;
}

export class GOAPPlanner {
  private actions: AgentAction[];

  constructor(actions: AgentAction[] = AVAILABLE_ACTIONS) {
    this.actions = actions;
  }

  /**
   * Main Planning Method: A* Search
   * Finds the lowest-cost sequence of actions to transform startState to goalState.
   */
  public plan(startState: WorldState, goalState: Partial<WorldState>): AgentAction[] {
    const openList: PlannerNode[] = [];
    const closedSet = new Set<string>();

    const h = this.calculateRobustHeuristic(startState, goalState);
    openList.push(this.createInitialNode(startState, h));

    let iterations = 0;
    const MAX_ITERATIONS = 5000;

    while (openList.length > 0) {
      if (iterations++ > MAX_ITERATIONS) {
        throw new Error('GOAP Planner exceeded maximum iterations. No valid path found.');
      }

      const currentNode = this.selectBestNode(openList);
      if (this.satisfiesGoal(currentNode.state, goalState)) {
        return this.reconstructPath(currentNode);
      }

      const stateKey = this.getStateKey(currentNode.state);
      if (closedSet.has(stateKey)) continue;
      closedSet.add(stateKey);

      this.expandNode(currentNode, openList, closedSet, goalState);
    }

    throw new Error('No plan found to satisfy the goal state.');
  }

  private createInitialNode(state: WorldState, h: number): PlannerNode {
    return {
      state,
      parent: null,
      action: null,
      g: 0,
      h,
      f: h,
    };
  }

  private selectBestNode(openList: PlannerNode[]): PlannerNode {
    openList.sort((a, b) => a.f - b.f);
    const node = openList.shift();
    if (!node) throw new Error('Open list is empty');
    return node;
  }

  private expandNode(
    currentNode: PlannerNode,
    openList: PlannerNode[],
    closedSet: Set<string>,
    goalState: Partial<WorldState>,
  ): void {
    const neighbors = this.getApplicableActions(currentNode.state);

    for (const action of neighbors) {
      const newState = this.applyEffects(currentNode.state, action.effects);
      const newStateKey = this.getStateKey(newState);

      if (closedSet.has(newStateKey)) continue;

      const g = currentNode.g + action.cost;
      const h = this.calculateRobustHeuristic(newState, goalState);
      const f = g + h;

      this.updateOrAddNode(openList, newState, currentNode, action, g, h, f);
    }
  }

  private updateOrAddNode(
    openList: PlannerNode[],
    newState: WorldState,
    parent: PlannerNode,
    action: AgentAction,
    g: number,
    h: number,
    f: number,
  ): void {
    const newStateKey = this.getStateKey(newState);
    const existingIndex = openList.findIndex((n) => this.getStateKey(n.state) === newStateKey);

    if (existingIndex !== -1) {
      const existing = openList[existingIndex];
      if (existing && g < existing.g) {
        existing.g = g;
        existing.f = f;
        existing.parent = parent;
        existing.action = action;
      }
    } else {
      openList.push({
        state: newState,
        parent,
        action,
        g,
        h,
        f,
      });
    }
  }

  /**
   * Backward-Chaining Heuristic
   * Estimates cost by walking backwards from unsatisfied goals through the dependency chain.
   * This provides a much more informed H-value than simple summation, as it accounts
   * for the deep precondition tree (e.g., Audit needs Encryption, which needs Learning...).
   */
  private calculateRobustHeuristic(
    currentState: WorldState,
    goalState: Partial<WorldState>,
  ): number {
    let estimatedCost = 0;
    const visited = new Set<string>();
    const queue: { key: keyof WorldState; value: unknown }[] = [];

    // Initialize queue with unsatisfied goals
    for (const key in goalState) {
      const k = key as keyof WorldState;
      if (currentState[k] !== goalState[k]) {
        queue.push({ key: k, value: goalState[k] });
      }
    }

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const itemKeyStr = `${item.key}:${item.value}`;

      if (visited.has(itemKeyStr)) continue;
      visited.add(itemKeyStr);

      // Check if already satisfied in current state
      if (currentState[item.key] === item.value) continue;

      // Find best action to satisfy this requirement
      // We filter for actions that produce the specific effect value we need
      const relevantActions = this.actions.filter(
        (action) => action.effects[item.key] === item.value,
      );

      if (relevantActions.length === 0) continue; // No action produces this state (should be error in well-formed domain)

      // Optimistic: Pick the cheapest action
      const bestAction = relevantActions.reduce((min, cur) => (cur.cost < min.cost ? cur : min));

      estimatedCost += bestAction.cost;

      // Add preconditions of this action to the queue
      for (const preKey in bestAction.preconditions) {
        const pk = preKey as keyof WorldState;
        const requiredVal = bestAction.preconditions[pk];

        if (currentState[pk] !== requiredVal) {
          queue.push({ key: pk, value: requiredVal });
        }
      }
    }

    return estimatedCost;
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

  private getApplicableActions(state: WorldState): AgentAction[] {
    return this.actions.filter((action) => {
      for (const key in action.preconditions) {
        const k = key as keyof WorldState;
        if (action.preconditions[k] !== undefined && state[k] !== action.preconditions[k]) {
          return false;
        }
      }
      return true;
    });
  }

  private applyEffects(state: WorldState, effects: Partial<WorldState>): WorldState {
    return { ...state, ...effects };
  }

  private getStateKey(state: WorldState): string {
    // Generate a unique string key for the state to use in Sets/Maps
    // We sort keys to ensure deterministic output
    const relevantKeys = Object.keys(state).sort() as (keyof WorldState)[];
    const values = relevantKeys.map((k) => `${k}:${String(state[k])}`);
    return values.join('|');
  }

  private reconstructPath(node: PlannerNode): AgentAction[] {
    const plan: AgentAction[] = [];
    let current: PlannerNode | null = node;
    while (current?.action) {
      plan.unshift(current.action);
      current = current.parent;
    }
    return plan;
  }
}
