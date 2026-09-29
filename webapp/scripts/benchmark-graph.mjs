import { chromium } from "playwright";
import fs from "node:fs";
import { triples, ontology } from "../tests/fixtures/large-graph.mjs";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(120000);
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
  await page.addInitScript(() => {
    window.longTasks = [];
    new PerformanceObserver((list) =>
      window.longTasks.push(
        ...list
          .getEntries()
          .map((e) => ({ start: e.startTime, duration: e.duration })),
      ),
    ).observe({ type: "longtask" });
  });
  const result = {
    label: "measured",
    totalTriples: triples.length,
    measurements: [],
  };
  async function measure(label, action, count) {
    await page.evaluate(() => (window.longTasks = []));
    const start = Date.now();
    await action();
    if (count)
      await page.waitForFunction(
        (n) =>
          document.querySelector(".graph-panel")?.innerText.includes(`${n}/`),
        count,
      );
    await page.waitForTimeout(150);
    await page.waitForFunction(
      () =>
        !document
          .querySelector(".graph-panel [role=status]")
          ?.textContent.includes("Updating graph"),
    );
    await page.waitForTimeout(1050);
    result.measurements.push({
      label,
      elapsedMs: Date.now() - start,
      ...(await page.evaluate(() => ({
        longTasks: window.longTasks,
        maxLongTaskMs: Math.max(0, ...window.longTasks.map((e) => e.duration)),
        blockingMs: window.longTasks.reduce(
          (s, e) => s + Math.max(0, e.duration - 50),
          0,
        ),
        domNodes: document.querySelectorAll("*").length,
        renderedNodes: document.querySelectorAll(".react-flow__node").length,
        renderedEdges: document.querySelectorAll(".react-flow__edge").length,
      }))),
    });
  }
  try {
    await page.goto(process.env.ONTOSOURCE_URL || "http://127.0.0.1:3000");
    await measure(
      "initial 500",
      () => page.getByText("benchmark.owl", { exact: true }).click(),
      500,
    );
    await measure(
      "increase to 1500",
      () => page.getByLabel("Maximum triples to display").fill("1500"),
      1500,
    );
    await measure("change direction", () =>
      page.getByRole("button", { name: "Left→", exact: true }).click(),
    );
    await measure("pan", async () => {
      const box = await page.locator(".react-flow__pane").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + 200,
        box.y + box.height / 2 + 60,
        { steps: 30 },
      );
      await page.mouse.up();
    });
    result.errors = errors;
    fs.writeFileSync(
      process.env.GRAPH_BENCHMARK_OUTPUT ||
        "/tmp/ontosource-graph-benchmark.json",
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
