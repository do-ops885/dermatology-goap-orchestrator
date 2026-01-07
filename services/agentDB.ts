import { ReasoningPattern, FitzpatrickType } from '../types';

// --- Types ---

export interface DatabaseAdapter {
    get(key: string): Promise<any>;
    put(key: string, value: any): Promise<void>;
    getAll(): Promise<any[]>;
    clear(): Promise<void>;
}

// --- IndexedDB Implementation for Browser Persistence ---

class BrowserDatabase implements DatabaseAdapter {
    private dbName: string;
    private storeName = 'patterns';
    private dbPromise: Promise<IDBDatabase> | null = null;

    constructor(path: string) {
        this.dbName = path;
    }

    private async open(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
        return this.dbPromise;
    }

    async get(key: string): Promise<any> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(key: string, value: any): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.put({ ...value, id: key });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(): Promise<any[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clear(): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// --- AgentDB v2 Core Components ---

export const createDatabase = async (path: string): Promise<DatabaseAdapter> => {
    // In a real Node env this might use SQLite, here we use IndexedDB
    return new BrowserDatabase(path);
};

export class EmbeddingService {
    private model: string;
    
    constructor(config: { model: string } = { model: 'Xenova/all-MiniLM-L6-v2' }) {
        this.model = config.model;
    }

    async initialize() {
        console.log(`[EmbeddingService] Initialized model: ${this.model}`);
        return Promise.resolve();
    }

    // Deterministic embedding simulation for demo purposes
    // In production, this would call a real model (Transformers.js or API)
    async embed(text: string): Promise<Float32Array> {
        const vec = new Float32Array(128); 
        let seed = 0;
        for(let i=0; i<text.length; i++) seed = (seed << 5) - seed + text.charCodeAt(i);
        
        for(let i=0; i<128; i++) {
            const x = Math.sin(seed + i) * 10000;
            vec[i] = x - Math.floor(x);
        }
        return this.normalize(vec);
    }

    private normalize(vec: Float32Array): Float32Array {
        let sum = 0;
        for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
        const mag = Math.sqrt(sum) || 1;
        for (let i = 0; i < vec.length; i++) vec[i] /= mag;
        return vec;
    }
}

export class ReasoningBank {
    constructor(private db: DatabaseAdapter, private embedder: EmbeddingService) {
        this.seedIfNeeded();
    }

    private async seedIfNeeded() {
        const existing = await this.db.getAll();
        if (existing.length === 0) {
            console.log('[ReasoningBank] Seeding initial clinical knowledge...');
            const seeds = [
                { 
                    context: "Fitzpatrick I, Irregular Border, High UV exposure", 
                    approach: "Standard Segmentation with High Sensitivity", 
                    outcome: "Malignant Melanoma detected", 
                    confidence: 0.98,
                    metadata: { fitzpatrick: 'I', risk: 'High', verified: true }
                },
                { 
                    context: "Fitzpatrick VI, Dark patch on palm", 
                    approach: "FairDisCo feature extraction with Safety Calibration", 
                    outcome: "Benign hyperpigmentation (Acral)", 
                    confidence: 0.92,
                    metadata: { fitzpatrick: 'VI', risk: 'Low', verified: true }
                },
                { 
                    context: "Fitzpatrick III, Asymmetric mole with multiple colors", 
                    approach: "Standard segmentation", 
                    outcome: "Dysplastic Nevus", 
                    confidence: 0.88,
                    metadata: { fitzpatrick: 'III', risk: 'Medium', verified: true }
                },
                {
                    context: "Fitzpatrick IV, Uniform brown macule",
                    approach: "Standard analysis",
                    outcome: "Benign Nevus",
                    confidence: 0.95,
                    metadata: { fitzpatrick: 'IV', risk: 'Low', verified: true }
                },
                {
                    context: "Fitzpatrick II, Red scaly patch",
                    approach: "Texture analysis",
                    outcome: "Actinic Keratosis",
                    confidence: 0.85,
                    metadata: { fitzpatrick: 'II', risk: 'Medium', verified: true }
                }
            ];

            for (const s of seeds) {
                await this.storePattern({
                    taskType: 'diagnosis',
                    context: s.context,
                    approach: s.approach,
                    outcome: s.outcome,
                    confidence: s.confidence,
                    metadata: s.metadata as any
                });
            }
        }
    }

    async storePattern(pattern: Omit<ReasoningPattern, 'id' | 'timestamp'> & { id?: string, timestamp?: number }) {
        const text = `${pattern.context} ${pattern.approach} ${pattern.outcome}`;
        const vector = await this.embedder.embed(text);
        
        const id = pattern.id || `pat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record = {
            id,
            timestamp: pattern.timestamp || Date.now(),
            vector: Array.from(vector), // Store as array for IndexedDB compatibility
            data: { ...pattern, id }
        };

        await this.db.put(id, record);
    }

    async getAllPatterns(): Promise<ReasoningPattern[]> {
        const records = await this.db.getAll();
        return records.map(r => r.data);
    }
    
    async getRecentPatterns(limit: number = 10): Promise<ReasoningPattern[]> {
        const all = await this.getAllPatterns();
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
    
    async clear(): Promise<void> {
        await this.db.clear();
        await this.seedIfNeeded();
    }

    async searchPatterns(query: string, k: number = 3): Promise<ReasoningPattern[]> {
        const queryVec = await this.embedder.embed(query);
        const allRecords = await this.db.getAll();
        
        // Compute Cosine similarity
        const scored = allRecords.map(rec => {
            const vec = new Float32Array(rec.vector);
            const sim = this.cosineSimilarity(queryVec, vec);
            return { ...rec.data, score: sim };
        });

        // Sort by similarity desc
        return scored.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, k);
    }

    private cosineSimilarity(a: Float32Array, b: Float32Array): number {
        let dot = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
        }
        return dot; 
    }
}

// --- Legacy Facade for UI Components ---
class AgentDB {
  private static instance: AgentDB;
  public reasoningBank: ReasoningBank | null = null;
  
  // Static baseline stats
  private fairnessStats: Record<FitzpatrickType, { tpr: number; fpr: number; count: number }> = {
    'I': { tpr: 0.92, fpr: 0.05, count: 120 },
    'II': { tpr: 0.91, fpr: 0.06, count: 145 },
    'III': { tpr: 0.93, fpr: 0.04, count: 180 },
    'IV': { tpr: 0.89, fpr: 0.07, count: 210 },
    'V': { tpr: 0.88, fpr: 0.08, count: 150 },
    'VI': { tpr: 0.87, fpr: 0.09, count: 130 },
  };

  private constructor() {}

  public static getInstance(): AgentDB {
    if (!AgentDB.instance) {
      AgentDB.instance = new AgentDB();
    }
    return AgentDB.instance;
  }

  public setReasoningBank(bank: ReasoningBank) {
      this.reasoningBank = bank;
  }

  public async init(): Promise<void> {
      return Promise.resolve(); 
  }
  
  public async resetMemory(): Promise<void> {
      if(this.reasoningBank) {
          await this.reasoningBank.clear();
      }
  }

  public getFairnessMetrics() { return this.fairnessStats; }

  // New method to get live aggregated stats from the persistent store
  public async getLiveStats(): Promise<Record<FitzpatrickType, { tpr: number; fpr: number; count: number }>> {
    if (!this.reasoningBank) return this.fairnessStats;
    
    const patterns = await this.reasoningBank.getAllPatterns();
    const stats = JSON.parse(JSON.stringify(this.fairnessStats)); // Clone baseline

    // Aggregate real data on top of baseline
    patterns.forEach(p => {
        if (p.metadata?.fitzpatrick) {
            const type = p.metadata.fitzpatrick as FitzpatrickType;
            if (stats[type]) {
                stats[type].count += 1;
                // Improve TPR slightly with more data (simulating active learning)
                stats[type].tpr = Math.min(0.995, stats[type].tpr + 0.0005);
            }
        }
    });
    
    return stats;
  }
  
  // Merges static alerts with real-time "learning" events from the database
  public async getUnifiedAuditLog(): Promise<any[]> {
     const staticAlerts = [
        { id: 'alert_01', timestamp: Date.now() - 172800000, severity: 'medium', message: 'TPR Gap increased for Type V-VI (0.07)', status: 'resolved', mitigation: 'Resampled DDI-CoCo dataset', type: 'alert' },
        { id: 'alert_02', timestamp: Date.now() - 432000000, severity: 'low', message: 'Calibration drift detected in Type I', status: 'monitoring', mitigation: 'Adjusted thresholds (+0.02)', type: 'alert' },
     ];
     
     if (!this.reasoningBank) return staticAlerts;
     
     const patterns = await this.reasoningBank.getRecentPatterns(20);
     const learningEvents = patterns.map(p => ({
         id: p.id,
         timestamp: p.timestamp,
         severity: 'info',
         message: `Learned pattern: ${p.outcome} (${p.context})`,
         status: 'verified',
         mitigation: `Confidence: ${(p.confidence * 100).toFixed(1)}%`,
         type: 'learning'
     }));
     
     return [...learningEvents, ...staticAlerts].sort((a, b) => b.timestamp - a.timestamp);
  }

  public getBiasAlerts() {
    return [
      { id: 'alert_01', timestamp: Date.now() - 172800000, severity: 'medium', message: 'TPR Gap increased for Type V-VI (0.07)', status: 'resolved', mitigation: 'Resampled DDI-CoCo dataset' },
      { id: 'alert_02', timestamp: Date.now() - 432000000, severity: 'low', message: 'Calibration drift detected in Type I', status: 'monitoring', mitigation: 'Adjusted thresholds (+0.02)' },
      { id: 'alert_03', timestamp: Date.now() - 604800000, severity: 'low', message: 'Under-representation in nightly batch (Type VI)', status: 'resolved', mitigation: 'SMOTE oversampling triggered' }
    ];
  }

  public getCalibrationData() {
    const points = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    return points.map(prob => ({
      prob,
      perfect: prob,
      TypeI: prob + (prob < 0.5 ? 0.02 : -0.01),
      TypeVI: prob + (prob > 0.3 && prob < 0.7 ? -0.05 : 0.01) 
    }));
  }

  public getHistoricalTrends() {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
      day,
      parity: 0.88 + (Math.random() * 0.07),
      odds: 0.85 + (Math.random() * 0.1),
      gap: 0.08 - (i * 0.005)
    }));
  }

  public async logAuditEvent(event: any) {
    return Promise.resolve();
  }
}

export default AgentDB;