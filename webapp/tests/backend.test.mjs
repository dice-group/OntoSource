import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { loadTypeScript } from "./load-typescript.mjs";
const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const { backendRoute } = loadTypeScript(new URL("../src/app/lib/backend.ts", import.meta.url));

const context = { params: Promise.resolve({ id: "test" }) };

test("proxy forwards method, query, multipart body and content type", async (t) => {
  const form = new FormData();
  form.set("embedding_file", new Blob(["model"]), "model.zip");
  const request = new NextRequest("http://localhost/api/neural-reasoning/upload-embedding?ontology_id=abc", { method: "POST", body: form });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(new URL(url).pathname, "/neural-reasoning/upload-embedding");
    assert.equal(new URL(url).searchParams.get("ontology_id"), "abc");
    assert.equal(options.method, "POST");
    assert.equal(options.cache, "no-store");
    const forwarded = new Request(url, options);
    assert.equal((await forwarded.formData()).get("embedding_file").name, "model.zip");
    return Response.json({ neural_ontology_id: "new" }, { status: 201 });
  });
  const response = await backendRoute("/neural-reasoning/upload-embedding")(request, context);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { neural_ontology_id: "new" });
});

test("proxy preserves validation status and presents readable errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ detail: [{ msg: "Field required" }] }, { status: 422 }));
  const response = await backendRoute((params) => `/ontology/${params.id}`)(new NextRequest("http://localhost/api/ontology/test"), context);
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "Field required", detail: "Field required" });
});

test("proxy reports unavailable backend as a gateway error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const response = await backendRoute("/ontology")(new NextRequest("http://localhost/api/ontology"), context);
  assert.equal(response.status, 502);
});

test("proxy preserves empty successful responses", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  const response = await backendRoute("/ontology/test")(new NextRequest("http://localhost/api/ontology/test", { method: "DELETE" }), context);
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
});
