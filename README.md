<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1j9ABnJHjI5eRu6ucIRS3hKr0rXNmPlG-

## About This Application

This is a **Clinical AI Orchestrator** powered by a **Goal-Oriented Action Planning (GOAP)** system. The orchestrator coordinates multiple autonomous AI agents to perform skin lesion analysis with a focus on diagnostic equity across all skin tones.

**Key Features:**
- **GOAP Agent Orchestration**: Runtime planner that dynamically sequences 16+ specialized agents based on world state transitions
- **Fairness-First Design**: Adaptive calibration ensures equitable performance across Fitzpatrick/Monk skin tone scales
- **Edge AI Processing**: Runs entirely offline using WebGPU (TensorFlow.js), WebLLM (SmolLM2), and local vector storage
- **Safety Mechanisms**: Low-confidence detection triggers conservative thresholds; human-in-the-loop validation for critical decisions
- **Privacy by Design**: AES-256-GCM encryption, on-device processing, immutable audit trails

For detailed architecture, see `AGENTS.md` and plans in `/plans/`.

## Repository Configuration

This repository follows 2025 GitHub best practices for security, automation, and code quality. For details on:

- GitHub Actions workflows (CI/CD, Security, E2E Tests)
- Auto-merge configuration for dependencies
- Branch protection rules
- Dependabot settings
- Code quality and security scanning

See [`.github/REPO_CONFIGURATION.md`](.github/REPO_CONFIGURATION.md).

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
