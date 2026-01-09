import { describe, it, expect, vi, beforeEach } from 'vitest';
import AgentDB, { ReasoningBank } from '../../services/agentDB';

// Mock dependencies
const mockGetAllPatterns = vi.fn();
const mockClear = vi.fn();

const mockReasoningBank = {
  getAllPatterns: mockGetAllPatterns,
  clear: mockClear,
  storePattern: vi.fn(),
  searchPatterns: vi.fn(),
} as unknown as ReasoningBank;

describe('AgentDB', () => {
  let agentDB: AgentDB;

  beforeEach(() => {
    agentDB = AgentDB.getInstance();
    agentDB.setReasoningBank(mockReasoningBank);
    vi.clearAllMocks();
  });

  it('should calculate live stats correctly from raw patterns', async () => {
    // Mock patterns with mixed outcomes
    mockGetAllPatterns.mockResolvedValue([
      { metadata: { fitzpatrick: 'I' }, successRate: 0.9, confidence: 0.95 },
      { metadata: { fitzpatrick: 'I' }, successRate: 0.2, confidence: 0.4 }, // Failure
      { metadata: { fitzpatrick: 'VI' }, successRate: 0.8, confidence: 0.85 },
    ]);

    const stats = await agentDB.getLiveStats();

    // Type I: 1 Pass, 1 Fail. Initial TPR assumption might drift
    expect(stats['I'].count).toBe(2);
    expect(stats['VI'].count).toBe(1);
    expect(stats['II'].count).toBe(0);
    
    // Check if TPR calculation logic ran (stats should not be 0)
    expect(stats['I'].tpr).toBeGreaterThan(0);
  });

  it('should return default stats if db is empty or error occurs', async () => {
    mockGetAllPatterns.mockRejectedValue(new Error("DB Error"));
    const stats = await agentDB.getLiveStats();
    expect(stats['I'].count).toBe(0);
  });

  it('should format unified audit log correctly', async () => {
    mockGetAllPatterns.mockResolvedValue([
      { id: '1', timestamp: 1000, taskType: 'AUDIT_LOG', metadata: { context: 'Encrypted' }, outcome: 'Hash123' },
      { id: '2', timestamp: 2000, taskType: 'diagnosis', outcome: 'Melanoma', confidence: 0.9 }
    ]);

    const logs = await agentDB.getUnifiedAuditLog();
    
    expect(logs).toHaveLength(2);
    // Sort desc by timestamp
    expect(logs[0].id).toBe('2');
    expect(logs[1].id).toBe('1');
    
    expect(logs[1].type).toBe('audit');
    expect(logs[0].type).toBe('learning');
  });

  it('should reset memory via underlying bank', async () => {
    await agentDB.resetMemory();
    expect(mockClear).toHaveBeenCalled();
  });
});