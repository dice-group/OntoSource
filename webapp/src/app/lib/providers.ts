import type { ApiProtocol } from "./model-catalog";

export type Connection = {
  apiBase: string;
  apiKey: string;
  modelName: string;
  protocol: ApiProtocol;
};
export type Provider = {
  id: string;
  name: string;
  base: string;
  protocol: ApiProtocol;
  offer?: string;
  details?: string;
};
export const PROVIDERS: Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    base: "https://api.openai.com/v1",
    protocol: "openai",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    base: "https://api.anthropic.com/v1",
    protocol: "anthropic",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    base: "https://generativelanguage.googleapis.com/v1beta",
    protocol: "gemini",
    offer: "Free tier for eligible models",
    details: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    base: "https://openrouter.ai/api/v1",
    protocol: "openai",
    offer: "Free models available",
    details: "https://openrouter.ai/pricing",
  },
  {
    id: "groq",
    name: "Groq",
    base: "https://api.groq.com/openai/v1",
    protocol: "openai",
    offer: "Free plan with rate limits",
    details: "https://console.groq.com/docs/rate-limits",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    base: "https://router.huggingface.co/v1",
    protocol: "openai",
    offer: "Monthly inference credits",
    details: "https://huggingface.co/docs/inference-providers/pricing",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    base: "https://api.mistral.ai/v1",
    protocol: "openai",
    details: "https://docs.mistral.ai/",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    base: "https://api.cerebras.ai/v1",
    protocol: "openai",
    details: "https://inference-docs.cerebras.ai/quickstart",
  },
  {
    id: "together",
    name: "Together AI",
    base: "https://api.together.xyz/v1",
    protocol: "openai",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    base: "https://api.fireworks.ai/inference/v1",
    protocol: "openai",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    base: "https://api.deepseek.com/v1",
    protocol: "openai",
  },
  {
    id: "ollama",
    name: "Ollama · local",
    base: "http://localhost:11434",
    protocol: "ollama",
    offer: "Runs on your hardware",
  },
  {
    id: "lmstudio",
    name: "LM Studio · local",
    base: "http://localhost:1234/v1",
    protocol: "openai",
    offer: "Runs on your hardware",
  },
];
