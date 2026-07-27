export type ModelTask =
  | 'intent'
  | 'campaign-plan'
  | 'post-generation'
  | 'rewrite'
  | 'validation'
  | 'deduplication';

export type ModelRequest = {
  task: ModelTask;
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type ModelResponse = {
  text: string;
  provider: 'ollama' | 'openai';
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
};

export interface ModelProvider {
  readonly name: 'ollama' | 'openai';
  isHealthy(): Promise<boolean>;
  generate(request: ModelRequest): Promise<ModelResponse>;
}
