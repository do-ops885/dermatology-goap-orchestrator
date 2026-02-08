# API Gateway and Integration Strategy

**Agent:** Integration-Architect 🔌  
**Status:** ACTIVE  
**Last Updated:** 2026-02-03  
**Priority:** HIGH

---

## 1. Executive Summary

Comprehensive API integration strategy for external services including Google Gemini API, AgentDB, and future healthcare system integrations (FHIR, HL7).

**Current External Dependencies:**

- Google Gemini API (Gemini 3 Flash) - Skin tone detection & feature extraction
- AgentDB - Vector storage & similarity search
- Google Search API - Web verification (medical literature)

**Future Integrations:**

- FHIR-compliant EHR systems
- DICOM medical imaging standards
- Healthcare provider authentication (SAML/OAuth2)

---

## 2. Current API Integration Architecture

### 2.1 Google Gemini API Integration

**Location:** `services/executors/skinToneDetectionExecutor.ts`, `services/executors/featureExtractionExecutor.ts`

**Current Implementation:**

```typescript
import { GoogleGenAI } from '@google/genai';

const gemini = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

// Skin tone detection
const detectSkinTone = async (imageBase64: string) => {
  const prompt = `Analyze this dermatology image and classify the skin tone using:
    1. Fitzpatrick Scale (I-VI)
    2. Monk Skin Tone Scale (1-10)
    Provide confidence scores.`;

  const response = await gemini.models.gemini-flash-3.generateContent({
    contents: [{ text: prompt, image: imageBase64 }]
  });

  return response.text;
};
```

**Issues to Address:**

- [ ] API key exposed in client-side code (security risk)
- [ ] No rate limiting implementation
- [ ] No request retry logic
- [ ] No response caching
- [ ] No fallback mechanism

### 2.2 AgentDB Integration

**Location:** `services/agentDB.ts`

**Current Implementation:**

```typescript
import { AgentDB } from 'agentdb';

const db = new AgentDB({
  name: 'dermatology-cases',
  version: 1,
});

// Vector similarity search
const findSimilarCases = async (embedding: number[]) => {
  return await db.query({
    collection: 'cases',
    vector: embedding,
    limit: 10,
  });
};
```

**Strengths:**

- Client-side vector database (privacy-preserving)
- No external API calls for similarity search
- Works offline

---

## 3. Proposed API Gateway Architecture

### 3.1 Backend-for-Frontend (BFF) Pattern

**Architecture:**

```
[React Client]
    ↓
[Edge API Gateway (Vercel/Cloudflare Workers)]
    ↓
[Rate Limiter] → [Auth Middleware] → [Request Logger]
    ↓
[API Router]
    ├─→ [Gemini Service]
    ├─→ [Search Service]
    └─→ [FHIR Adapter]
```

**Benefits:**

- Secure API key storage (server-side only)
- Request batching and deduplication
- Unified error handling
- Request/response transformation
- Rate limiting per user

### 3.2 API Gateway Implementation (Hono + Vercel Edge)

```typescript
// api/gateway.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', rateLimiter({ max: 100, window: '15m' }));
app.use('/api/*', authenticate());

// Routes
app.post('/api/analyze/skin-tone', async (c) => {
  const { imageBase64 } = await c.req.json();

  try {
    const result = await geminiService.detectSkinTone(imageBase64);
    return c.json({ success: true, data: result });
  } catch (error) {
    Logger.error('Gemini API', error);
    return c.json({ success: false, error: 'Analysis failed' }, 500);
  }
});

app.post('/api/search/medical-literature', async (c) => {
  const { query } = await c.req.json();

  const results = await searchService.query(query);
  return c.json({ success: true, data: results });
});

export default app;
```

### 3.3 Rate Limiting Strategy

```typescript
// middleware/rateLimiter.ts
import { RateLimiter } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export const rateLimiter = (options: RateLimitOptions) => {
  const limiter = new RateLimiter({
    redis,
    limiter: RateLimiter.slidingWindow(options.max, options.window),
    analytics: true,
  });

  return async (c, next) => {
    const identifier = c.req.header('x-user-id') || c.req.header('x-forwarded-for');
    const { success, remaining } = await limiter.limit(identifier);

    if (!success) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    c.header('X-RateLimit-Remaining', remaining.toString());
    await next();
  };
};
```

---

## 4. API Service Abstractions

### 4.1 Gemini Service

```typescript
// services/api/geminiService.ts
export class GeminiService {
  private client: GoogleGenAI;
  private cache = new Map<string, CachedResponse>();

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async detectSkinTone(imageBase64: string): Promise<SkinToneResult> {
    const cacheKey = `skin-tone:${hashImage(imageBase64)}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    // Retry logic with exponential backoff
    const result = await this.retryWithBackoff(async () => {
      return await this.client.models['gemini-3-flash'].generateContent({
        contents: [{ text: this.getSkinTonePrompt(), image: imageBase64 }],
      });
    });

    // Cache response (24 hours)
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: 24 * 60 * 60 * 1000,
    });

    return result;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private getSkinTonePrompt(): string {
    return `Analyze this dermatology image and classify the skin tone...`;
  }
}
```

### 4.2 Search Service (Medical Literature)

```typescript
// services/api/searchService.ts
export class SearchService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchMedicalLiterature(query: string): Promise<SearchResult[]> {
    const sources = [this.searchPubMed(query), this.searchScholarGoogle(query)];

    const results = await Promise.allSettled(sources);

    return results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
  }

  private async searchPubMed(query: string): Promise<SearchResult[]> {
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?` +
        `db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=5`,
    );

    const data = await response.json();
    return this.transformPubMedResults(data);
  }
}
```

---

## 5. FHIR Integration (Future)

### 5.1 FHIR Resource Mapping

```typescript
// services/api/fhirAdapter.ts
import { DiagnosticReport, Observation } from 'fhir/r4';

export class FHIRAdapter {
  // Map our internal format to FHIR DiagnosticReport
  toFHIR(analysis: AnalysisResult): DiagnosticReport {
    return {
      resourceType: 'DiagnosticReport',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '34117-2',
            display: 'Dermatology Diagnostic report',
          },
        ],
      },
      subject: {
        reference: `Patient/${analysis.patientId}`,
      },
      conclusion: analysis.diagnosis,
      conclusionCode: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: this.mapToSNOMED(analysis.diagnosis),
              display: analysis.diagnosis,
            },
          ],
        },
      ],
      presentedForm: [
        {
          contentType: 'image/jpeg',
          data: analysis.imageBase64,
        },
      ],
    };
  }

  // Map FHIR DiagnosticReport to our internal format
  fromFHIR(report: DiagnosticReport): AnalysisResult {
    return {
      patientId: report.subject?.reference?.split('/')[1] || '',
      diagnosis: report.conclusion || '',
      confidence: 0.85, // Default
      timestamp: report.issued || new Date().toISOString(),
    };
  }
}
```

---

## 6. API Security

### 6.1 Authentication & Authorization

```typescript
// middleware/auth.ts
import { verify } from 'hono/jwt';

export const authenticate = () => {
  return async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const payload = await verify(token, process.env.JWT_SECRET);
      c.set('user', payload);
      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
};
```

### 6.2 API Key Rotation

```typescript
// services/keyRotation.ts
export class APIKeyRotation {
  private keys: Map<string, APIKey>;

  async rotateKey(serviceName: string): Promise<void> {
    const currentKey = this.keys.get(serviceName);

    if (!currentKey || this.shouldRotate(currentKey)) {
      const newKey = await this.generateNewKey(serviceName);

      // Dual-run period: both old and new keys valid
      await this.activateDualMode(serviceName, currentKey, newKey);

      // After 24 hours, deactivate old key
      setTimeout(
        () => {
          this.deactivateOldKey(serviceName, currentKey);
        },
        24 * 60 * 60 * 1000,
      );
    }
  }

  private shouldRotate(key: APIKey): boolean {
    const ageInDays = (Date.now() - key.createdAt) / (1000 * 60 * 60 * 24);
    return ageInDays > 90; // Rotate every 90 days
  }
}
```

---

## 7. Monitoring & Observability

### 7.1 API Metrics Collection

```typescript
// middleware/metrics.ts
import { metrics } from '@opentelemetry/api';

const apiCallCounter = metrics.getMeter('api').createCounter('api_calls', {
  description: 'Total API calls',
});

const apiLatencyHistogram = metrics.getMeter('api').createHistogram('api_latency', {
  description: 'API call latency in ms',
});

export const metricsMiddleware = () => {
  return async (c, next) => {
    const start = Date.now();
    const path = c.req.path;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    apiCallCounter.add(1, { path, status });
    apiLatencyHistogram.record(duration, { path });
  };
};
```

### 7.2 Error Tracking

```typescript
// middleware/errorTracking.ts
import * as Sentry from '@sentry/node';

export const errorHandler = () => {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          path: c.req.path,
          method: c.req.method,
        },
        extra: {
          body: await c.req.text(),
          headers: c.req.header(),
        },
      });

      return c.json({ error: 'Internal server error' }, 500);
    }
  };
};
```

---

## 8. Implementation Roadmap

### Phase 1: API Gateway Setup (Week 1-2)

- [ ] Setup Hono API gateway on Vercel Edge
- [ ] Migrate Gemini API calls to backend
- [ ] Implement rate limiting
- [ ] Add request/response logging
- [ ] Setup error tracking

### Phase 2: Service Abstractions (Week 3)

- [ ] Create GeminiService abstraction
- [ ] Create SearchService abstraction
- [ ] Implement caching layer
- [ ] Add retry logic with backoff
- [ ] Write integration tests

### Phase 3: Security Hardening (Week 4)

- [ ] Implement JWT authentication
- [ ] Setup API key rotation
- [ ] Add request signing
- [ ] Implement CORS policies
- [ ] Security audit

### Phase 4: FHIR Integration (Future)

- [ ] Design FHIR resource mapping
- [ ] Implement FHIRAdapter
- [ ] Setup EHR system connectors
- [ ] Compliance validation
- [ ] End-to-end testing

---

## 9. Related Plans

- **04_security_audit.md**: Security requirements
- **25_production_deployment_plan.md**: Deployment strategy
- **27_data_governance_compliance_plan.md**: HIPAA/GDPR compliance

---

_Agent: Integration-Architect 🔌_  
_Next Review: 2026-02-10_
