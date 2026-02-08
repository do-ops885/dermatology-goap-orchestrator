# Data Governance and Compliance Plan

**Agent:** Compliance-Officer 🔒  
**Status:** ACTIVE  
**Last Updated:** 2026-02-03  
**Priority:** CRITICAL

---

## 1. Executive Summary

Comprehensive data governance strategy ensuring HIPAA, GDPR, and healthcare regulatory compliance for the Dermatology AI Orchestrator.

**Regulatory Framework:**

- HIPAA (Health Insurance Portability and Accountability Act) - US
- GDPR (General Data Protection Regulation) - EU
- CCPA (California Consumer Privacy Act) - California
- FDA 21 CFR Part 11 - Electronic Records
- ISO 27001 - Information Security Management

**Key Principles:**

- Privacy by Design
- Data Minimization
- Purpose Limitation
- Transparency & Consent
- Right to Erasure

---

## 2. HIPAA Compliance

### 2.1 Protected Health Information (PHI)

**PHI Elements in System:**

- ✓ Medical images (dermatological lesions)
- ✓ Diagnostic results and classifications
- ✓ Clinician feedback and notes
- ✗ Patient names (not collected)
- ✗ Dates of birth (not collected)
- ✗ Contact information (not collected)

**Current State:**

```typescript
// services/crypto.ts
// All PHI encrypted at rest using AES-256-GCM
export const encryptPHI = async (data: string): Promise<EncryptedData> => {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(data),
  );

  return {
    data: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
    algorithm: 'AES-256-GCM',
  };
};
```

### 2.2 HIPAA Security Rule Requirements

| Requirement               | Implementation                         | Status      |
| :------------------------ | :------------------------------------- | :---------- |
| **Access Control**        | User authentication, role-based access | 🟡 Partial  |
| **Audit Controls**        | Audit trail in agentDB.ts              | ✅ Complete |
| **Integrity**             | SHA-256 image verification             | ✅ Complete |
| **Transmission Security** | HTTPS/TLS 1.3                          | ✅ Complete |
| **Encryption**            | AES-256-GCM at rest                    | ✅ Complete |

### 2.3 HIPAA Privacy Rule Requirements

**Minimum Necessary Standard:**

```typescript
// Only collect data required for analysis
interface MinimalPatientData {
  imageHash: string; // For deduplication only
  analysisTimestamp: number; // For audit trail
  skinToneCategory: string; // For fairness metrics
  // NO: name, DOB, SSN, address, phone
}
```

**Notice of Privacy Practices:**

```typescript
// components/ConsentBanner.tsx
export const ConsentBanner = () => {
  return (
    <div className="privacy-notice">
      <h3>Your Privacy Rights</h3>
      <ul>
        <li>Your images are encrypted and stored locally</li>
        <li>No personal identifiers are collected</li>
        <li>You can delete your data at any time</li>
        <li>Analysis data may be used to improve fairness metrics</li>
      </ul>
      <button onClick={handleAccept}>I Accept</button>
      <a href="/privacy-policy">Full Privacy Policy</a>
    </div>
  );
};
```

### 2.4 Business Associate Agreements (BAA)

**Required BAAs:**

- [ ] Google Gemini API (BAA needed for PHI processing)
- [ ] Vercel/Netlify (BAA needed for hosting PHI)
- [ ] Sentry (BAA needed for error logs containing PHI)
- [x] AgentDB (Client-side, no BAA needed)

**BAA Template:**

```markdown
# Business Associate Agreement

This agreement is between [Healthcare Provider] ("Covered Entity") and
[Service Provider] ("Business Associate").

1. **Permitted Uses:** Business Associate may use PHI only for:
   - AI-assisted dermatological diagnosis
   - Quality improvement and fairness auditing
2. **Safeguards:** Business Associate shall:
   - Encrypt all PHI using AES-256
   - Implement access controls
   - Maintain audit logs for 6 years
   - Report breaches within 24 hours
3. **Subcontractors:** Business Associate shall ensure subcontractors
   sign equivalent BAAs.
```

---

## 3. GDPR Compliance

### 3.1 Legal Basis for Processing

**Article 6 (Lawful Basis):**

- Consent (Article 6(1)(a)) - Primary basis
- Legitimate Interest (Article 6(1)(f)) - Fairness auditing

**Article 9 (Special Categories):**

- Explicit consent required for health data processing
- Purpose limitation: diagnostic assistance only

### 3.2 Data Subject Rights Implementation

#### 3.2.1 Right to Access (Article 15)

```typescript
// services/gdpr/dataExport.ts
export const exportUserData = async (userId: string): Promise<UserDataExport> => {
  const db = await openDB('dermatology-ai');

  const [cases, auditLog, preferences] = await Promise.all([
    db.getAll('cases', IDBKeyRange.only(userId)),
    db.getAll('audit', IDBKeyRange.only(userId)),
    db.get('preferences', userId),
  ]);

  return {
    format: 'JSON',
    generatedAt: new Date().toISOString(),
    data: {
      cases: cases.map(sanitizeForExport),
      auditLog: auditLog.map(sanitizeForExport),
      preferences,
    },
  };
};
```

#### 3.2.2 Right to Erasure (Article 17)

```typescript
// services/gdpr/dataErasure.ts
export const eraseUserData = async (userId: string): Promise<ErasureReport> => {
  const db = await openDB('dermatology-ai');
  const tx = db.transaction(['cases', 'audit', 'preferences'], 'readwrite');

  const deletions = await Promise.all([
    tx.objectStore('cases').delete(IDBKeyRange.only(userId)),
    tx.objectStore('audit').delete(IDBKeyRange.only(userId)),
    tx.objectStore('preferences').delete(userId),
  ]);

  await tx.done;

  // Clear browser cache
  const cache = await caches.open('dermatology-ai-v1');
  await cache.delete(`/api/user/${userId}`);

  return {
    deletedRecords: deletions.length,
    timestamp: new Date().toISOString(),
    status: 'completed',
  };
};
```

#### 3.2.3 Right to Data Portability (Article 20)

```typescript
// Export data in machine-readable format
export const exportPortableData = async (userId: string): Promise<Blob> => {
  const data = await exportUserData(userId);

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

  return blob;
};
```

### 3.3 Privacy by Design Implementation

**Pseudonymization:**

```typescript
// Generate anonymous user IDs
export const generatePseudonym = async (userId: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + process.env.SALT);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hash).substring(0, 16);
};
```

**Data Minimization:**

```typescript
// Only store essential fields
interface MinimalAnalysisRecord {
  id: string; // Pseudonymized
  imageHash: string; // Not reversible to original image
  diagnosisCategory: string; // Categorical, not detailed
  confidenceScore: number; // Numeric only
  timestamp: number; // For retention policy
  // NO: raw image, patient name, location, device info
}
```

### 3.4 GDPR Documentation Requirements

**Records of Processing Activities (ROPA):**

```typescript
// gdpr/ropa.ts
export const PROCESSING_ACTIVITIES = [
  {
    purpose: 'AI-assisted dermatological diagnosis',
    legalBasis: 'Consent (Article 6(1)(a))',
    dataCategories: ['Medical images', 'Diagnostic results'],
    recipients: ['Healthcare provider', 'Patient'],
    retentionPeriod: '12 months or until deletion request',
    technicalMeasures: ['AES-256 encryption', 'TLS 1.3', 'Access controls'],
    organizationalMeasures: ['Privacy training', 'Incident response plan'],
  },
  {
    purpose: 'Fairness auditing and bias detection',
    legalBasis: 'Legitimate interest (Article 6(1)(f))',
    dataCategories: ['Aggregated skin tone distribution', 'TPR/FPR metrics'],
    recipients: ['Internal data science team'],
    retentionPeriod: 'Indefinite (aggregated, anonymized)',
    technicalMeasures: ['Aggregation', 'K-anonymity (k≥5)'],
  },
];
```

**Data Protection Impact Assessment (DPIA):**

```markdown
# Data Protection Impact Assessment

## Processing Description

AI-assisted analysis of dermatological images using machine learning models.

## Necessity and Proportionality

- **Necessity:** Required for accurate diagnosis assistance
- **Proportionality:** Only medical images processed, no identifiers

## Risks to Data Subjects

| Risk              | Likelihood | Impact   | Mitigation                              |
| :---------------- | :--------- | :------- | :-------------------------------------- |
| Re-identification | Low        | High     | Pseudonymization, no PII collected      |
| Data breach       | Medium     | High     | Encryption, access controls, audit logs |
| Bias in diagnosis | Medium     | Critical | Fairness metrics, calibration agents    |

## Measures to Address Risks

1. End-to-end encryption (AES-256-GCM)
2. Client-side processing (no data leaves device by default)
3. Fairness auditing across demographics
4. Regular bias testing and calibration
5. Transparency reports (TPR/FPR by skin tone)

## Consultation

- Data Protection Officer: [Name]
- Ethics Committee: [Name]
- Patient advocacy groups: [Name]

## Approval

Approved by: [DPO Name]
Date: 2026-02-03
Review Date: 2027-02-03
```

---

## 4. Data Retention and Disposal

### 4.1 Retention Policy

```typescript
// services/dataRetention.ts
export const RETENTION_POLICIES = {
  analysisResults: {
    duration: 12 * 30 * 24 * 60 * 60 * 1000, // 12 months
    action: 'delete',
  },
  auditLogs: {
    duration: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years (HIPAA)
    action: 'archive',
  },
  fairnessMetrics: {
    duration: Infinity, // Permanent (aggregated, anonymized)
    action: 'retain',
  },
};

export const enforceRetentionPolicy = async (): Promise<void> => {
  const db = await openDB('dermatology-ai');
  const now = Date.now();

  for (const [store, policy] of Object.entries(RETENTION_POLICIES)) {
    if (policy.duration === Infinity) continue;

    const tx = db.transaction(store, 'readwrite');
    const cursor = await tx.store.openCursor();

    while (cursor) {
      const age = now - cursor.value.timestamp;
      if (age > policy.duration) {
        if (policy.action === 'delete') {
          await cursor.delete();
        } else if (policy.action === 'archive') {
          await archiveRecord(cursor.value);
          await cursor.delete();
        }
      }
      cursor = await cursor.continue();
    }
  }
};
```

### 4.2 Secure Deletion

```typescript
// Cryptographic erasure
export const secureDelete = async (recordId: string): Promise<void> => {
  const db = await openDB('dermatology-ai');

  // Delete record
  await db.delete('cases', recordId);

  // Overwrite encryption key (makes encrypted data unrecoverable)
  const keyStore = await db.transaction('keys', 'readwrite').store;
  await keyStore.delete(recordId);

  // Log deletion for audit
  await auditLog('data_deletion', { recordId, timestamp: Date.now() });
};
```

---

## 5. Consent Management

### 5.1 Consent Framework

```typescript
// services/consentManager.ts
export interface ConsentPreferences {
  essential: boolean; // Required for service
  analytics: boolean; // Fairness metrics
  improvement: boolean; // Model training
  research: boolean; // Academic research
  timestamp: number;
  version: string; // Privacy policy version
}

export const requestConsent = async (): Promise<ConsentPreferences> => {
  return await showConsentDialog({
    essential: {
      required: true,
      description: 'Process medical images for diagnosis',
    },
    analytics: {
      required: false,
      description: 'Collect fairness metrics to detect bias',
    },
    improvement: {
      required: false,
      description: 'Use anonymized data to improve model accuracy',
    },
    research: {
      required: false,
      description: 'Contribute to dermatology research (fully anonymized)',
    },
  });
};

export const withdrawConsent = async (category: string): Promise<void> => {
  const preferences = await getConsentPreferences();
  preferences[category] = false;
  preferences.timestamp = Date.now();

  await saveConsentPreferences(preferences);

  // Cascade actions
  if (category === 'analytics') {
    await stopFairnessTracking();
  }
  if (category === 'improvement') {
    await deleteTrainingData();
  }
};
```

### 5.2 Consent UI Implementation

```typescript
// components/ConsentManager.tsx
export const ConsentManager = () => {
  const [preferences, setPreferences] = useState<ConsentPreferences>();

  return (
    <div className="consent-manager">
      <h2>Privacy Preferences</h2>

      <ConsentToggle
        name="essential"
        label="Essential Processing"
        description="Required for diagnostic service"
        disabled
        checked
      />

      <ConsentToggle
        name="analytics"
        label="Fairness Analytics"
        description="Help us detect and fix bias across skin tones"
        checked={preferences.analytics}
        onChange={(checked) => updateConsent('analytics', checked)}
      />

      <ConsentToggle
        name="improvement"
        label="Model Improvement"
        description="Improve accuracy using anonymized data"
        checked={preferences.improvement}
        onChange={(checked) => updateConsent('improvement', checked)}
      />

      <div className="consent-actions">
        <button onClick={downloadMyData}>Download My Data</button>
        <button onClick={deleteMyData}>Delete All My Data</button>
      </div>
    </div>
  );
};
```

---

## 6. Breach Notification Procedures

### 6.1 Breach Detection

```typescript
// services/breachDetection.ts
export const detectBreach = async (): Promise<BreachAlert | null> => {
  const indicators = await Promise.all([
    checkUnauthorizedAccess(),
    checkDataExfiltration(),
    checkEncryptionFailure(),
    checkAnomalousActivity(),
  ]);

  const breaches = indicators.filter((i) => i.detected);

  if (breaches.length > 0) {
    return {
      severity: calculateSeverity(breaches),
      affectedRecords: estimateImpact(breaches),
      timestamp: Date.now(),
      indicators: breaches,
    };
  }

  return null;
};
```

### 6.2 Notification Timelines

**HIPAA Requirements:**

- Notify affected individuals: Within 60 days
- Notify HHS: Within 60 days (>500 individuals) or annually (<500)
- Notify media: Within 60 days (>500 individuals in jurisdiction)

**GDPR Requirements:**

- Notify supervisory authority: Within 72 hours
- Notify affected individuals: Without undue delay (if high risk)

```typescript
// services/breachNotification.ts
export const notifyBreach = async (breach: BreachAlert): Promise<void> => {
  const timeline = {
    hipaa: 60 * 24 * 60 * 60 * 1000, // 60 days
    gdpr: 72 * 60 * 60 * 1000, // 72 hours
  };

  // Immediate: Notify DPO and security team
  await notifyInternal(breach);

  // Within 72 hours: Notify GDPR supervisory authority
  setTimeout(async () => {
    if (breach.affectedRecords > 0) {
      await notifyGDPRAuthority(breach);
    }
  }, timeline.gdpr);

  // Within 60 days: Notify affected individuals (HIPAA)
  setTimeout(async () => {
    await notifyAffectedIndividuals(breach);
    if (breach.affectedRecords > 500) {
      await notifyHHS(breach);
      await notifyMedia(breach);
    }
  }, timeline.hipaa);
};
```

---

## 7. Cross-Border Data Transfers

### 7.1 Transfer Mechanisms

**EU to US Transfers:**

- Standard Contractual Clauses (SCCs)
- EU-US Data Privacy Framework (if certified)

```typescript
// config/dataTransfer.ts
export const TRANSFER_POLICIES = {
  'EU-US': {
    mechanism: 'Standard Contractual Clauses',
    approval: 'Required',
    encryption: 'AES-256 (in transit and at rest)',
    dataMinimization: 'Only diagnostic data, no PII',
  },
  'EU-EU': {
    mechanism: 'GDPR Article 45',
    approval: 'Not required',
    encryption: 'TLS 1.3 minimum',
  },
};
```

### 7.2 Data Localization

```typescript
// Detect user location and route data accordingly
export const getDataRegion = async (): Promise<DataRegion> => {
  const location = await detectUserLocation();

  if (location.country in EU_COUNTRIES) {
    return 'eu-west-1';
  } else if (location.country === 'US') {
    return 'us-east-1';
  }

  return 'default';
};
```

---

## 8. Compliance Monitoring

### 8.1 Automated Compliance Checks

```typescript
// scripts/compliance-check.ts
export const runComplianceChecks = async (): Promise<ComplianceReport> => {
  const checks = await Promise.all([
    checkEncryptionStatus(),
    checkAccessControls(),
    checkAuditLogIntegrity(),
    checkRetentionPolicyEnforcement(),
    checkConsentRecords(),
    checkBAAs(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    overallStatus: checks.every((c) => c.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
    checks,
    recommendations: generateRecommendations(checks),
  };
};
```

### 8.2 Compliance Dashboard

```typescript
// components/ComplianceDashboard.tsx
export const ComplianceDashboard = () => {
  const [report, setReport] = useState<ComplianceReport>();

  return (
    <div className="compliance-dashboard">
      <h2>Compliance Status</h2>

      <StatusCard
        title="HIPAA Compliance"
        status={report.hipaa.status}
        checks={report.hipaa.checks}
      />

      <StatusCard
        title="GDPR Compliance"
        status={report.gdpr.status}
        checks={report.gdpr.checks}
      />

      <AuditLogViewer logs={report.auditLogs} />

      <BreachIncidents incidents={report.breaches} />
    </div>
  );
};
```

---

## 9. Training and Awareness

### 9.1 Staff Training Requirements

**Mandatory Training:**

- HIPAA Privacy and Security (annual)
- GDPR Data Protection (annual)
- Incident Response Procedures (quarterly)
- Secure Coding Practices (semi-annual)

**Training Topics:**

- Recognizing PHI and sensitive data
- Proper encryption key management
- Breach detection and reporting
- User consent and rights
- Secure data disposal

### 9.2 Documentation

**Required Documentation:**

- Privacy Policy (public-facing)
- Data Processing Agreement (internal)
- Business Associate Agreements (vendors)
- Incident Response Plan
- Data Protection Impact Assessment

---

## 10. Implementation Checklist

### Phase 1: Immediate Actions (Week 1-2)

- [x] Implement AES-256 encryption for PHI
- [x] Setup audit logging
- [ ] Draft privacy policy
- [ ] Implement consent management UI
- [ ] Setup breach detection monitoring

### Phase 2: Compliance Framework (Week 3-4)

- [ ] Complete DPIA
- [ ] Draft BAAs for all vendors
- [ ] Implement data export functionality
- [ ] Implement data erasure functionality
- [ ] Setup compliance monitoring dashboard

### Phase 3: Validation (Week 5-6)

- [ ] Third-party security audit
- [ ] Privacy counsel review
- [ ] Penetration testing
- [ ] Staff training completion
- [ ] Compliance certification

---

## 11. Related Plans

- **04_security_audit.md**: Technical security controls
- **26_api_gateway_integration_strategy.md**: API security and BAAs
- **28_disaster_recovery_plan.md**: Data backup and recovery

---

_Agent: Compliance-Officer 🔒_  
_Next Review: 2026-02-17 (Bi-weekly)_
