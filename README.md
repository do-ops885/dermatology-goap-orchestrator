# Dermatology AI Orchestrator

[![CI](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/ci.yml/badge.svg)](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/ci.yml)
[![Lint](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/lint.yml/badge.svg)](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/lint.yml)
[![Code Quality](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/code-quality.yml/badge.svg)](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/code-quality.yml)
[![E2E Tests](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/e2e.yml/badge.svg)](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/e2e.yml)
[![Security](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/security.yml/badge.svg)](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/security.yml)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-green)](.github/workflows) [![CI](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/ci.yml/badge.svg)](https://github.com/do-ops885/dermatology-goap-orchestrator/actions/workflows/ci.yml)

A **Clinical AI Orchestrator** powered by a **Goal-Oriented Action Planning (GOAP)** system. The orchestrator coordinates multiple autonomous AI agents to perform skin lesion analysis with a focus on diagnostic equity across all skin tones.

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Development](#development)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Key Features

- **GOAP Agent Orchestration**: Runtime planner that dynamically sequences 16+ specialized agents based on world state transitions
- **Fairness-First Design**: Adaptive calibration ensures equitable performance across Fitzpatrick/Monk skin tone scales
- **Edge AI Processing**: Runs entirely offline using WebGPU (TensorFlow.js), WebLLM (SmolLM2), and local vector storage
- **Safety Mechanisms**: Low-confidence detection triggers conservative thresholds; human-in-the-loop validation for critical decisions
- **Privacy by Design**: AES-256-GCM encryption, on-device processing, immutable audit trails
- **PWA Support**: Installable as a progressive web application with dark mode support
- **WCAG 2.1 Compliant**: Accessible UI for clinician workflows

---

## Architecture

### Clinical Pipeline

The system uses a goal-oriented action planning (GOAP) approach where agents coordinate based on preconditions and effects:

```
Image Upload
    ↓
[Image-Verification-Agent] → Validates file signatures (Magic Bytes) & SHA-256 hash
    ↓
[Skin-Tone-Detection-Agent] → Classifies Fitzpatrick/Monk scale (Gemini 3 Flash)
    ↓
[Calibration-Agent] → Standard (0.65) or Safety (0.50) thresholds
    ↓
[Image-Preprocessing-Agent] → Histogram normalization (Canvas API)
    ↓
[Segmentation-Agent] → Isolates skin regions
    ↓
[Feature-Extraction-Agent] → Vector embeddings for fairness analysis
    ↓
[Lesion-Detection-Agent] → Classifies Melanoma/BCC (TF.js MobileNetV3)
    ↓
[Similarity-Search-Agent] → RAG: Retrieves 10 similar cases from Vector DB
    ↓
[Risk-Assessment-Agent] → Synthesizes data into risk profile (WebLLM SmolLM2)
    ↓
[Fairness-Audit-Agent] → Validates TPR/FPR gaps across demographics
    ↓
[Web-Verification-Agent] → Grounds diagnosis via medical literature
    ↓
[Recommendation-Agent] → Generates clinical advice (max 25 words)
    ↓
[Learning-Agent] → Updates local vector store with new case
    ↓
[Privacy-Encryption-Agent] → AES-256-GCM encryption
    ↓
[Audit-Trail-Agent] → Commits transaction hash to immutable ledger
```

### Tech Stack

| Category             | Technology                                           |
| -------------------- | ---------------------------------------------------- |
| **Frontend**         | React 19, TypeScript 5.8, Vite 6                     |
| **Styling**          | Tailwind CSS, Framer Motion                          |
| **ML Inference**     | TensorFlow.js (WebGPU), WebLLM, @xenova/transformers |
| **Vector DB**        | AgentDB (local, browser-based)                       |
| **Vision**           | Gemini 3 Flash API                                   |
| **State Management** | React Hooks, Context API                             |
| **Testing**          | Vitest (unit), Playwright (E2E), @axe-core (a11y)    |
| **Code Quality**     | ESLint, TypeScript strict mode, SonarJS              |

---

## Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **Gemini API Key** (for skin tone detection and web verification)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/do-ops885/dermatology-goap-orchestrator.git
   cd dermatology-goap-orchestrator
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Initialize AgentDB** (optional, for local vector store)

   ```bash
   npm run agentdb:init
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Development

### Available Scripts

| Command                    | Description                     |
| -------------------------- | ------------------------------- |
| `npm run dev`              | Start Vite dev server           |
| `npm run build`            | Build for production            |
| `npm run preview`          | Preview production build        |
| `npm run lint`             | Run ESLint                      |
| `npm run lint:fix`         | Auto-fix ESLint issues          |
| `npm test`                 | Run Vitest unit tests           |
| `npx playwright test`      | Run Playwright E2E tests        |
| `npx playwright test --ui` | Run E2E tests with UI mode      |
| `npm run agentdb:init`     | Initialize AgentDB vector store |

### Code Quality Standards

- **Max 500 LOC** per source file (refactor to `services/executors/` if exceeded)
- **Strict TypeScript**: `no-explicit-any` enforced as error
- **Import Order**: External libs → internal modules (`@/...`) → relative paths
- **Naming**: `camelCase` for functions/variables, `PascalCase` for types/components
- **React Hooks**: Prefix with `use`, include all dependencies

### File Structure

```
dermatology-goap-orchestrator/
├── components/          # React UI components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── services/           # Business logic & agent executors
│   ├── executors/      # Individual agent implementations
│   ├── goap/          # GOAP planner & registry
│   └── utils/         # Utility functions
├── tests/              # Unit & E2E tests
│   ├── unit/          # Vitest unit tests
│   └── e2e/           # Playwright E2E tests
├── plans/              # Architecture & implementation plans
├── types.ts            # Shared TypeScript interfaces
└── config/             # Configuration constants
```

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests
npm test

# Run single test file
npm test -- path/to/test.test.ts

# Run in watch mode
npx vitest
```

**Location**: `tests/unit/*.test.ts`

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Run specific test file
npx playwright test path/to/spec.ts
```

**Location**: `tests/e2e/*.spec.ts`

### Accessibility Tests

All UI components are tested with `@axe-core/react` for WCAG 2.1 compliance.

### Coverage

Maintain >80% code coverage across unit tests.

---

## Documentation

- **[AGENTS.md](AGENTS.md)** - Runtime agents and orchestration details
- **[plans/](plans/)** - Implementation plans and architecture decisions
- **[.github/REPO_CONFIGURATION.md](.github/REPO_CONFIGURATION.md)** - GitHub configuration and CI/CD

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following the code style guidelines
4. **Run tests** (`npm test` and `npx playwright test`)
5. **Run lint** (`npm run lint`)
6. **Commit** changes with conventional commits
7. **Push** to your branch (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Code Review Checklist

- [ ] All tests pass
- [ ] Linting passes with no errors
- [ ] TypeScript strict mode validation passes
- [ ] New features include tests
- [ ] Documentation is updated
- [ ] No `any` types (use interfaces from `types.ts` or `unknown`)
- [ ] File stays under 500 LOC

---

## Security

- **HIPAA Compliance**: All patient data encrypted with AES-256-GCM
- **On-Device Processing**: No data leaves the browser without explicit consent
- **Input Sanitization**: All user inputs are sanitized
- **CSP Enforcement**: Content Security Policy in production
- **Audit Trail**: Immutable ledger of all clinical analyses
- **Secrets Management**: Never commit API keys or credentials

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## View in AI Studio

[AI Studio App](https://ai.studio/apps/drive/1j9ABnJHjI5eRu6ucIRS3hKr0rXNmPlG-)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/do-ops885/dermatology-goap-orchestrator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/do-ops885/dermatology-goap-orchestrator/discussions)

---

<div align="center">

Built with ❤️ for equitable dermatological AI

</div>
