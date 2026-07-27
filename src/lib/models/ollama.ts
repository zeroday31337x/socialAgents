import type { ModelProvider, ModelRequest, ModelResponse } from './types';

export class OllamaProvider implements ModelProvider {
  readonly name = 'ollama' as const;

  constructor(
    private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    private readonly model = process.env.OLLAMA_MODEL ?? 'qwen3:8b'
  ) {}

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2_500)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const started = Date.now();
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt }
        ],
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxOutputTokens ?? 900
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const text = data.message?.content?.trim();
    if (!text) throw new Error('Ollama returned an empty response');

    return {
      text,
      provider: 'ollama',
      model: this.model,
      latencyMs: Date.now() - started,
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count
    };
  }
}
