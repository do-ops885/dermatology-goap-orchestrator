/**
 * PII Redaction Service
 * Provides comprehensive PII detection and redaction for compliance and privacy.
 */

export const PIIPatterns = {
  // SSN patterns (US Social Security Numbers)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  ssnNoDashes: /\b\d{9}\b/g,

  // Phone numbers (US formats)
  phone: /\b\d{10,12}\b/g,
  phoneFormatted: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

  // IP addresses
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,

  // Date of birth patterns
  dob: /\b(?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
};

export interface PIIRedactionOptions {
  maskPhone?: boolean;
  maskEmail?: boolean;
  maskSSN?: boolean;
  maskDOB?: boolean;
  customPatterns?: RegExp[];
}

export class PIIRedactor {
  private static instance: PIIRedactor;

  public static getInstance(): PIIRedactor {
    PIIRedactor.instance ??= new PIIRedactor();
    return PIIRedactor.instance;
  }

  /**
   * Redacts PII from text using configurable patterns.
   */
  public redactPII(
    text: string,
    options: PIIRedactionOptions = {
      maskPhone: true,
      maskEmail: true,
      maskSSN: true,
      maskDOB: true,
    },
  ): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let redactedText = text;

    // Apply standard patterns based on options
    if (options.maskSSN === true) {
      redactedText = redactedText.replace(PIIPatterns.ssn, '[SSN-REDACTED]');
      redactedText = redactedText.replace(PIIPatterns.ssnNoDashes, '[SSN-REDACTED]');
    }

    if (options.maskPhone === true) {
      redactedText = redactedText.replace(PIIPatterns.phone, '[PHONE-REDACTED]');
      redactedText = redactedText.replace(PIIPatterns.phoneFormatted, '[PHONE-REDACTED]');
    }

    if (options.maskEmail === true) {
      redactedText = redactedText.replace(PIIPatterns.email, '[EMAIL-REDACTED]');
    }

    // Always redact credit cards and IP addresses for security
    redactedText = redactedText.replace(PIIPatterns.creditCard, '[CREDIT-CARD-REDACTED]');
    redactedText = redactedText.replace(PIIPatterns.ipAddress, '[IP-REDACTED]');

    if (options.maskDOB === true) {
      redactedText = redactedText.replace(PIIPatterns.dob, '[DOB-REDACTED]');
    }

    // Apply custom patterns if provided
    if (options.customPatterns) {
      for (const pattern of options.customPatterns) {
        redactedText = redactedText.replace(pattern, '[CUSTOM-PII-REDACTED]');
      }
    }

    return redactedText;
  }

  /**
   * Detects presence of PII without redaction (for validation).
   */
  public detectPII(text: string): { hasPII: boolean; types: string[] } {
    if (!text || typeof text !== 'string') {
      return { hasPII: false, types: [] };
    }

    const detectedTypes: string[] = [];

    if (PIIPatterns.ssn.test(text) || PIIPatterns.ssnNoDashes.test(text)) {
      detectedTypes.push('ssn');
    }
    if (PIIPatterns.phone.test(text) || PIIPatterns.phoneFormatted.test(text)) {
      detectedTypes.push('phone');
    }
    if (PIIPatterns.email.test(text)) {
      detectedTypes.push('email');
    }
    if (PIIPatterns.creditCard.test(text)) {
      detectedTypes.push('credit_card');
    }
    if (PIIPatterns.ipAddress.test(text)) {
      detectedTypes.push('ip_address');
    }
    if (PIIPatterns.dob.test(text)) {
      detectedTypes.push('date_of_birth');
    }

    return {
      hasPII: detectedTypes.length > 0,
      types: detectedTypes,
    };
  }

  /**
   * Sanitizes agent log entries by removing PII from messages and metadata.
   */
  public sanitizeAgentLog(
    event: string,
    metadata?: Record<string, unknown>,
  ): { sanitizedEvent: string; sanitizedMetadata?: Record<string, unknown> | undefined } {
    const sanitizedEvent = this.redactPII(event);
    const sanitizedMetadata = metadata ? this.sanitizeMetadata(metadata) : undefined;

    return {
      sanitizedEvent: sanitizedEvent,
      sanitizedMetadata: sanitizedMetadata,
    };
  }

  /**
   * Sanitizes AI responses to remove PII.
   */
  public sanitizeAIResponse(response: string): string {
    return this.redactPII(response, {
      maskPhone: true,
      maskEmail: true,
      maskSSN: true,
      maskDOB: true,
    });
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...metadata };

    // List of keys that commonly contain PII
    const piiKeys = ['name', 'email', 'phone', 'ssn', 'dob', 'address', 'patientId', 'userId'];

    for (const key of piiKeys) {
      if (key in sanitized && typeof sanitized[key] === 'string') {
        sanitized[key] = this.redactPII(sanitized[key] as string);
      }
    }

    return sanitized;
  }
}

export const PIIRedactorInstance = PIIRedactor.getInstance();
