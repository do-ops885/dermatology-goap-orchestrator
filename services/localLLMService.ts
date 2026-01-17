import { Logger } from './logger';

import type {
  InitProgressReport,
  MLCEngineInterface,
  ChatCompletionMessageParam,
} from '@mlc-ai/web-llm';

export class LocalLLMService {
  public isReady = false;
  private engine: MLCEngineInterface | null = null;
  private initializationPromise: Promise<void> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private modelId = 'SmolLM2-1.7B-Instruct-q4f16_1-MLC';

  async initialize(
    progressCallback?: (_report: { text: string; progress: number }) => void,
  ): Promise<void> {
    if (this.isReady) {
      this.resetIdleTimer();
      return;
    }
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        Logger.info('LocalLLMService', 'Initializing WebLLM Engine...');

        const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

        this.engine = await CreateMLCEngine(this.modelId, {
          initProgressCallback: (_report: InitProgressReport) => {
            if (progressCallback) {
              progressCallback({
                text: _report.text,
                progress: _report.progress,
              });
            }
          },
          logLevel: 'WARN',
        });
        this.isReady = true;
        this.resetIdleTimer();
        Logger.info('LocalLLMService', 'WebLLM Engine Ready');
      } catch (error) {
        Logger.error('LocalLLMService', 'WebLLM Init Failed', { error });
        this.isReady = false;
        this.engine = null;
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async generate(prompt: string, systemPrompt = ''): Promise<string> {
    this.resetIdleTimer();
    if (!this.engine || !this.isReady) {
      Logger.warn('LocalLLMService', 'Generate requested but engine not ready');
      return '';
    }

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      const reply = await this.engine.chat.completions.create({
        messages: messages as unknown as ChatCompletionMessageParam[],
        temperature: 0.1,
        max_tokens: 256,
      });

      return reply.choices[0]?.message?.content ?? '';
    } catch (e) {
      Logger.error('LocalLLMService', 'Generation Failed', { error: e });
      return '';
    }
  }

  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(
      () => {
        void this.unload();
      },
      5 * 60 * 1000,
    );
  }

  async unload() {
    if (this.engine) {
      Logger.info('LocalLLMService', 'Unloading engine to free memory');
      await this.engine.unload();
      this.engine = null;
      this.isReady = false;
      this.initializationPromise = null;
    }
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }
}
