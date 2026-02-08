# AGENTS.md

**For AI Coding Agents** — Entry point for working with this codebase.

**Last Updated:** 2026-02-08

---

## 1. Quick Start (TL;DR)

| Command               | Purpose                                       |
| :-------------------- | :-------------------------------------------- |
| `npm run dev`         | Start Vite dev server (http://localhost:5173) |
| `npm run build`       | Production bundle                             |
| `npm run lint`        | ESLint v9 + security rules                    |
| `npm run typecheck`   | TypeScript strict mode                        |
| `npm run test`        | Vitest suite (jsdom)                          |
| `npx playwright test` | E2E tests (Playwright)                        |

Test locations:

- Unit tests: `tests/unit/*.test.ts`
- E2E tests: `tests/e2e/*.spec.ts`
- Setup: `tests/setup.ts`

---

## 2. Document Index (Agents Doc Set)

Details are split into `agents_doc/` for maintainability. Use these files as the source of truth for agent behavior and engineering rules:

- `agents_doc/01_principles.md`
- `agents_doc/02_runtime_agents.md`
- `agents_doc/03_dev_agents.md`
- `agents_doc/04_safety_memory_error_style.md`
- `agents_doc/05_verification_checklist.md`
- `agents_doc/06_documentation_policy.md`

---

## 3. Source Of Truth

Operational mappings live in code, not prose. When in doubt, consult:

- GOAP actions: `services/goap.ts`
- Agent registry: `services/goap/registry.ts`
- Agent executors: `services/executors/*.ts`
