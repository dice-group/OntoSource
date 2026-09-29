import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { loadTypeScript } from "./load-typescript.mjs";
const { invalidateOntologyQueries } = loadTypeScript(new URL("../src/app/lib/ontology-cache.ts", import.meta.url));
const { shortenUri } = loadTypeScript(new URL("../src/app/utils/graph-utils.ts", import.meta.url));

test("editing an ontology invalidates only its data and the shared summary", async () => {
  const client = new QueryClient();
  const keys = [["ontology-summary-all"], ["graph-data", "a"], ["instances", "a", {}], ["graph-data", "b"], ["generate-job-status", "job"]];
  keys.forEach((key) => client.setQueryData(key, {}));
  await invalidateOntologyQueries(client, "a");
  assert.deepEqual(keys.map((key) => client.getQueryState(key).isInvalidated), [true, true, true, false, false]);
  client.clear();
});

test("creating an ontology only invalidates the shared summary", async () => {
  const client = new QueryClient();
  client.setQueryData(["ontology-summary-all"], {});
  client.setQueryData(["instances", "a"], {});
  await invalidateOntologyQueries(client);
  assert.equal(client.getQueryState(["ontology-summary-all"]).isInvalidated, true);
  assert.equal(client.getQueryState(["instances", "a"]).isInvalidated, false);
  client.clear();
});

test("graph labels handle both slash and fragment IRIs", () => {
  assert.equal(shortenUri("http://example.com/Person"), "Person");
  assert.equal(shortenUri("http://example.com/test#Person"), "Person");
});

test("deletion clears selection using the requested ID, not the response object", async (t) => {
  const { default: optionsForDelete } = loadTypeScript(new URL("../src/app/mutationOptions/createDeleteOntologyMutationOptions.ts", import.meta.url));
  t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true, deleted: "a" }));
  const client = new QueryClient();
  client.setQueryData(["graph-data", "a"], {});
  client.setQueryData(["graph-data", "b"], {});
  let cleared;
  const options = optionsForDelete(client, (id) => { cleared = id; });
  const response = await options.mutationFn("a");
  options.onSuccess(response, "a");
  assert.equal(cleared, "a");
  assert.equal(client.getQueryState(["graph-data", "a"]), undefined);
  assert.ok(client.getQueryState(["graph-data", "b"]));
  client.clear();
});
