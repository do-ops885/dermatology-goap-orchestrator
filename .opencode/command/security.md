---
description: Validate security compliance for code changes
agent: plan
---

Perform security audit for the codebase.

Tasks:

1. Check CSP configuration in `index.html`
2. Review encryption implementation in `services/crypto.ts`
3. Validate input sanitization across services
4. Check for sensitive data in logs or error messages
5. Review dependency security (if applicable)

Focus on:

- AES-256-GCM encryption usage
- GDPR/HIPAA compliance for patient data
- CSP headers and XSS prevention
- Audit logging for data access

Provide:

- Security compliance report
- Any vulnerabilities found
- Recommendations for hardening
- Checklist for security best practices

$ARGUMENTS
