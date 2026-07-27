import OpenAI from 'openai';
import type { ModelProvider, ModelRequest, ModelResponse } from './types';

export class OpenAIProvider implements ModelProvider {
  readonly name = 'openai' as const;
  private readonly client: OpenAI;

  constructor(
    apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_FALLBACK_MODEL ?? 'gpt-4.1-mini'
  ) {
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    this.client = new OpenAI({ apiKey });
  }

  async isHealthy(): Promise<boolean> {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const started = Date.now();
    const response = await this.client.responses.create({
      model: this.model,
      instructions: request.system,
      input: request.prompt,
      temperature: request.temperature ?? 0.7,
      max_output_tokens: request.maxOutputTokens ?? 900
    });

    const text = response.output_text.trim();
    if (!text) throw new Error('OpenAI returned an empty response');

    return {
      text,
      provider: 'openai',
      model: this.model,
      latencyMs: Date.now() - started,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens
    };
  }
}
