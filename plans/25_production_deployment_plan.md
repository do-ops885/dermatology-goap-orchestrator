# Production Deployment Plan

**Agent:** DevOps-Lead 🏗️  
**Status:** ACTIVE  
**Last Updated:** 2026-02-03  
**Priority:** CRITICAL

---

## 1. Executive Summary

Comprehensive production deployment strategy for the Dermatology AI Orchestrator, covering infrastructure provisioning, deployment pipelines, rollback procedures, and operational readiness.

**Deployment Model:** Progressive delivery with blue-green deployment and feature flags  
**Target Environments:** Staging → Canary → Production  
**Rollback Time:** < 5 minutes  

---

## 2. Infrastructure Architecture

### 2.1 Hosting Strategy

**Recommended Platform:** Vercel / Netlify (Edge-optimized static hosting)

**Rationale:**
- Native support for React/Vite applications
- Global CDN with edge caching
- Automatic HTTPS and SSL certificates
- Built-in preview deployments for PRs
- Serverless function support for API routes
- Edge middleware for CSP headers

**Alternative:** AWS S3 + CloudFront + Lambda@Edge

### 2.2 Environment Configuration

```yaml
# Environments
Staging:
  url: https://staging.dermatology-ai.app
  purpose: Pre-production validation
  traffic: Internal QA team only
  
Canary:
  url: https://app.dermatology-ai.app
  purpose: Gradual rollout (5% traffic)
  traffic: 5% of production users
  monitoring: Enhanced metrics collection
  
Production:
  url: https://app.dermatology-ai.app
  purpose: Full production deployment
  traffic: 95% of users
  sla: 99.9% uptime
```

### 2.3 Infrastructure as Code

```terraform
# infrastructure/main.tf
terraform {
  required_version = ">= 1.0"
  
  backend "s3" {
    bucket = "dermatology-ai-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for static assets
resource "aws_s3_bucket" "app_bucket" {
  bucket = "dermatology-ai-production"
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    enabled = true
    
    noncurrent_version_expiration {
      days = 30
    }
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  
  origin {
    domain_name = aws_s3_bucket.app_bucket.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.app_bucket.id}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.app_bucket.id}"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }
  
  # Custom error responses
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

---

## 3. Deployment Pipeline

### 3.1 CI/CD Workflow

```yaml
# .github/workflows/deploy.yml
name: Production Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - staging
          - canary
          - production

jobs:
  pre-deployment-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check Version Bump
        run: |
          git fetch --tags
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          LATEST_TAG=$(git describe --tags --abbrev=0 || echo "v0.0.0")
          if [ "$CURRENT_VERSION" == "${LATEST_TAG#v}" ]; then
            echo "❌ Version not bumped"
            exit 1
          fi
      
      - name: Validate Changelog
        run: |
          if ! grep -q "$CURRENT_VERSION" CHANGELOG.md; then
            echo "❌ Changelog not updated"
            exit 1
          fi
      
      - name: Security Scan
        run: |
          npm audit --audit-level=high
          npx snyk test --severity-threshold=high
  
  build-and-test:
    needs: pre-deployment-checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Run Quality Gate
        run: npm run quality-gate
      
      - name: Build Production Bundle
        run: npm run build
        env:
          NODE_ENV: production
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
      
      - name: Run E2E Tests
        run: npx playwright test
      
      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: production-build
          path: dist/
          retention-days: 30
  
  deploy-staging:
    needs: build-and-test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Download Build Artifacts
        uses: actions/download-artifact@v4
        with:
          name: production-build
          path: dist/
      
      - name: Deploy to Staging
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./dist
          alias-domains: staging.dermatology-ai.app
      
      - name: Run Smoke Tests
        run: |
          npm run test:smoke -- --url=https://staging.dermatology-ai.app
  
  deploy-canary:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: canary
    if: github.event.inputs.environment == 'canary' || github.event.inputs.environment == 'production'
    steps:
      - name: Download Build Artifacts
        uses: actions/download-artifact@v4
        with:
          name: production-build
          path: dist/
      
      - name: Deploy Canary (5% Traffic)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./dist
          alias-domains: canary.dermatology-ai.app
      
      - name: Configure Traffic Split
        run: |
          # Route 5% of traffic to canary
          vercel alias set canary.dermatology-ai.app --traffic=5
      
      - name: Monitor Canary Health
        run: |
          npm run monitor:canary -- --duration=15m --threshold=99.5
  
  deploy-production:
    needs: deploy-canary
    runs-on: ubuntu-latest
    environment: production
    if: github.event.inputs.environment == 'production'
    steps:
      - name: Download Build Artifacts
        uses: actions/download-artifact@v4
        with:
          name: production-build
          path: dist/
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ needs.build-and-test.outputs.version }}
          release_name: Release v${{ needs.build-and-test.outputs.version }}
          draft: false
          prerelease: false
      
      - name: Deploy to Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./dist
          production: true
      
      - name: Warm Cache
        run: |
          # Preload critical resources on CDN
          curl -X POST https://api.vercel.com/v1/purge \
            -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
            -d '{"urls": ["/", "/assets/main.js", "/assets/vendor-react.js"]}'
      
      - name: Notify Deployment Success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: '✅ Production deployment completed successfully'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 3.2 Deployment Verification

```bash
#!/bin/bash
# scripts/verify-deployment.sh

DEPLOYMENT_URL=$1
EXPECTED_VERSION=$2

echo "🔍 Verifying deployment at $DEPLOYMENT_URL"

# Check if site is reachable
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Site unreachable (HTTP $HTTP_STATUS)"
  exit 1
fi

# Verify version
DEPLOYED_VERSION=$(curl -s "$DEPLOYMENT_URL/version.json" | jq -r '.version')
if [ "$DEPLOYED_VERSION" != "$EXPECTED_VERSION" ]; then
  echo "❌ Version mismatch: expected $EXPECTED_VERSION, got $DEPLOYED_VERSION"
  exit 1
fi

# Check critical resources
CRITICAL_RESOURCES=(
  "/assets/index.js"
  "/assets/vendor-react.js"
  "/assets/vendor-tfjs.js"
  "/manifest.json"
)

for resource in "${CRITICAL_RESOURCES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL$resource")
  if [ "$STATUS" != "200" ]; then
    echo "❌ Critical resource missing: $resource (HTTP $STATUS)"
    exit 1
  fi
done

echo "✅ Deployment verified successfully"
```

---

## 4. Rollback Strategy

### 4.1 Automated Rollback

```yaml
# .github/workflows/auto-rollback.yml
name: Auto Rollback

on:
  schedule:
    # Check health every 5 minutes after deployment
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Error Rate
        id: error_rate
        run: |
          # Query monitoring service
          ERROR_RATE=$(curl -s "https://api.monitoring.com/metrics?query=error_rate_5m" | jq -r '.value')
          echo "error_rate=$ERROR_RATE" >> $GITHUB_OUTPUT
          
          if (( $(echo "$ERROR_RATE > 5.0" | bc -l) )); then
            echo "❌ Error rate too high: $ERROR_RATE%"
            exit 1
          fi
      
      - name: Check Response Time
        id: response_time
        run: |
          P95_LATENCY=$(curl -s "https://api.monitoring.com/metrics?query=p95_latency" | jq -r '.value')
          echo "p95_latency=$P95_LATENCY" >> $GITHUB_OUTPUT
          
          if (( $(echo "$P95_LATENCY > 3000" | bc -l) )); then
            echo "❌ P95 latency too high: ${P95_LATENCY}ms"
            exit 1
          fi
      
      - name: Trigger Rollback
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            // Trigger rollback workflow
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'rollback.yml',
              ref: 'main'
            });
```

### 4.2 Manual Rollback Procedure

```bash
#!/bin/bash
# scripts/rollback.sh

ROLLBACK_VERSION=$1

if [ -z "$ROLLBACK_VERSION" ]; then
  echo "Usage: ./rollback.sh <version>"
  exit 1
fi

echo "🔄 Rolling back to version $ROLLBACK_VERSION"

# Fetch previous deployment
PREVIOUS_DEPLOYMENT=$(vercel list --scope=$VERCEL_ORG_ID \
  | grep "$ROLLBACK_VERSION" \
  | awk '{print $1}' \
  | head -1)

if [ -z "$PREVIOUS_DEPLOYMENT" ]; then
  echo "❌ Version $ROLLBACK_VERSION not found"
  exit 1
fi

# Promote previous deployment to production
vercel alias set "$PREVIOUS_DEPLOYMENT" app.dermatology-ai.app --scope=$VERCEL_ORG_ID

# Verify rollback
./scripts/verify-deployment.sh https://app.dermatology-ai.app "$ROLLBACK_VERSION"

echo "✅ Rollback completed successfully"

# Send notification
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"⚠️ Production rolled back to version $ROLLBACK_VERSION\"}"
```

---

## 5. Feature Flags

### 5.1 Feature Flag Implementation

```typescript
// services/featureFlags.ts
export class FeatureFlagService {
  private flags = new Map<string, boolean>();
  
  async initialize(): Promise<void> {
    // Fetch flags from remote config
    const response = await fetch('/api/feature-flags');
    const flags = await response.json();
    
    Object.entries(flags).forEach(([key, value]) => {
      this.flags.set(key, value as boolean);
    });
  }
  
  isEnabled(flag: string): boolean {
    return this.flags.get(flag) ?? false;
  }
  
  // Progressive rollout
  isEnabledForUser(flag: string, userId: string): boolean {
    const rolloutPercentage = this.getRolloutPercentage(flag);
    const hash = this.hashUserId(userId);
    return hash <= rolloutPercentage;
  }
  
  private getRolloutPercentage(flag: string): number {
    const config = this.flags.get(`${flag}_rollout`);
    return config ? Number(config) : 0;
  }
  
  private hashUserId(userId: string): number {
    // Simple hash function (0-100)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 100);
  }
}

// Usage in components
const featureFlags = new FeatureFlagService();

export const DiagnosticSummary = () => {
  const showNewUI = featureFlags.isEnabled('new_diagnostic_ui');
  
  return showNewUI ? <NewDiagnosticSummary /> : <LegacyDiagnosticSummary />;
};
```

### 5.2 Feature Flag Configuration

```json
// config/feature-flags.json
{
  "features": {
    "web_llm_inference": {
      "enabled": true,
      "rollout": 100,
      "description": "Enable WebLLM for local inference"
    },
    "gemini_vision": {
      "enabled": true,
      "rollout": 50,
      "description": "Use Gemini for skin tone detection"
    },
    "fairness_dashboard": {
      "enabled": true,
      "rollout": 100,
      "description": "Show fairness metrics dashboard"
    },
    "experimental_webgpu": {
      "enabled": false,
      "rollout": 5,
      "description": "Enable WebGPU backend for TensorFlow.js"
    }
  }
}
```

---

## 6. Configuration Management

### 6.1 Environment Variables

```bash
# .env.production
VITE_API_URL=https://api.dermatology-ai.app
VITE_GEMINI_API_KEY=<encrypted>
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=<encrypted>
VITE_LOG_LEVEL=error
VITE_FEATURE_FLAGS_URL=https://config.dermatology-ai.app/flags
```

### 6.2 Secret Management

```yaml
# Use GitHub Secrets for sensitive data
secrets:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
  SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}

# Rotate secrets quarterly
rotation_policy:
  frequency: 90 days
  notification: 14 days before expiry
```

---

## 7. Monitoring and Alerting

### 7.1 Health Checks

```typescript
// api/health.ts
export const healthCheck = async (): Promise<HealthStatus> => {
  const checks = await Promise.all([
    checkDatabase(),
    checkAPIConnectivity(),
    checkMLModels(),
    checkStorage()
  ]);
  
  const status = checks.every(c => c.healthy) ? 'healthy' : 'degraded';
  
  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    checks: {
      database: checks[0],
      api: checks[1],
      models: checks[2],
      storage: checks[3]
    }
  };
};
```

### 7.2 Alert Rules

```yaml
# monitoring/alerts.yml
alerts:
  - name: high_error_rate
    condition: error_rate_5m > 5
    severity: critical
    channels: [slack, pagerduty]
    
  - name: high_latency
    condition: p95_latency > 3000
    severity: warning
    channels: [slack]
    
  - name: low_availability
    condition: uptime_percentage < 99.9
    severity: critical
    channels: [slack, pagerduty, email]
    
  - name: deployment_failed
    condition: deployment_status == 'failed'
    severity: critical
    channels: [slack, email]
```

---

## 8. Post-Deployment Validation

### 8.1 Smoke Tests

```typescript
// tests/smoke/production.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Production Smoke Tests', () => {
  test('Homepage loads successfully', async ({ page }) => {
    await page.goto('https://app.dermatology-ai.app');
    await expect(page).toHaveTitle(/Dermatology AI/);
  });
  
  test('Critical user flow works', async ({ page }) => {
    await page.goto('https://app.dermatology-ai.app');
    
    // Upload image
    await page.setInputFiles('input[type="file"]', 'test-fixtures/sample.jpg');
    
    // Wait for analysis
    await expect(page.locator('[data-testid="diagnostic-summary"]'))
      .toBeVisible({ timeout: 30000 });
    
    // Verify results displayed
    await expect(page.locator('[data-testid="diagnosis-result"]'))
      .toContainText(/melanoma|benign/i);
  });
  
  test('PWA manifest available', async ({ page }) => {
    const response = await page.goto('https://app.dermatology-ai.app/manifest.json');
    expect(response?.status()).toBe(200);
    
    const manifest = await response?.json();
    expect(manifest.name).toBe('Dermatology AI Orchestrator');
  });
});
```

### 8.2 Performance Validation

```bash
#!/bin/bash
# scripts/performance-check.sh

URL=$1

echo "🏃 Running performance checks on $URL"

# Run Lighthouse
lighthouse "$URL" \
  --only-categories=performance,accessibility,best-practices,seo,pwa \
  --output=json \
  --output-path=./lighthouse-results.json \
  --chrome-flags="--headless"

# Extract scores
PERFORMANCE=$(jq '.categories.performance.score * 100' lighthouse-results.json)
ACCESSIBILITY=$(jq '.categories.accessibility.score * 100' lighthouse-results.json)

echo "Performance Score: $PERFORMANCE"
echo "Accessibility Score: $ACCESSIBILITY"

# Fail if below thresholds
if (( $(echo "$PERFORMANCE < 90" | bc -l) )); then
  echo "❌ Performance score too low"
  exit 1
fi

if (( $(echo "$ACCESSIBILITY < 95" | bc -l) )); then
  echo "❌ Accessibility score too low"
  exit 1
fi

echo "✅ Performance checks passed"
```

---

## 9. Operational Runbook

### 9.1 Deployment Checklist

**Pre-Deployment:**
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] All tests passing on main branch
- [ ] Security audit clean (no high/critical vulnerabilities)
- [ ] Bundle size within budget
- [ ] Feature flags configured
- [ ] Secrets rotated (if scheduled)
- [ ] Stakeholders notified

**During Deployment:**
- [ ] Monitor deployment logs
- [ ] Watch error rates in real-time
- [ ] Verify health checks passing
- [ ] Check CDN cache warming
- [ ] Validate version deployed correctly

**Post-Deployment:**
- [ ] Run smoke tests
- [ ] Verify Web Vitals metrics
- [ ] Check error tracking dashboard
- [ ] Monitor user feedback channels
- [ ] Update documentation
- [ ] Create GitHub release
- [ ] Notify team of successful deployment

### 9.2 Incident Response

```markdown
# Incident Response Playbook

## Severity Levels
- **P0 (Critical)**: Complete service outage
- **P1 (High)**: Major feature broken, affecting >50% users
- **P2 (Medium)**: Minor feature broken, workaround available
- **P3 (Low)**: Cosmetic issue, no functional impact

## Response Times
- P0: Immediate response, 15-minute rollback SLA
- P1: Response within 30 minutes
- P2: Response within 4 hours
- P3: Response within 24 hours

## Escalation Path
1. On-call engineer notified
2. Team lead notified (P0/P1)
3. Engineering manager notified (P0)
4. CTO notified (P0 lasting > 1 hour)
```

---

## 10. Success Criteria

### 10.1 Deployment Metrics

| Metric | Target | Current | Status |
|:-------|:-------|:--------|:-------|
| **Deployment Frequency** | Daily | TBD | 🟡 Pending |
| **Lead Time** | < 1 hour | TBD | 🟡 Pending |
| **MTTR** | < 15 min | TBD | 🟡 Pending |
| **Change Failure Rate** | < 5% | TBD | 🟡 Pending |
| **Deployment Success Rate** | > 95% | TBD | 🟡 Pending |

### 10.2 Production SLA

```yaml
sla:
  uptime: 99.9%  # ~43 minutes downtime/month
  response_time: 
    p50: < 1000ms
    p95: < 2500ms
    p99: < 5000ms
  error_rate: < 0.1%
  availability_zones: 3+ regions
```

---

## 11. Related Plans

- **03_devops_workflow.md**: CI/CD pipeline configuration
- **04_security_audit.md**: Security requirements for production
- **06_reliability_observability.md**: Monitoring and alerting setup
- **24_performance_optimization_strategy.md**: Performance targets

---

_Agent: DevOps-Lead 🏗️_  
_Next Review: 2026-02-10_
