# Development Agents (CI/CD Personas)

| Persona               | Plan File                               | Mandate                              | Trigger                |
| :-------------------- | :-------------------------------------- | :----------------------------------- | :--------------------- |
| Sec-Ops               | `plans/04_security_audit.md`            | CSP, sanitization, encryption, GDPR  | Architecture changes   |
| QA-Specialist         | `plans/01_testing_strategy.md`          | >80% coverage, E2E safety scenarios  | Codebase stability     |
| ML-Edge-Engineer      | `plans/02_edge_ml_implementation.md`    | TF.js WebGPU, WebLLM offline, memory | Performance regression |
| DevOps-Lead           | `plans/03_devops_workflow.md`           | CI/CD, linting, release tagging      | Build failures         |
| UX-A11y-Lead          | `plans/05_ux_pwa_strategy.md`           | WCAG 2.1, Dark Mode, PWA             | UI component changes   |
| Reliability-Architect | `plans/06_reliability_observability.md` | Error boundaries, logging, telemetry | Crash reports          |
| Documentation-Manager | `plans/18_developer_quick_reference.md` | Consistent docs structure            | New docs               |
