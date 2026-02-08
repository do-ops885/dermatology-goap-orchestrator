# Principles

## Type Safety (Non-Negotiable)

- `no-explicit-any` is an error. Use shared interfaces in `types.ts` or `unknown`.
- TypeScript runs in strict mode via `tsconfig.json` and `npm run typecheck`.
- Use `import type { ... }` for type-only imports.

## Code Organization

- Max 500 LOC per file. If exceeded, refactor into `services/executors/` or a focused module.
- Single responsibility per file. Keep crypto, vision, router, and logging separate.
- Business logic belongs in `services/` or `services/executors/`, not React components.
- Shared types live in `types.ts`.

## React 19 Patterns

- Functional components only.
- Hooks must include full dependency arrays.
- Component order: State, Refs, Effects, Handlers, Return.
- Clean up listeners and model resources in `useEffect` cleanup.

## Naming And Imports

- Variables and functions use `camelCase`.
- Types and interfaces use `PascalCase`.
- Constants use `UPPER_SNAKE_CASE`.
- Components use `PascalCase`.
- Private methods use `_prefix` or `private`.

Import order:

- External libraries
- Internal modules (`@/...`)
- Relative paths
