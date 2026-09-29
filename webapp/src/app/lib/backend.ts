import { NextRequest, NextResponse } from "next/server";

type RouteParams = Record<string, string>;
type BackendPath = string | ((params: RouteParams) => string);

function errorMessage(body: string): string {
  try {
    const data = JSON.parse(body);
    const detail = data.detail ?? data.error;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg ?? "Invalid request").join("; ");
    }
  } catch {}
  return body || "Backend request failed";
}

export function backendRoute(path: BackendPath) {
  return async (request: NextRequest, context: { params: Promise<RouteParams> }) => {
    const params = typeof path === "function" ? await context.params : {};
    const pathname = typeof path === "function" ? path(params) : path;
    const base = (process.env.FASTAPI_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
    const url = `${base}${pathname}${request.nextUrl.search}`;
    try {
      const hasBody = request.method !== "GET" && request.method !== "HEAD";
      const headers = new Headers();
      const contentType = request.headers.get("content-type");
      if (contentType) headers.set("content-type", contentType);
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: hasBody ? await request.arrayBuffer() : undefined,
        signal: request.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        const message = errorMessage(await response.text());
        return NextResponse.json({ error: message, detail: message }, { status: response.status });
      }
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "content-type": response.headers.get("content-type") || "application/json",
          ...(response.headers.has("content-disposition") ? { "content-disposition": response.headers.get("content-disposition")! } : {}),
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Cannot reach the ontology service", detail: "Cannot reach the ontology service" },
        { status: 502 },
      );
    }
  };
}
