import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy endpoint to fetch available models from an OpenAI-compatible API.
 * This avoids CORS issues when querying provider APIs from the browser.
 *
 * Query params:
 *   api_base  – The provider's base URL  (required)
 *   api_key   – Bearer token for auth     (required)
 */

// -------------------------------------------------------------------------
// Model ID substrings that indicate a NON-chat model (case-insensitive).
// These cover image generation, embeddings, speech, moderation, etc.
// -------------------------------------------------------------------------
const NON_CHAT_PATTERNS = [
  // Image generation
  "dall-e", "dalle", "image", "stable-diffusion", "sdxl", "midjourney",
  "flux", "playground-v", "sora",
  // Embeddings
  "embed", "text-embedding", "text-search", "text-similarity",
  // Audio / speech
  "whisper", "tts", "audio", "speech",
  // Moderation / safety
  "moderation", "content-filter", "shield", "guard",
  // Code-specific legacy models (not chat-capable)
  "code-davinci", "code-cushman",
  // Legacy completion-only models
  "davinci", "curie", "babbage", "ada",
  // Realtime / tool-use internal models
  "realtime",
  // Search indexes
  "text-search",
];

// Model object types from the OpenAI API that are NOT chat/completion models
const NON_CHAT_OBJECT_TYPES = new Set([
  "embedding", "image", "audio", "moderation",
]);

interface ModelEntry {
  id: string;
  object?: string;
  type?: string;
  purpose?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Returns true if the model looks like a chat / text-generation model.
 * Checks both structured metadata (object, type) and the model ID string.
 */
function isChatModel(m: ModelEntry): boolean {
  // 1. If the provider tells us the type, trust it
  const objType = (m.object || m.type || m.purpose || "").toLowerCase();
  if (NON_CHAT_OBJECT_TYPES.has(objType)) return false;

  // 2. Pattern-match on the model ID
  const id = m.id.toLowerCase();
  for (const pattern of NON_CHAT_PATTERNS) {
    if (id.includes(pattern)) return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiBase = searchParams.get("api_base");
  const apiKey = searchParams.get("api_key");

  if (!apiBase || !apiKey) {
    return NextResponse.json(
      { detail: "api_base and api_key are required" },
      { status: 400 },
    );
  }

  // Normalise: strip trailing slashes
  const base = apiBase.replace(/\/+$/, "");

  // Try the two common model-listing paths
  const candidates = [
    `${base}/models`,
    `${base}/v1/models`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const body = await res.json();

      // OpenAI-compatible response: { data: [ { id: "gpt-4o", ... }, ... ] }
      if (body.data && Array.isArray(body.data)) {
        const models = (body.data as ModelEntry[])
          .filter(isChatModel)
          .map((m) => m.id)
          .sort((a, b) => a.localeCompare(b));

        return NextResponse.json({ models });
      }

      // Some providers return a flat array
      if (Array.isArray(body)) {
        const models = (body as ModelEntry[])
          .filter((m) => (m.id || m.name) && isChatModel({ id: m.id || m.name || "", ...m }))
          .map((m) => m.id || m.name || "")
          .sort((a, b) => a.localeCompare(b));

        return NextResponse.json({ models });
      }
    } catch {
      // Timeout or network error — try next candidate
      continue;
    }
  }

  // None of the endpoints worked
  return NextResponse.json({ models: [] });
}
