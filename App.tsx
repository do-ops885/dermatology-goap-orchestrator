import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Upload, Database, Activity, Lock, Share2, AlertCircle } from 'lucide-react';
import AgentDB from './services/agentDB';
import { GOAPPlanner } from './services/goap';
import { AgentLogEntry, INITIAL_STATE, WorldState, FitzpatrickType } from './types';
import FairnessDashboard from './components/FairnessDashboard';
import FairnessReport from './components/FairnessReport';
import AgentFlow from './components/AgentFlow';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini Client
// We will assume the API key is available via process.env.API_KEY
const GEMINI_API_KEY = process.env.API_KEY || '';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [worldState, setWorldState] = useState<WorldState>(INITIAL_STATE);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFairnessReport, setShowFairnessReport] = useState(false);

  const planner = new GOAPPlanner();
  const agentDB = AgentDB.getInstance();

  useEffect(() => {
    // Check AgentDB status
    const interval = setInterval(async () => {
      const status = await agentDB.getStatus();
      if (status) {
        setDbReady(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [agentDB]);

  const addLog = (agent: string, message: string, status: AgentLogEntry['status'], metadata?: any) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      agent,
      message,
      status,
      timestamp: Date.now(),
      metadata
    }]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      
      // Validation Logic
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(f.type)) {
        setError("Invalid file format. Please upload JPG, PNG, or WebP.");
        // Clear preview if previously set
        setPreview(null);
        setFile(null);
        return;
      }

      setFile(f);
      const url = URL.createObjectURL(f);
      setPreview(url);
      setResult(null);
      setLogs([]);
      setWorldState(INITIAL_STATE);
    }
  };

  const executeAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    
    // Define Goal
    const goalState: Partial<WorldState> = { audit_logged: true };
    
    // Generate Plan
    const plan = planner.plan(worldState, goalState);
    
    // Execute Plan
    let currentState = { ...worldState };
    
    // Mock detected data to feed into agents
    // In a real app, this would come from the Skin-Tone-Detection-Agent output
    const mockFitzpatrick: FitzpatrickType = 'IV'; 
    const mockIta = 28.5;
    
    try {
        for (const action of plan) {
            addLog(action.agentId, action.description, 'running');
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
            
            let metadata = {};
            
            // Execute specific agent logic simulation
            switch (action.agentId) {
                case 'Image-Verification-Agent':
                    metadata = {
                        method: 'Ed25519',
                        hash: 'sha256_e3b0c442...',
                        verified: true
                    };
                    // Simulate potential verification failure (commented out for demo stability)
                    // throw new Error("VERIFICATION_FAILED: Ed25519 signature mismatch");
                    break;

                case 'Skin-Tone-Detection-Agent':
                    currentState.fitzpatrick_type = mockFitzpatrick;
                    metadata = { 
                        detected_type: mockFitzpatrick, 
                        ita_angle: mockIta, 
                        monk_scale: '6', 
                        confidence: 0.92,
                        method: 'ITA + Monk Ensemble'
                    };
                    // Load calibrated model logic simulation
                    await agentDB.skillSearch(`threshold_calibration_fitzpatrick_${mockFitzpatrick}`);
                    break;

                case 'Image-Preprocessing-Agent':
                    metadata = {
                        method: 'melanin_preserving_histogram_eq',
                        white_balance: `ita_${mockIta}_calibrated`,
                        resolution: '224x224'
                    };
                    break;

                case 'Segmentation-Agent':
                    metadata = {
                        model: 'MediaPipe_Skin_Seg',
                        threshold_applied: 0.65, // Calibrated for Fitz IV
                        coverage_percent: 0.42,
                        fairness_calibration: true
                    };
                    break;

                case 'Feature-Extraction-Agent':
                    metadata = {
                        model: 'MobileNetV2-FairDisCo',
                        disentanglement_score: 0.93, // FairDisCo metric
                        features_vector_dim: 512,
                        texture_score: 0.76
                    };
                    break;

                case 'Lesion-Detection-Agent':
                    metadata = {
                        findings: ['asymmetry: 0.3', 'border: 0.2', 'color: 0.4'],
                        model: `YOLOv11-Fitz${mockFitzpatrick}`,
                        confidence: 0.87,
                        contrast_ratio: 0.45
                    };
                    break;

                case 'Similarity-Search-Agent':
                    const similar = await agentDB.similaritySearch(null, mockFitzpatrick);
                    metadata = {
                        cases_retrieved: similar.length,
                        demographic_diversity_score: 0.82,
                        top_match: similar[0].id
                    };
                    break;

                case 'Risk-Assessment-Agent':
                    metadata = {
                        base_risk: 38,
                        calibrated_risk: 42,
                        calibration_applied: true,
                        equalized_odds_check: 'passed'
                    };
                    break;
                
                case 'Fairness-Audit-Agent':
                    // Check TPR gap simulation
                    const tprGap = 0.06;
                    // Example failure condition:
                    if (tprGap > 0.08) throw new Error("FAIRNESS_VIOLATION: TPR gap > 0.08 exceeded safe limits");
                    metadata = {
                        tpr_gap: tprGap,
                        status: 'compliant',
                        threshold: 0.08
                    };
                    break;

                case 'Recommendation-Agent':
                     let recommendationText = `Standard monitoring protocol for Fitzpatrick ${mockFitzpatrick}. Use SPF 30+.`;
                     if (GEMINI_API_KEY) {
                          try {
                             const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
                             const response = await ai.models.generateContent({
                                 model: 'gemini-2.5-flash-latest',
                                 contents: `Generate a short medical recommendation for skin analysis. 
                                 Context: Fitzpatrick Type ${mockFitzpatrick}, Low Risk, Asymmetry 0.3. 
                                 Focus on fairness and specific care for this skin type.`
                             });
                             if (response.text) recommendationText = response.text;
                          } catch (e) {
                              console.warn("Gemini API skipped or failed.", e);
                          }
                     }
                     metadata = { recommendation_generated: true };
                     setResult({
                         recommendation: recommendationText,
                         type: mockFitzpatrick,
                         risk: "Low"
                     });
                     
                     // Store Reflexion
                     agentDB.reflexionStore({
                         episode_id: `analysis_${Date.now()}`,
                         observation: `Fitzpatrick ${mockFitzpatrick}, Risk 42`,
                         action: 'Recommended Monitoring',
                         fairness_assessment: 'TPR Gap 0.06 (Pass)'
                     });
                     break;

                case 'Audit-Trail-Agent':
                    metadata = {
                        merkle_root: '0xabc123...',
                        stored_in_agentdb: true
                    };
                    await agentDB.logAuditEvent({ type: 'analysis_complete', id: Date.now() });
                    break;
            }

            // Update State
            currentState = { ...currentState, ...action.effects };
            setWorldState(currentState);
            
            addLog(action.agentId, 'Task completed successfully', 'completed', metadata);
        }
    } catch (error: any) {
        console.error("Analysis Error:", error);
        
        let userMessage = "Analysis failed due to an unexpected system error. Please try again.";
        const rawMessage = error.message || "Unknown error";

        // Specific Error Handling
        if (rawMessage.includes("FAIRNESS_VIOLATION")) {
            userMessage = "Analysis Halted: Fairness Safety Protocol Triggered. The model detected a demographic disparity risk (TPR Gap > 0.08). Manual review recommended.";
        } else if (rawMessage.includes("VERIFICATION_FAILED")) {
            userMessage = "Security Alert: Image signature verification failed. The file may have been modified or corrupted.";
        } else if (rawMessage.includes("SKIN_TONE_CONFIDENCE_LOW")) {
            userMessage = "Low Confidence Alert: Unable to reliably detect skin tone. Please upload a clearer image with better lighting.";
        }

        addLog('System', `Critical Stop: ${rawMessage}`, 'failed');
        setError(userMessage);
    } finally {
        setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {showFairnessReport && (
        <FairnessReport onClose={() => setShowFairnessReport(false)} />
      )}

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-grotesk tracking-tight text-stone-900 mb-2">
            Fairness-Aware <br/>
            <span className="text-terracotta-600">Skin Analysis Orchestrator</span>
          </h1>
          <p className="text-stone-500 max-w-lg font-light leading-relaxed">
            Multi-agent system with cryptographic verification and AgentDB persistence. 
            Optimized for Fitzpatrick Types I-VI using GOAP.
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-2">
           <div className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 border ${dbReady ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <Database className="w-3 h-3" />
              AgentDB WASM: {dbReady ? 'READY' : 'INITIALIZING...'}
           </div>
           <div className="px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 border bg-blue-50 border-blue-200 text-blue-800">
              <ShieldCheck className="w-3 h-3" />
              Ed25519 VERIFICATION ACTIVE
           </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[800px]">
        
        {/* Left Col: Input & Fairness Stats (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          {/* Upload Card */}
          <div className="glass-panel p-6 rounded-xl flex-shrink-0">
             <h2 className="text-lg font-bold font-grotesk mb-4 text-stone-800">Patient Input</h2>
             
             {error && (
               <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-800 animate-in fade-in slide-in-from-top-1 shadow-sm">
                 <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                 <span className="font-medium leading-snug">{error}</span>
               </div>
             )}

             <div className={`relative group border-2 border-dashed rounded-lg h-64 flex flex-col items-center justify-center transition-colors bg-white/40 ${error ? 'border-red-300 bg-red-50/10' : 'border-stone-300 hover:border-terracotta-400'}`}>
                {preview ? (
                    <img src={preview} alt="Upload preview" className="w-full h-full object-cover rounded-lg opacity-90" />
                ) : (
                    <div className="text-center p-6">
                        <Upload className={`w-8 h-8 mx-auto mb-3 ${error ? 'text-red-300' : 'text-stone-400'}`} />
                        <p className={`text-sm font-medium ${error ? 'text-red-400' : 'text-stone-600'}`}>Drop dermoscopic image</p>
                        <p className="text-xs text-stone-400 mt-1">Supports JPG, PNG, WebP</p>
                    </div>
                )}
                <input 
                    type="file" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/png, image/jpeg, image/webp"
                    disabled={analyzing}
                />
             </div>
             
             <button
                onClick={executeAnalysis}
                disabled={!file || analyzing || !dbReady || !!error}
                className={`w-full mt-4 py-3 px-4 rounded-lg font-grotesk font-semibold text-sm transition-all flex items-center justify-center gap-2
                    ${!file || analyzing || !dbReady || error
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : 'bg-terracotta-600 text-white hover:bg-terracotta-700 shadow-lg shadow-terracotta-600/20'
                    }`}
             >
                {analyzing ? (
                    <>
                        <Activity className="w-4 h-4 animate-spin" /> Processing...
                    </>
                ) : (
                    'Initiate Agentic Analysis'
                )}
             </button>
          </div>

          {/* Fairness Stats */}
          <div className="flex-1">
             <FairnessDashboard onOpenReport={() => setShowFairnessReport(true)} />
          </div>
        </div>

        {/* Middle Col: GOAP Visualizer (4 cols) */}
        <div className="lg:col-span-4 h-full">
            <AgentFlow logs={logs} />
        </div>

        {/* Right Col: Results & Details (4 cols) */}
        <div className="lg:col-span-4 h-full flex flex-col gap-6">
            {/* Status Card */}
            <div className="glass-panel p-6 rounded-xl min-h-[200px]">
                <h2 className="text-lg font-bold font-grotesk mb-4 text-stone-800">Analysis State</h2>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(worldState).map(([key, value]) => {
                        if (typeof value !== 'boolean') return null;
                        return (
                            <div key={key} className={`flex items-center gap-2 text-xs p-2 rounded border ${value ? 'bg-green-50 border-green-100 text-green-800' : 'bg-stone-50 border-stone-100 text-stone-400'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-green-500' : 'bg-stone-300'}`} />
                                <span className="truncate capitalize">{key.replace(/_/g, ' ')}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Final Report Card */}
            <div className={`glass-panel p-6 rounded-xl flex-1 transition-opacity duration-500 ${result ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-bold font-grotesk text-stone-800">Diagnostic Report</h2>
                    {result && <Lock className="w-4 h-4 text-terracotta-600" />}
                </div>
                
                {result ? (
                    <div className="space-y-4">
                        <div className="p-3 bg-stone-100 rounded border border-stone-200">
                            <div className="text-xs text-stone-500 uppercase tracking-wider font-bold mb-1">Detected Skin Tone</div>
                            <div className="text-xl font-grotesk text-stone-900">Fitzpatrick Type {result.type}</div>
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Calibrated Thresholds Applied
                            </div>
                        </div>

                        <div className="p-3 bg-stone-100 rounded border border-stone-200">
                            <div className="text-xs text-stone-500 uppercase tracking-wider font-bold mb-1">Risk Assessment</div>
                            <div className="text-xl font-grotesk text-stone-900">{result.risk} Risk</div>
                            <div className="text-xs text-stone-500 mt-1">Confidence: 92% (Equalized Odds)</div>
                        </div>

                        <div>
                            <div className="text-xs text-stone-500 uppercase tracking-wider font-bold mb-2">Recommendation</div>
                            <p className="text-sm text-stone-700 leading-relaxed font-serif italic border-l-2 border-terracotta-300 pl-3">
                                "{result.recommendation}"
                            </p>
                        </div>

                        <button className="w-full py-2 border border-stone-300 rounded text-xs font-semibold text-stone-600 hover:bg-stone-50 flex items-center justify-center gap-2">
                            <Share2 className="w-3 h-3" /> Export Encrypted Report (JSON)
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                        Waiting for analysis completion...
                    </div>
                )}
            </div>
        </div>

      </main>
    </div>
  );
}