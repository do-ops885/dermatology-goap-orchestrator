# Agent Plan: Sec-Ops
**Focus:** Data Privacy, Client-Side Encryption, Compliance, GDPR

## 1. Threat Model & Status
- **Input Validation:** ✅ Implemented (Magic Bytes, Size Limit).
- **CSP:** ✅ Implemented (Strict `connect-src` and `script-src`).
- **Data At Rest:** ✅ Implemented (`AES-GCM-256` via `Privacy-Encryption-Agent`).

## 2. Hardening Tasks (Immediate)

### 2.1 Client-Side Encryption Service
**Status:** ✅ IMPLEMENTED

- **Objective:** Encrypt the `AnalysisResult` JSON payload before it interacts with any persistence layer.
- **Specification:**
    - **Algorithm:** AES-GCM (256-bit).
    - **Key Generation:** `window.crypto.subtle.generateKey`.
    - **IV:** Random 12 bytes per encryption.
    - **Key Storage:** **Ephemeral**. Keys should exist in memory only (React State/Context). If the user closes the tab, the data is effectively "locked" until re-analysis.

### 2.2 Privacy Preservation (Data Minimization)
- **Vision Inference:** Confirmed running `tf.browser.fromPixels`. Data stays in GPU memory.
- **AgentDB:** Confirmed running locally via `agentdb` (IndexedDB/SQLite WASM).
- **Gemini API:** Image data is sent to cloud.
    - **Action:** ✅ Add a "Privacy Mode" toggle. If enabled, skip `Skin-Tone-Detection-Agent` (Cloud) and rely solely on `VisionSpecialist` (Local) + Manual Skin Tone selection.

## 3. Compliance Verification & GDPR

### 3.1 Right to Erasure (Article 17)
- **Mechanism:** ✅ The "Reset Memory" button in `FairnessReport` executes `AgentDB.resetMemory()`.
- **Validation:** This must physically drop the IndexedDB/SQLite tables and clear `localStorage` keys related to cached patterns.

### 3.2 Data Sovereignty (Local-First)
- **Policy:** No patient data is ever sent to a centralized backend server managed by the app owner.
- **Exception:** Ephemeral processing via Google Gemini API (Cloud). Users must be informed via a "Processing Consent" modal that data leaves the device temporarily for inference only.

### 3.3 Audit Trail Integrity
- **Audit Log:** The Merkle Root in `Audit-Trail-Agent` must use `SHA-256` chaining.
- **Tamper Evidence:** Any modification to the local DB file breaks the hash chain, invalidating the audit log.

## 4. Memory Safety & Leaks
- **Credential Scavenging:** Ensure `API_KEY` is not reachable via global window object (it is currently `process.env`).
- **Buffer Clearing:** Overwrite memory containing the decrypted payload (`AnalysisResult`) with zeros before garbage collection when the session ends.
