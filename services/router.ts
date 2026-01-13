export type AnalysisIntent = 'VISION_ANALYSIS' | 'REPORT_GENERATION' | 'CONVERSATIONAL_QUERY';

export class RouterAgent {
    private static instance: RouterAgent;

    private constructor() {
        // Private constructor for singleton pattern
    }

    public static getInstance(): RouterAgent {
        if (RouterAgent.instance === undefined) {
            RouterAgent.instance = new RouterAgent();
        }
        return RouterAgent.instance;
    }

    /**
     * Light-weight decision engine (Client-side)
     * Determines the optimal specialist based on input context.
     */
    public route(context: { file?: File, text?: string, action?: string }): AnalysisIntent {
        // High priority: Image analysis
        if (context.file && (context.file.type.startsWith('image/') || context.action === 'Verify Image')) {
            return 'VISION_ANALYSIS';
        }

        // Secondary priority: Report synthesis
        if (context.action === 'Generate Recommendations' || context.action === 'Assess Risk') {
            return 'REPORT_GENERATION';
        }

        return 'CONVERSATIONAL_QUERY';
    }

    public getRequiredSpecialist(intent: AnalysisIntent): string {
        switch(intent) {
            case 'VISION_ANALYSIS': return 'Vision-Specialist-MobileNetV3';
            case 'REPORT_GENERATION': return 'Orchestrator-SmolLM2';
            default: return 'Router-General';
        }
    }
}