# Agent Plan: Sec-Ops

**Focus:** Data Privacy, Client-Side Encryption, Compliance, GDPR

## 0. Current Security Status (2026-01-11)

### 0.1 Security Posture

| Security Area         | Status                 | Implementation                      | Priority |
| --------------------- | ---------------------- | ----------------------------------- | -------- |
| Input Validation      | ✅ Complete            | Magic Bytes, Size Limit (10MB)      | LOW      |
| CSP Headers           | ❌ **Not Implemented** | No CSP in vite.config.ts            | **HIGH** |
| Encryption            | ✅ Complete            | AES-GCM-256 in `services/crypto.ts` | LOW      |
| Audit Logging         | ✅ Complete            | SHA-256 hash chaining in AgentDB    | LOW      |
| PII Redaction         | ⚠️ Partial             | Only in logger (base64/image)       | MEDIUM   |
| HTTP Security Headers | ❌ **Not Implemented** | No security headers in Vite         | **HIGH** |
| Zod Validation        | ❌ **Not Implemented** | No runtime schema validation        | MEDIUM   |
| ESLint Security       | ✅ Complete            | 10+ security rules configured       | LOW      |

### 0.2 Critical Issues Requiring Immediate Action

1. **Missing CSP Headers**: No Content-Security-Policy in Vite config
2. **Missing HTTP Security Headers**: No X-Frame-Options, X-Content-Type-Options, etc.

## 1. Threat Model & Status

- **Input Validation:** ✅ Implemented (Magic Bytes, Size Limit).
- **CSP:** ⚠️ **NOT IMPLEMENTED** - No CSP headers found in `vite.config.ts`
- **Data At Rest:** ✅ Implemented (`AES-GCM-256` via `Privacy-Encryption-Agent`).

## 2. Hardening Tasks (Immediate)

### 2.1 Client-Side Encryption Service

**Status:** ✅ IMPLEMENTED

- **Objective:** Encrypt `AnalysisResult` JSON payload before it interacts with any persistence layer.
- **Specification:**
  - **Algorithm:** AES-GCM (256-bit).
  - **Key Generation:** `window.crypto.subtle.generateKey`.
  - **IV:** Random 12 bytes per encryption.
  - **Key Storage:** **Ephemeral**. Keys exist in memory only (React State/Context).

### 2.2 2025: Enhanced Input Validation with Zod

- [ ] **Implement Runtime Validation:**

  ```typescript
  import { z } from 'zod';

  const FileUploadSchema = z.object({
    name: z
      .string()
      .max(255)
      .regex(/^[a-zA-Z0-9._-]+$/),
    type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    size: z.number().max(10 * 1024 * 1024),
  });

  const WorldStateSchema = z.object({
    image_verified: z.boolean(),
    confidence_score: z.number().min(0).max(1),
    fitzpatrick_type: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']).nullable(),
  });
  ```

### 2.3 2025: Content Security Policy Enhancement

- [ ] **Implement CSP Headers in Vite Config:**
  ```typescript
  // vite.config.ts
  export default defineConfig({
    server: {
      headers: {
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
          "connect-src 'self' https://generativelanguage.googleapis.com https://www.googleapis.com",
          "img-src 'self' data: blob:",
          "worker-src 'self' blob:",
          "frame-src 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    },
  });
  ```

### 2.4 Privacy Preservation (Data Minimization)

- **Vision Inference:** Confirmed running `tf.browser.fromPixels`. Data stays in GPU memory.
- **AgentDB:** Confirmed running locally via `agentdb` (IndexedDB/SQLite WASM).
- **Gemini API:** Image data is sent to cloud.
  - **Action:** ✅ Add a "Privacy Mode" toggle. If enabled, skip `Skin-Tone-Detection-Agent` (Cloud) and rely solely on `VisionSpecialist` (Local) + Manual Skin Tone selection.

### 2.5 2025: PII Redaction

- [ ] **Implement PII Detection:**

  ```typescript
  // services/piiRedactor.ts
  const PIIPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{10,12}\b/g, // Phone numbers
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
  ];

  export function redactPII(text: string): string {
    return PIIPatterns.reduce((redacted, pattern) => {
      return redacted.replace(pattern, '[REDACTED]');
    }, text);
  }
  ```

- [ ] **Redact from:** Agent logs, AI responses, user inputs

## 3. Compliance Verification & GDPR

### 3.1 Right to Erasure (Article 17)

- **Mechanism:** ✅ The "Reset Memory" button in `FairnessReport` executes `AgentDB.resetMemory()`.
- **Validation:** This must physically drop all IndexedDB/SQLite tables and clear `localStorage` keys related to cached patterns.

### 3.2 Data Sovereignty (Local-First)

- **Policy:** No patient data is ever sent to a centralized backend server managed by the app owner.
- **Exception:** Ephemeral processing via Google Gemini API (Cloud). Users must be informed via a "Processing Consent" modal that data leaves device temporarily for inference only.

### 3.3 2025: Enhanced Consent Management

- [ ] **Implement Granular Consent:**
  ```typescript
  interface ConsentState {
    localProcessing: boolean; // Always true
    cloudGemini: boolean; // For skin tone detection
    offlineAnalysis: boolean; // For local-only mode
    dataStorage: boolean; // For IndexedDB
    analytics: boolean; // For anonymous telemetry
  }
  ```
- [ ] **Add Consent Modal:** Show on first use, allow users to configure preferences
- [ ] **Persist Consent:** Store in localStorage, allow revocation at any time

### 3.4 Audit Trail Integrity

- **Audit Log:** The Merkle Root in `Audit-Trail-Agent` must use `SHA-256` chaining.
- **Tamper Evidence:** Any modification to the local DB file breaks hash chain, invalidating audit log.

### 3.5 2025: Audit Trail Enhancement

- [ ] **Immutable Append-Only Log:** Use Web Crypto API for hash chaining
- [ ] **Tamper Detection:** Verify hash chain on load, alert if corrupted
- [ ] **Export Capability:** Allow users to download audit log as JSON

## 4. Memory Safety & Leaks

- **Credential Scavenging:** Ensure `API_KEY` is not reachable via the global window object (it is currently `process.env`).
- **Buffer Clearing:** Overwrite memory containing decrypted payload (`AnalysisResult`) with zeros before garbage collection when session ends.

### 4.1 2025: Secure Key Management

- [ ] **Implement Ephemeral Key Generation:**

  ```typescript
  class SecureKeyManager {
    private key: CryptoKey | null = null;

    async generateKey() {
      this.key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
      ]);
    }

    async clearKey() {
      if (this.key) {
        // Overwrite key in memory
        const exported = await crypto.subtle.exportKey('raw', this.key);
        exported.fill(0);
        this.key = null;
      }
    }
  }
  ```

- [ ] **Auto-Cleanup:** Clear keys on page unload, timeout, or user logout

### 4.2 2025: Zero-Knowledge Architecture

- [ ] **Client-Side Only:** All encryption/decryption happens client-side
- [ ] **Server-Side Blind:** Server never sees decrypted data
- [ ] **End-to-End Encryption:** Even if intercepted, data remains encrypted

## 5. 2025: ESLint Security Rules (Updated 2026-01-11)

- [x] **Add eslint-plugin-security**: Security hotspot detection
- [x] **Configure security rules**: Security linting enabled in ESLint
- [x] **Security rules enabled**:
  - `security/detect-eval-with-expression` (error): Detect eval usage
  - `security/detect-non-literal-require` (error): Detect dynamic requires
  - `security/detect-unsafe-regex` (warn): Detect unsafe regex patterns
  - `security/detect-buffer-noassert` (error): Detect buffer noassert
  - `security/detect-child-process` (warn): Detect child process usage
  - `security/detect-disable-mustache-escape` (warn): Detect disabled escape
  - `security/detect-new-buffer` (warn): Detect deprecated Buffer constructor
  - `security/detect-no-csrf-before-method-override` (warn): Detect CSRF vulnerability
  - `security/detect-non-literal-fs-filename` (warn): Detect non-literal fs calls
  - `security/detect-pseudoRandomBytes` (warn): Detect pseudo-random bytes

## 6. 2025: Security Headers & Best Practices

### 5.1 HTTP Security Headers

- [ ] **X-Content-Type-Options:** nosniff
- [ ] **X-Frame-Options:** DENY
- [ ] **X-XSS-Protection:** 1; mode=block
- [ ] **Referrer-Policy:** strict-origin-when-cross-origin
- [ ] **Permissions-Policy:** Limit camera, microphone, geolocation

### 5.2 Subresource Integrity (SRI)

- [ ] **Add SRI for CDN Resources:**
  ```html
  <script
    src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js"
    integrity="sha384-..."
    crossorigin="anonymous"
  ></script>
  ```

### 5.3 Security Testing

- [ ] **Automated Security Scanning:** Use `npm audit` in CI/CD
- [ ] **OWASP ZAP:** Run periodic vulnerability scans
- [ ] **Fuzz Testing:** Test input validation with malformed inputs
- [ ] **Penetration Testing:** Annual security assessment

## 6. Incident Response

- [ ] **Incident Log:** Track security events in immutable log
- [ ] **Breach Notification:** Auto-notify affected users
- [ ] **Incident Response Plan:** Documented procedure for security incidents
- [ ] **Security Hotline:** Contact method for security researchers
