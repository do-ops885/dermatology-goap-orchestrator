import { useState, useRef, useEffect, useTransition, useOptimistic, useDeferredValue, useCallback, useMemo } from 'react';
import { useActionState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GOAPPlanner } from '../services/goap';
import AgentDB, { createDatabase, ReasoningBank, EmbeddingService, LocalLLMService } from '../services/agentDB';
import type { VisionSpecialist } from '../services/vision';
import { RouterAgent } from '../services/router';
import { AgentLogEntry, INITIAL_STATE, WorldState, AgentAction } from '../types';
import { CryptoService } from '../services/crypto';
import { Logger } from '../services/logger';
import { ExecutionTrace } from '../services/goap/agent';
import {
  imageVerificationExecutor,
  skinToneDetectionExecutor,
  calibrationExecutor,
  preprocessingExecutor,
  segmentationExecutor,
  featureExtractionExecutor,
  lesionDetectionExecutor,
  similaritySearchExecutor,
  riskAssessmentExecutor,
  fairnessAuditExecutor,
  webVerificationExecutor,
  recommendationExecutor,
  learningExecutor,
  privacyEncryptionExecutor,
  auditTrailExecutor,
  type AgentContext
} from '../services/executors';

const GEMINI_API_KEY = process.env.API_KEY || '';

const optimizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const calculateImageHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const validateImageSignature = async (file: File): Promise<boolean> => {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
  return false;
};

const AGENT_EXECUTORS: Record<string, (ctx: AgentContext) => Promise<any>> = {
  'Image-Verification-Agent': imageVerificationExecutor,
  'Skin-Tone-Detection-Agent': skinToneDetectionExecutor,
  'Standard-Calibration-Agent': calibrationExecutor,
  'Safety-Calibration-Agent': calibrationExecutor,
  'Image-Preprocessing-Agent': preprocessingExecutor,
  'Segmentation-Agent': segmentationExecutor,
  'Feature-Extraction-Agent': featureExtractionExecutor,
  'Lesion-Detection-Agent': lesionDetectionExecutor,
  'Similarity-Search-Agent': similaritySearchExecutor,
  'Risk-Assessment-Agent': riskAssessmentExecutor,
  'Fairness-Audit-Agent': fairnessAuditExecutor,
  'Web-Verification-Agent': webVerificationExecutor,
  'Recommendation-Agent': recommendationExecutor,
  'Learning-Agent': learningExecutor,
  'Privacy-Encryption-Agent': privacyEncryptionExecutor,
  'Audit-Trail-Agent': auditTrailExecutor
};

export const useClinicalAnalysis = () => {
  const [dbReady, setDbReady] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [worldState, setWorldState] = useState<WorldState>(INITIAL_STATE);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<{ text: string; percent: number } | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | undefined>(undefined);

  const [isPending, startTransition] = useTransition();
  const [optimisticLogs, addOptimisticLog] = useOptimistic(logs, (state: AgentLogEntry[], newLog: AgentLogEntry) => [...state, newLog]);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);

  const filteredLogs = useMemo(() => {
    if (!deferredQuery) return logs;
    return logs.filter(log =>
      log.agent.toLowerCase().includes(deferredQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [logs, deferredQuery]);

  const planner = useRef(new GOAPPlanner());
  const agentDBRef = useRef<AgentDB | null>(null);
  const reasoningBankRef = useRef<ReasoningBank | null>(null);
  const routerRef = useRef(RouterAgent.getInstance());
  const localLLMRef = useRef<LocalLLMService | null>(null);
  const visionSpecialistRef = useRef<VisionSpecialist | null>(null);
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const lastAuditHashRef = useRef<string>('0000000000000000000000000000000000000000000000000000000000000000');

  useEffect(() => {
    const initCoreServices = async () => {
      try {
        encryptionKeyRef.current = await CryptoService.generateEphemeralKey();
        const db = await createDatabase('./agent-memory.db');
        const embedder = new EmbeddingService({ model: 'Xenova/all-MiniLM-L6-v2', dimension: 384, provider: 'transformers' });
        await embedder.initialize();
        const bank = new ReasoningBank(db, embedder);
        reasoningBankRef.current = bank;
        const instance = AgentDB.getInstance();
        instance.setReasoningBank(bank);
        agentDBRef.current = instance;
        setDbReady(true);
        Logger.info('System', 'Core services initialized');
      } catch (e) {
        Logger.error('System', 'Core Service Init Failed', { error: e });
        setDbReady(true);
      }
    };
    initCoreServices();
  }, []);

  const initAIServices = async () => {
    if (aiReady || visionSpecialistRef.current) return;
    try {
      Logger.info('System', 'Lazy loading AI models...');
      const { VisionSpecialist } = await import('../services/vision');
      visionSpecialistRef.current = VisionSpecialist.getInstance();
      await visionSpecialistRef.current.initialize();
      localLLMRef.current = new LocalLLMService();
      localLLMRef.current.initialize((report) => {
        const percent = Math.round(report.progress * 100);
        setModelProgress({ text: report.text.length > 50 ? report.text.substring(0, 50) + '...' : report.text, percent });
        if (percent === 100 || report.text.toLowerCase().includes("finish")) {
          setTimeout(() => setModelProgress(null), 2500);
        }
      }).catch(e => {
        Logger.warn("System", "Local LLM failed, cloud fallback active", { error: e });
        setModelProgress(null);
      });
      setAiReady(true);
    } catch (e) {
      Logger.error('System', 'AI Service Init Failed', { error: e });
    }
  };

  const addLog = useCallback((agent: string, message: string, status: AgentLogEntry['status'], metadata?: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newLog: AgentLogEntry = { id, agent, message, status, timestamp: Date.now(), metadata };
    addOptimisticLog(newLog);
    startTransition(() => {
      setLogs(prev => [...prev, newLog]);
    });
    Logger.log(status === 'failed' ? 'error' : 'info', agent, message, metadata);
    return id;
  }, [addOptimisticLog]);

  const updateLog = useCallback((id: string, status: AgentLogEntry['status'], metadata?: any) => {
    startTransition(() => {
      setLogs(prev => prev.map(log => log.id === id ? { ...log, status, metadata: { ...log.metadata, ...metadata } } : log));
    });
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setWarning(null);
    initAIServices();

    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(f.type)) {
        setError("Security Protocol: Invalid file format.");
        setPreview(null);
        setFile(null);
        e.target.value = '';
        return;
      }
      
      const MAX_SIZE = 10 * 1024 * 1024;
      if (f.size > MAX_SIZE) {
        setError("Security Alert: File size exceeds safe processing limit (10MB).");
        setPreview(null);
        setFile(null);
        e.target.value = '';
        return;
      }

      const isValidSignature = await validateImageSignature(f);
      if (!isValidSignature) {
        setError("Security Alert: File signature mismatch.");
        setPreview(null);
        setFile(null);
        e.target.value = '';
        return;
      }

      startTransition(() => {
        setFile(f);
        setPreview(URL.createObjectURL(f));
        setResult(null);
        setLogs([]);
        setWorldState(INITIAL_STATE);
      });
    }
  }, [initAIServices]);

  async function submitAnalysis(prev: any, formData: FormData) {
    const result = await executeAnalysis();
    return result;
  }

  const [, action, pending] = useActionState(submitAnalysis, null);

  const executeAnalysis = useCallback(async () => {
    if (!file) return null;
    if (!GEMINI_API_KEY && !privacyMode) {
      setError("System Configuration Error: API_KEY is missing.");
      return null;
    }

    setAnalyzing(true);
    setError(null);
    setWarning(null);
    setLogs([]);
    setTrace(null);
    setCurrentAgent(undefined);
    await initAIServices();

    let currentState = { ...INITIAL_STATE };
    setWorldState(currentState);

    const analysisPayload: any = {};
    const actionTrace: string[] = [];
    const goalState: Partial<WorldState> = { audit_logged: true };
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    try {
      const base64Image = await optimizeImage(file);
      const imageHash = await calculateImageHash(file);
      const intent = routerRef.current.route({ file, action: 'Clinical Analysis' });
      const requiredSpecialist = routerRef.current.getRequiredSpecialist(intent);
      addLog('Router-Agent', `Routed intent: ${intent} -> ${requiredSpecialist}`, 'completed', { intent });

      const { GoapAgent } = await import('../services/goap/agent');
      const goapAgent = new GoapAgent(planner.current, AGENT_EXECUTORS, { perAgentTimeoutMs: 10000 });
      const uiLogMap = new Map<string, string>();

      const trace = await goapAgent.execute(currentState, goalState, {
        ai,
        agentDB: agentDBRef.current!,
        reasoningBank: reasoningBankRef.current!,
        localLLM: localLLMRef.current!,
        visionSpecialist: visionSpecialistRef.current!,
        router: routerRef.current,
        file,
        base64Image,
        imageHash,
        setResult,
        setWarning,
        analysisPayload,
        encryptionKey: encryptionKeyRef.current,
        lastAuditHashRef,
        privacyMode,
        actionTrace,
        onAgentStart: (action: AgentAction) => {
          const logId = addLog(action.agentId, action.description, 'running');
          uiLogMap.set(action.agentId + '|' + action.name, logId);
          setCurrentAgent(action.agentId);
          setTrace(prev => prev || {
            runId: 'run_' + Math.random().toString(36).slice(2, 9),
            startTime: Date.now(),
            agents: [],
            finalWorldState: currentState
          });
          return logId;
        },
        onAgentEnd: (action: AgentAction, record: any) => {
          const key = action.agentId + '|' + action.name;
          const logId = uiLogMap.get(key);
          if (logId) updateLog(logId, record.status === 'completed' ? 'completed' : 'failed', record.metadata);
          setTrace(prev => prev ? {
            ...prev,
            agents: [...prev.agents, record]
          } : null);
          if (record.status !== 'running') {
            setCurrentAgent(undefined);
          }
        }
      });

      currentState = trace.finalWorldState;
      setWorldState(currentState);
      actionTrace.push(...trace.agents.map(a => a.agentId));
      addLog('GOAP-Agent', `Plan ${trace.runId} completed in ${trace.endTime! - trace.startTime}ms`, 'completed', { runId: trace.runId, agents: trace.agents.map(a => ({ agent: a.agentId, status: a.status })) });
      setResult({ ...analysisPayload });
      return { success: true, data: analysisPayload };
    } catch (e: any) {
      let errorCategory = "System Failure";
      let userMessage = `Orchestration halted: ${e.message}`;
      const msg = e.message || '';
      
      if (msg.includes("No plan found")) {
        errorCategory = "Planning Failure";
        userMessage = "The AI planner could not formulate a valid strategy.";
      } else if (msg.includes("Vision Model") || msg.includes("Inference Failed")) {
        errorCategory = "Vision Engine Failure";
        userMessage = "The client-side neural network crashed.";
      } else if (msg.includes("API_KEY") && !privacyMode) {
        errorCategory = "Authorization Error";
        userMessage = "Access denied by cloud reasoning services.";
      }

      setError(userMessage);
      addLog('System', `Critical Stop: ${errorCategory}`, 'failed', { raw: msg });
      Logger.error('Orchestrator', 'Execution Failed', { error: e });
      return { success: false, error: userMessage };
    } finally {
      setAnalyzing(false);
    }
  }, [file, privacyMode, addLog, updateLog, initAIServices]);

  return {
    file, preview, logs: filteredLogs, worldState, result, error, warning, modelProgress, analyzing, dbReady,
    isPending, pending, searchQuery, setSearchQuery, handleFileChange, executeAnalysis, privacyMode, setPrivacyMode, action, actionState: null,
    trace, currentAgent
  };
};
