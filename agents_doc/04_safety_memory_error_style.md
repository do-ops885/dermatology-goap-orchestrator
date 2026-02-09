# Safety, Memory, Error Handling

## AI Safety Protocols

1. All visual inference must return a confidence score (0-1).
2. If `is_low_confidence` is true, route through `Safety-Calibration-Agent`.
3. `DiagnosticSummary` must distinguish AI-generated vs. grounded sources.

## Memory Management

1. Use `tf.tidy()` or `.dispose()` for TF.js tensors.
2. Heavy models (WebLLM) must expose `unload()`.
3. Remove event listeners in `useEffect` cleanup.

## Error Handling

1. Non-critical agents return `skipped` status when appropriate.
2. Wrap all async operations in `try/catch`.
3. Use structured logging via `services/logger.ts`.
