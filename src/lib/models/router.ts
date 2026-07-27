import { OllamaProvider } from './ollama';
import { OpenAIProvider } from './openai';
import type { ModelRequest, ModelResponse } from './types';

type RouterHealth = {
  localQueueDepth: number;
  localAverageLatencyMs: number;
  localCpuPercent?: number;
};

export class ModelRouter {
  private readonly ollama = new OllamaProvider();
  private readonly openai = process.env.OPENAI_API_KEY
    ? new OpenAIProvider()
    : null;

  async generate(
    request: ModelRequest,
    health: RouterHealth = { localQueueDepth: 0, localAverageLatencyMs: 0 }
  ): Promise<ModelResponse> {
    const localEnabled = process.env.MODEL_LOCAL_ENABLED !== 'false';
    const maxQueue = Number(process.env.MODEL_LOCAL_MAX_QUEUE ?? 4);
    const maxLatency = Number(process.env.MODEL_LOCAL_MAX_LATENCY_MS ?? 12_000);
    const maxCpu = Number(process.env.MODEL_LOCAL_MAX_CPU_PERCENT ?? 70);

    const localEligible =
      localEnabled &&
      health.localQueueDepth < maxQueue &&
      health.localAverageLatencyMs < maxLatency &&
      (health.localCpuPercent === undefined || health.localCpuPercent < maxCpu) &&
      (await this.ollama.isHealthy());

    if (localEligible) {
      try {
        return await this.ollama.generate(request);
      } catch (error) {
        if (!this.openai) throw error;
      }
    }

    if (!this.openai) {
      throw new Error('No healthy model provider is available');
    }

    return this.openai.generate(request);
  }
}
