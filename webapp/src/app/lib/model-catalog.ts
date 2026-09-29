export type ApiProtocol = "openai" | "anthropic" | "gemini" | "ollama";
export type CatalogModel = {
  value: string;
  label: string;
  freeTextTokens?: boolean;
};
type Entry = {
  id?: string;
  name?: string;
  model?: string;
  display_name?: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
  type?: string;
  pricing?: { prompt?: string | number; completion?: string | number; request?: string };
  architecture?: { output_modalities?: string[] };
  capabilities?: { completion_chat?: boolean };
};
type CatalogPage = {
  data?: Entry[];
  models?: Entry[];
  has_more?: boolean;
  last_id?: string;
  nextPageToken?: string;
};

function isZeroPrice(value: unknown) {
  return (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) && Number(value) === 0;
}

export async function fetchModelCatalog(
  base: string,
  key: string,
  protocol: ApiProtocol,
  signal?: AbortSignal,
) {
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Enter an HTTP API base URL without credentials, query parameters, or fragments.",
    );
  const normalized = base.replace(/\/+$/, "");
  let endpoint = `${normalized}/models`;
  if (protocol === "ollama")
    endpoint = `${normalized.replace(/\/(api|v1)$/, "")}/api/tags`;
  if (protocol === "anthropic" && !url.pathname.endsWith("/v1"))
    endpoint = `${normalized}/v1/models`;
  if (protocol === "gemini" && !/\/v1(beta)?$/.test(url.pathname))
    endpoint = `${normalized}/v1beta/models`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (protocol === "anthropic") {
    headers["anthropic-version"] = "2023-06-01";
    if (key) headers["x-api-key"] = key;
  } else if (protocol === "gemini") {
    if (key) headers["x-goog-api-key"] = key;
  } else if (key) headers.Authorization = `Bearer ${key}`;
  const models = new Map<string, CatalogModel>();
  let next = new URL(endpoint);
  const visited = new Set<string>();
  const timeout = AbortSignal.timeout(15000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  for (let page = 0; page < 50; page++) {
    if (visited.has(next.href))
      throw new Error(
        "The provider returned a repeated catalog page. Enter a model ID manually.",
      );
    visited.add(next.href);
    const response = await fetch(next, {
      headers,
      cache: "no-store",
      redirect: "error",
      signal: requestSignal,
    });
    if (!response.ok)
      throw new Error(
        response.status === 401 || response.status === 403
          ? "The provider rejected these credentials. Check the API key and permissions."
          : `Model catalog returned HTTP ${response.status}. You can enter a model ID manually.`,
      );
    const payload = await response.text();
    let body: CatalogPage | Entry[];
    try {
      body = JSON.parse(payload);
    } catch {
      throw new Error(
        "The model catalog returned a non-JSON response. Check the API base URL and protocol; a health endpoint or gateway may be responding instead. You can enter a model ID manually.",
      );
    }
    if (!body || typeof body !== "object")
      throw new Error(
        "This provider does not expose a supported model catalog. Enter a model ID manually.",
      );
    const entries = Array.isArray(body) ? body : body.data || body.models;
    if (!Array.isArray(entries))
      throw new Error(
        "This provider does not expose a supported model catalog. Enter a model ID manually.",
      );
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      if (
        entry.supportedGenerationMethods &&
        !entry.supportedGenerationMethods.includes("generateContent")
      )
        continue;
      if (
        ["embedding", "image", "audio", "moderation"].includes(entry.type || "")
      )
        continue;
      if (entry.capabilities?.completion_chat === false) continue;
      if (
        entry.architecture?.output_modalities &&
        !entry.architecture.output_modalities.includes("text")
      )
        continue;
      const raw = entry.id || entry.model || entry.name;
      if (typeof raw !== "string" || !raw) continue;
      const value = protocol === "gemini" ? raw.replace(/^models\//, "") : raw;
      models.set(value, {
        value,
        ...(isZeroPrice(entry.pricing?.prompt) && isZeroPrice(entry.pricing?.completion) && (entry.pricing?.request === undefined || isZeroPrice(entry.pricing.request)) ? { freeTextTokens: true } : {}),
        label: entry.display_name || entry.displayName || value,
      });
    }
    if (Array.isArray(body) || (!body.has_more && !body.nextPageToken))
      return [...models.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      );
    next = new URL(endpoint);
    if (body.nextPageToken)
      next.searchParams.set("pageToken", body.nextPageToken);
    else if (body.last_id) next.searchParams.set("after_id", body.last_id);
    else
      throw new Error(
        "The provider omitted its next-page cursor. Enter a model ID manually.",
      );
  }
  throw new Error(
    "The model catalog exceeded 50 pages. Enter a model ID manually.",
  );
}
