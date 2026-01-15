import {
  WorldStateSchema,
  AgentLogSchema,
  AnalysisResultSchema,
  FileUploadSchema,
} from '../schemas/validation';

import type { WorldState, AgentLog, AnalysisResult, FileUpload } from '../schemas/validation';
import type { AgentLogEntry, ClinicianFeedback } from '../types';

export function isWorldState(obj: unknown): obj is WorldState {
  return WorldStateSchema.safeParse(obj).success;
}

export function isAgentLog(obj: unknown): obj is AgentLog {
  return AgentLogSchema.safeParse(obj).success;
}

export function isAgentLogEntry(obj: unknown): obj is AgentLogEntry {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const entry = obj as Partial<AgentLogEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.agent === 'string' &&
    ['pending', 'running', 'completed', 'failed'].includes(entry.status ?? '') &&
    typeof entry.message === 'string' &&
    typeof entry.timestamp === 'number'
  );
}

export function isAnalysisResult(obj: unknown): obj is AnalysisResult {
  return AnalysisResultSchema.safeParse(obj).success;
}

export function isFileUpload(obj: unknown): obj is FileUpload {
  return FileUploadSchema.safeParse(obj).success;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isClinicianFeedback(obj: unknown): obj is ClinicianFeedback {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const feedback = obj as Partial<ClinicianFeedback>;
  return (
    typeof feedback.id === 'string' &&
    typeof feedback.analysisId === 'string' &&
    typeof feedback.diagnosis === 'string' &&
    typeof feedback.confidence === 'number' &&
    typeof feedback.notes === 'string' &&
    typeof feedback.timestamp === 'number' &&
    typeof feedback.isCorrection === 'boolean'
  );
}
