# API Gateway Setup Guide

**Status:** Ready for Implementation  
**Last Updated:** 2026-02-03

---

## Overview

The API Gateway migrates Gemini API calls from client-side to server-side, addressing the critical security issue of exposed API keys. It provides rate limiting, caching, retry logic, and centralized monitoring.

**Key Benefits:**

- ✅ **Security:** API keys never exposed to client
- ✅ **Rate Limiting:** 100 requests per 15 minutes per user
- ✅ **Caching:** 24-hour cache for repeated requests (80%+ hit rate expected)
- ✅ **Reliability:** Automatic retry with exponential backoff
- ✅ **Monitoring:** Request metrics and error tracking

---

## Architecture

```
┌─────────────┐
│   React     │
│  Frontend   │
└──────┬──────┘
       │
       │ HTTPS
       ▼
┌─────────────────────────────┐
│   Hono API Gateway          │
│   (Vercel Edge Functions)   │
├─────────────────────────────┤
│  Rate Limiter               │
│  Error Handler              │
│  Metrics Collector          │
└──────┬──────────────────────┘
       │
       │ API Key (Server-side)
       ▼
┌─────────────┐
│   Gemini    │
│     API     │
└─────────────┘
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your Gemini API key
GEMINI_API_KEY=your_actual_api_key_here
```

**Important:** Never commit `.env` to version control!

### 3. Local Development

Start the API gateway locally:

```bash
# From project root
npm run dev:api
```

This will start the API gateway on `http://localhost:3000`

### 4. Update Frontend Configuration

Update your `.env` file:

```bash
# Frontend environment
VITE_API_URL=http://localhost:3000

# REMOVE THIS - no longer needed
# VITE_GEMINI_API_KEY=xxx
```

### 5. Deploy to Vercel

#### Option A: Automatic Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: GitHub Integration

1. Connect your GitHub repository to Vercel
2. Add environment variable in Vercel dashboard:
   - Key: `GEMINI_API_KEY`
   - Value: Your Gemini API key
   - Scope: Production, Preview, Development

3. Push to main branch - Vercel will auto-deploy

---

## API Endpoints

### Health Check

**GET /health**

Returns API gateway health status.

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T14:00:00.000Z",
  "version": "1.0.0",
  "uptime": 12345
}
```

### Skin Tone Detection

**POST /api/gemini/skin-tone**

Detects skin tone from image.

```bash
curl -X POST http://localhost:3000/api/gemini/skin-tone \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user" \
  -d '{
    "imageBase64": "base64_encoded_image_data",
    "mimeType": "image/jpeg"
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "fitzpatrick_type": "IV",
    "monk_scale": "7",
    "ita_estimate": 35.2,
    "skin_tone_confidence": 0.89,
    "reasoning": "Moderate brown skin tone consistent with Type IV classification"
  }
}
```

### Feature Extraction

**POST /api/gemini/extract-features**

Extracts clinical features from image.

```bash
curl -X POST http://localhost:3000/api/gemini/extract-features \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user" \
  -d '{
    "imageBase64": "base64_encoded_image_data",
    "mimeType": "image/jpeg"
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "features": ["asymmetric borders", "irregular pigmentation", "diameter > 6mm"],
    "description": "Lesion exhibits multiple concerning features",
    "clinical_notes": "Recommend biopsy for definitive diagnosis"
  }
}
```

### Recommendation Generation

**POST /api/gemini/recommendation**

Generates clinical recommendation.

```bash
curl -X POST http://localhost:3000/api/gemini/recommendation \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user" \
  -d '{
    "analysisData": {
      "diagnosis": "melanoma",
      "confidence": 0.85,
      "skinTone": "IV"
    }
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "recommendation": "Urgent dermatology referral recommended for biopsy",
    "confidence": 0.92,
    "reasoning": "High confidence melanoma detection requires specialist evaluation"
  }
}
```

---

## Rate Limiting

**Limits:**

- 100 requests per 15 minutes per user
- Rate limit headers included in all responses

**Headers:**

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Timestamp when limit resets

**Example:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 2026-02-03T14:15:00.000Z
```

**429 Response:**

```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 100 requests per 15m",
  "retryAfter": 523
}
```

---

## Caching

**Strategy:**

- In-memory cache (development)
- Redis cache (production - future)
- 24-hour TTL for all responses

**Cache Keys:**

- Based on request content hash
- Same image = same cache key
- Automatic cache invalidation after TTL

**Cache Headers:**

- Responses are cached server-side
- No client-side caching headers (privacy)

---

## Monitoring

### Metrics Endpoint

**GET /health/metrics**

```bash
curl http://localhost:3000/health/metrics
```

Response:

```json
{
  "status": "healthy",
  "metrics": {
    "total": 1234,
    "last5min": 45,
    "avgDuration": 234.5,
    "errorRate": 1.2
  }
}
```

### Cache Statistics

**GET /api/gemini/cache-stats**

```bash
curl http://localhost:3000/api/gemini/cache-stats
```

Response:

```json
{
  "success": true,
  "data": {
    "size": 127,
    "entries": ["skin-tone:abc123", "features:def456", "recommendation:ghi789"]
  }
}
```

---

## Testing

### Run Unit Tests

```bash
npm run test tests/api/
```

### Manual Testing

```bash
# Start API gateway
npm run dev:api

# In another terminal, test endpoints
curl http://localhost:3000/health

# Test rate limiting (run 101 times)
for i in {1..101}; do
  curl -X POST http://localhost:3000/api/gemini/skin-tone \
    -H "Content-Type: application/json" \
    -H "X-User-ID: test-user" \
    -d '{"imageBase64": "test", "mimeType": "image/png"}'
done
```

---

## Frontend Integration

### Replace Direct Gemini Calls

**Before (Direct API call - INSECURE):**

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY }); // ❌ Exposed!
const response = await ai.models.generateContent({ ... });
```

**After (API Gateway - SECURE):**

```typescript
import { geminiClient } from '../services/api/geminiClient';

const result = await geminiClient.detectSkinTone(imageBase64, mimeType); // ✅ Secure!
```

### Update Executor Files

Files to update:

- `services/executors/skinToneDetectionExecutor.ts`
- `services/executors/featureExtractionExecutor.ts`
- `services/executors/recommendationExecutor.ts`
- `services/executors/webVerificationExecutor.ts`
- `hooks/useClinicalAnalysis.ts`

Example update for `skinToneDetectionExecutor.ts`:

```typescript
// OLD
const toneResponse = await ai.models.generateContent({ ... });

// NEW
import { geminiClient } from '../api/geminiClient';
const toneJson = await geminiClient.detectSkinTone(base64Image, file.type);
```

---

## Security Considerations

### ✅ Implemented

- API keys stored server-side only
- Rate limiting per user
- CORS configuration
- Request validation
- Error sanitization (no stack traces in production)

### 🔲 TODO (Production)

- [ ] Authentication (JWT tokens)
- [ ] Request signing
- [ ] DDoS protection (Cloudflare)
- [ ] API key rotation schedule
- [ ] WAF rules (Web Application Firewall)
- [ ] Request size limits
- [ ] IP allowlisting for admin endpoints

---

## Troubleshooting

### Issue: "GEMINI_API_KEY is not set"

**Solution:** Check that `.env` file exists and contains valid API key.

```bash
# Verify environment variable
echo $GEMINI_API_KEY
```

### Issue: "Rate limit exceeded"

**Solution:** Wait for rate limit window to reset or use different user ID.

```bash
# Check rate limit headers
curl -I http://localhost:3000/api/gemini/skin-tone
```

### Issue: "Failed to connect to API gateway"

**Solution:** Ensure API gateway is running and `VITE_API_URL` is correct.

```bash
# Check if API gateway is running
curl http://localhost:3000/health

# Verify frontend env variable
echo $VITE_API_URL
```

---

## Performance Expectations

**Without Caching:**

- Average response time: 800-1200ms
- Gemini API latency: 600-1000ms

**With Caching (80% hit rate):**

- Average response time: 200-400ms
- Cache hit latency: 50-100ms

**Rate Limiting Overhead:**

- < 5ms per request

---

## Next Steps

1. ✅ API gateway structure created
2. ✅ Rate limiting implemented
3. ✅ GeminiService abstraction complete
4. 🔲 Update frontend executors to use API gateway
5. 🔲 Deploy to Vercel
6. 🔲 Configure production secrets
7. 🔲 Add authentication layer
8. 🔲 Setup monitoring dashboard

---

## Related Documentation

- **Plan 26:** `plans/26_api_gateway_integration_strategy.md`
- **Plan 27:** `plans/27_data_governance_compliance_plan.md` (BAA requirements)
- **Security Audit:** `plans/04_security_audit.md`

---

_Last Updated: 2026-02-03_  
_Status: Ready for Phase 1 Implementation_
