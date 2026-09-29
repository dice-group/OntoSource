import { chromium } from "playwright";
import { test } from "node:test";
import assert from "node:assert/strict";
import { triples, ontology } from "../fixtures/large-graph.mjs";
test(
  "graph work is cancellable and controls stay interactive",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/ontology/summary_all", (r) =>
      r.fulfill({ json: { summary: [ontology] } }),
    );
    await page.route("**/api/ontology/perf/summary", (r) =>
      r.fulfill({ json: ontology }),
    );
    await page.route("**/api/ontology/perf/triples*", (r) =>
      r.fulfill({ json: { id: "perf", total: triples.length, triples } }),
    );
    try {
      await page.goto(process.env.ONTOSOURCE_URL || "http://127.0.0.1:3000");
      await page.getByText("benchmark.owl", { exact: true }).click();
      await page.locator(".react-flow__node").first().waitFor();

      await page.getByLabel("Maximum triples to display").fill("4000");
      await page.waitForTimeout(400);
      const started = Date.now();
      await page.getByRole("button", { name: "Legend", exact: true }).click();
      assert(
        Date.now() - started < 1500,
        "controls must respond while layout is running",
      );
      await page.getByLabel("Maximum triples to display").fill("25");
      await page.waitForFunction(() =>
        document.querySelector(".graph-panel")?.innerText.includes("25/"),
      );
      await page.waitForFunction(
        () =>
          !document
            .querySelector(".graph-panel [role=status]")
            ?.textContent.includes("Updating graph"),
      );
      await page.waitForTimeout(1000);
      assert((await page.locator(".graph-panel").innerText()).includes("25/"));
      await page.getByRole("button", { name: "Fit View", exact: true }).click();
      const labels = page.locator(".react-flow__edgelabel-renderer > div");
      await page.getByLabel("Always show edge labels").check();
      assert((await labels.count()) > 0);
      await page.getByTitle("Enter fullscreen", { exact: true }).click();
      await page.waitForFunction(() => !!document.fullscreenElement);
      await page.getByTitle("Exit fullscreen (ESC)", { exact: true }).click();
      await page
        .getByTitle("TBox: Classes and Properties", { exact: true })
        .click();
      await page.getByText("No triples visible", { exact: true }).waitFor();
      await page
        .getByTitle("TBox: Classes and Properties", { exact: true })
        .click();
      await page.locator(".react-flow__node").first().waitFor();
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        1280,
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
