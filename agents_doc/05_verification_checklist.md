# Verification Checklist

Before committing any changes:

1. Run `npm run lint` with zero errors.
2. Run `npm run typecheck` with zero errors.
3. Run `npm run test` and ensure at least one test passes.
4. If release-grade changes, run `npm run build`.

Notes:

- Lint must run before tests, per ESLint v9 rules.
- CI pipeline mirrors these checks via `npm run ci`.
