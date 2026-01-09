# Agent Plan: UX-A11y-Lead
**Focus:** Accessibility, Perceived Performance, App-like Behavior

## 1. PWA Implementation
**Status:** LIVE (Manifest + SW Active)

### 1.1 Enhancements
- [x] **Custom Install Prompt:** Intercept `beforeinstallprompt` event. Show a branded "Install Clinical AI" button in the `Header` instead of the browser default.
- [x] **Offline UI:** If `navigator.onLine` is false:
    - Disable "Web Verification" agent visually.
    - Show a "Offline Mode: Local AI Only" banner.

## 2. AI UX & Loading States
Downloading `SmolLM2` (~1GB+) takes time.
- [x] **Progress Indicator:** Create a `ModelDownloadBar` component.
    - Hook into `LocalLLMService` init callback.
    - Show precise MB/GB progress.
- [x] **Lazy Loading:** Do not initialize `VisionSpecialist` or `LocalLLMService` on page load. Initialize only when the user hovers over the upload area or selects a file.

## 3. Accessibility (WCAG 2.1 AA)
- [ ] **Focus Management:** When "Run Analysis" is clicked, focus should move to the `AgentFlow` container so screen readers announce the live logs.
- [ ] **Color Blindness:** The "Red/Green" status indicators for Risk need accompanying icons (Check/Alert) - *Already implemented, verify visibility.*
- [ ] **Reduced Motion:** Respect `prefers-reduced-motion` in GOAP visualizations (AgentFlow animations).
