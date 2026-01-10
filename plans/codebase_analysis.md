# Codebase Analysis: Dermatology AI Orchestrator

## 1. Executive Summary
The **Dermatology AI Orchestrator** is a production-grade Progressive Web App (PWA) for clinical skin analysis. It leverages a **Goal-Oriented Action Planning (GOAP)** architecture to orchestrate a hybrid team of AI agents (Cloud + Edge).

## 2. Core Architecture: GOAP Orchestrator
- **Planner:** `services/goap.ts` (A* Search, Robust Heuristics). Consider adding a `GoapAgent` wrapper to expose orchestrator APIs and traceability.
- **Controller:** `hooks/useClinicalAnalysis.ts`. Handles the main loop, state updates, and service coordination (should call `goap-agent` APIs rather than embedding planner logic directly).

## 3. Key Technical Components

### 3.1. Hybrid AI Engine
- **Vision (Edge):** `services/vision.ts`. Uses **TensorFlow.js** (WebGPU/WebGL) with MobileNetV2. Includes logic for backend fallback.
- **LLM (Edge):** `services/agentDB.ts` integrates `LocalLLMService` using **WebLLM** (SmolLM2-1.7B) for offline reasoning.
- **Reasoning (Cloud):** Uses **Google GenAI** (`@google/genai`) for multimodal analysis (skin tone detection) and grounding (Google Search).

### 3.2. Memory & Fairness
- **AgentDB:** `services/agentDB.ts`. Local vector database (`ReasoningBank`) for storing audit logs and learned patterns.
- **Fairness Dashboard:** `components/FairnessDashboard.tsx`. Visualizes live TPR/FPR metrics derived from AgentDB.

### 3.3. Security
- **Input:** Magic Byte validation and size limits.
- **Traceability:** SHA-256 image hashing and AgentDB audit logging.

## 4. File Structure Highlights

| File Path | Component / Service | Status |
| :--- | :--- | :--- |
| `services/goap.ts` | **Planner** | Stable. Implements A*. |
| `services/agentDB.ts` | **Memory/LLM** | Active. Includes `LocalLLMService` implementation. |
| `services/vision.ts` | **Vision** | Active. TFJS implementation with mock mapping logic. |
| `services/router.ts` | **Router** | Active. Client-side intent classification. |
| `components/AgentFlow.tsx` | **UI** | Visualization of agent execution trace. |
| `tests/e2e/` | **QA** | Playwright scenarios covering Happy Path & Safety. |
| `plans/` | **Docs** | Strategic documentation for specialized agents. |

## 5. Current Focus
Transitioning from **Prototype** to **Refinement**.
- **Optimization:** Caching large model weights.
- **Security:** Implementing real AES-GCM payload encryption.
- **Testing:** Expanding unit coverage for internal service logic.