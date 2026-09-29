import { NextRequest, NextResponse } from "next/server";
import { fetchModelCatalog, type ApiProtocol } from "@/app/lib/model-catalog";

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }
  const {
    api_base: base,
    api_key: key = "",
    api_protocol: protocol = "openai",
  } = body || {};
  if (
    typeof base !== "string" ||
    typeof key !== "string" ||
    !["openai", "anthropic", "gemini", "ollama"].includes(protocol)
  ) {
    return NextResponse.json(
      { detail: "Provide an API base URL and a supported API protocol." },
      { status: 400 },
    );
  }
  try {
    const entries = await fetchModelCatalog(
      base,
      key,
      protocol as ApiProtocol,
      request.signal,
    );
    return NextResponse.json(
      {
        models: entries.map((entry) => entry.value),
        entries,
        fetched_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const detail =
      error instanceof Error && error.name !== "TypeError"
        ? error.message
        : "Cannot reach the model catalog. Check the API URL, or enter a model ID manually.";
    return NextResponse.json(
      { detail },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
