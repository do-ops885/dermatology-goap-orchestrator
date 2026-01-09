# Agent Plan: ML-Edge-Engineer
**Focus:** Offline Inference, Model Optimization, UX Latency, Resource Management

## 1. Local LLM Integration (`services/agentDB.ts`)
**Status:** IMPLEMENTED (WebLLM `SmolLM2-1.7B`)

### 1.1 Optimizations Needed
- [x] **Model Caching:** Configure Service Worker to cache ML weights (`.bin`, `.json`) to prevent re-downloading 1GB+ on every session.
- [x] **Initialization UX:** The `useClinicalAnalysis` hook exposes `warning` for loading state. We need a dedicated progress bar component for model downloading.

## 2. Vision Pipeline (`services/vision.ts`)
**Status:** FUNCTIONAL (MobileNetV2 + Deterministic Mapping)

### 2.1 Tasks
- [x] **Backend Selection:** Robust WebGPU -> WebGL -> CPU logic implemented.
- [ ] **Model Artifacts:**
    - Currently fetching from Google Storage.
    - **Goal:** Host quantized models within the app's `public/models/` directory for true offline support.
- [ ] **Explainability (Grad-CAM):**
    - Implement `tf.grad()` on the last convolutional layer of MobileNet to generate a heatmap.
    - Overlay this heatmap on the user's uploaded image in `AnalysisIntake` to show *where* the model is looking.

## 3. Performance Budget & Monitoring
- **Current Bundle Size:** High (due to `@mlc-ai/web-llm` and `@tensorflow/tfjs`).
- [x] **Action:** Implement dynamic import for `VisionSpecialist` and `LocalLLMService`.
    - Only load these heavy modules *after* the user uploads an image or explicitly opts-in.

## 4. Resource Management & Memory Safety
To prevent browser crashes (OOM) on mobile devices:

### 4.1 TensorFlow.js
- [x] **Strict Tidy:** All inference logic in `classify()` must be wrapped in `tf.tidy(() => { ... })` to automatically clean up intermediate tensors.
- [x] **Explicit Disposal:** Large input tensors (images) passed *into* tidy might need manual `tensor.dispose()` if not tracked.
- [x] **Backend Cleanup:** If switching backends (e.g., from WebGPU to CPU), call `tf.disposeVariables()` where applicable.

### 4.2 WebLLM
- [x] **Engine Teardown:** When the `LocalLLMService` is idle for >5 minutes, or when the user navigates away/closes the app, call `engine.unload()` to release GPU memory.
- [x] **Singleton Pattern:** Ensure only **one** instance of the engine exists. The current `LocalLLMService` uses a singleton-like pattern; verify no duplicate initializations occur in React `useEffect`.

## 5. Future: TFLite
- Investigate `tfjs-tflite` for potentially faster inference on mobile devices (Android Neural Networks API delegate).
