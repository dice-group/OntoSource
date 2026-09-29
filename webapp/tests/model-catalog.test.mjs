import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";
const { fetchModelCatalog } = loadTypeScript(new URL("../src/app/lib/model-catalog.ts", import.meta.url));

test("OpenAI compatible catalogs retain unfamiliar IDs and deduplicate", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.href, "https://provider.example/v1/models");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(options.redirect, "error");
    return Response.json({ data: [{ id: "future-model" }, { id: "future-model" }, { id: "vision-chat" }, { id: "vector", type: "embedding" }] });
  });
  assert.deepEqual((await fetchModelCatalog("https://provider.example/v1", "test-key", "openai")).map((item) => item.value), ["future-model", "vision-chat"]);
});
test("Anthropic sends native authentication and follows cursors", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.headers["x-api-key"], "test-key");
    assert.equal(options.headers["anthropic-version"], "2023-06-01");
    assert.equal(options.headers.Authorization, undefined);
    calls++;
    if (calls === 1) return Response.json({ data: [{ id: "a", display_name: "Model A" }], has_more: true, last_id: "a" });
    assert.equal(url.searchParams.get("after_id"), "a");
    return Response.json({ data: [{ id: "b" }], has_more: false });
  });
  assert.equal((await fetchModelCatalog("https://provider.example", "test-key", "anthropic")).length, 2);
});
test("Gemini filters by capability metadata and follows page tokens", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.headers["x-goog-api-key"], "test-key");
    assert.equal(url.searchParams.has("key"), false);
    return Response.json({ models: [{ name: "models/new-generation", supportedGenerationMethods: ["generateContent"] }, { name: "models/embedding", supportedGenerationMethods: ["embedContent"] }] });
  });
  assert.deepEqual(await fetchModelCatalog("https://provider.example/v1beta", "test-key", "gemini"), [{ value: "new-generation", label: "new-generation" }]);
});
test("Ollama supports keyless local discovery", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.href, "http://localhost:11434/api/tags");
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({ models: [{ name: "local:latest" }] });
  });
  assert.equal((await fetchModelCatalog("http://localhost:11434/v1", "", "ollama"))[0].value, "local:latest");
});
test("authentication errors stay visible instead of looking like empty catalogs", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  await assert.rejects(fetchModelCatalog("https://provider.example/v1", "bad", "openai"), /credentials/);
});
test("invalid URLs are rejected before sending credentials", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not fetch"); });
  await assert.rejects(fetchModelCatalog("file:///tmp/models", "key", "openai"), /HTTP/);
  assert.equal(mock.mock.callCount(), 0);
});

test("Gemini retrieves all pages and normalizes model names", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    calls++;
    if (calls === 1) return Response.json({ models: [{ name: "models/a" }], nextPageToken: "next" });
    assert.equal(url.searchParams.get("pageToken"), "next");
    return Response.json({ models: [{ name: "models/b" }] });
  });
  assert.deepEqual((await fetchModelCatalog("https://provider.example/v1beta", "key", "gemini")).map((item) => item.value), ["a", "b"]);
});
test("empty and flat catalogs do not fall back to static model names", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  assert.deepEqual(await fetchModelCatalog("https://provider.example/v1", "", "openai"), []);
});
test("repeated pagination cursors fail instead of looping forever", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ data: [{ id: "a" }], has_more: true, last_id: "a" }));
  await assert.rejects(fetchModelCatalog("https://provider.example/v1", "key", "openai"), /repeated catalog page/);
});

test("zero token pricing requires explicit provider metadata", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ data: [
    { id: "free-name-only" }, { id: "zero-tokens", pricing: { prompt: "0", completion: "0" } },
    { id: "paid", pricing: { prompt: "0", completion: "0.001" } },
    { id: "request-fee", pricing: { prompt: "0", completion: "0", request: "0.01" } },
    { id: "empty", pricing: { prompt: "", completion: "" } },
    { id: "image", architecture: { output_modalities: ["image"] } },
  ] }));
  const models = await fetchModelCatalog("https://provider.example/v1", "", "openai");
  assert.deepEqual(models.filter((model) => model.freeTextTokens).map((model) => model.value), ["zero-tokens"]);
  assert.equal(models.some((model) => model.value === "image"), false);
});

test("plain text, HTML, and empty catalogs report actionable errors", async (t) => {
  for (const body of ["OK ", "<html>Gateway status</html>", "", '{"data":']) {
    t.mock.method(globalThis, "fetch", async () => new Response(body));
    await assert.rejects(
      fetchModelCatalog("https://provider.example/v1", "", "openai"),
      (error) => !(error instanceof SyntaxError) && /non-JSON.*API base URL.*model ID manually/.test(error.message),
    );
  }
});

test("JSON primitives are rejected as unsupported catalogs", async (t) => {
  for (const body of [null, "OK", true, 1]) {
    t.mock.method(globalThis, "fetch", async () => Response.json(body));
    await assert.rejects(fetchModelCatalog("https://provider.example/v1", "", "openai"), /supported model catalog/);
  }
});

test("authentication errors take priority over non-JSON error bodies", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("Unauthorized", { status: 401 }));
  await assert.rejects(fetchModelCatalog("https://provider.example/v1", "", "openai"), /credentials/);
});
