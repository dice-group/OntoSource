import { chromium } from "playwright";
import assert from "node:assert/strict";
import { test } from "node:test";
const base = process.env.ONTOSOURCE_URL || "http://127.0.0.1:3000",
  ns = "http://example.com/visual#",
  rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
  owl = "http://www.w3.org/2002/07/owl#Class",
  sub = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
test(
  "visual editing updates triples, exports and reasoning graphs",
  { timeout: 120000 },
  async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(20000);
    let id;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      id = (
        await (
          await page.request.post(base + "/api/modify/create", {
            data: { ontology_iri: ns, filename: "visual-edit-test.owl" },
          })
        ).json()
      ).id;
      const triplesPath = base + `/api/modify/${id}/triples`;
      for (const c of ["Person", "Parent"])
        assert.equal(
          (
            await page.request.post(triplesPath, {
              data: { s: ns + c, p: rdf, o: owl },
            })
          ).status(),
          200,
        );
      await page.request.post(triplesPath, {
        data: { s: ns + "Parent", p: sub, o: ns + "Person" },
      });
      await page.request.post(triplesPath, {
        data: { s: ns + "Ann", p: rdf, o: ns + "Person" },
      });
      await page.goto(base);
      await page.getByText("visual-edit-test.owl", { exact: true }).click();
      await page.locator(".react-flow__node").first().waitFor();
      await page
        .getByRole("button", { name: "Edit graph", exact: true })
        .click();
      const editor = page.getByRole("complementary", {
        name: "Visual triple editor",
      });
      await editor.getByLabel("Triple subject").fill(ns + "Guardian");
      await editor.getByLabel("Triple predicate").fill(rdf);
      await editor.getByLabel("Triple object", { exact: true }).fill(owl);
      await editor
        .getByRole("button", { name: "Add triple", exact: true })
        .click();
      await editor
        .getByText("Triple saved. The graph and ontology are updated.", {
          exact: true,
        })
        .waitFor();
      await page.locator(`.react-flow__node[data-id="${ns}Guardian"]`).click();
      await editor
        .getByRole("heading", { name: "Connected triples" })
        .waitFor();
      await editor
        .getByRole("button", { name: /Guardian → type → Class/ })
        .click();
      assert.equal(
        await editor.getByLabel("Triple subject").inputValue(),
        ns + "Guardian",
      );
      await editor.getByLabel("Triple subject").fill(ns + "Carer");
      await editor
        .getByRole("button", { name: "Save triple", exact: true })
        .click();
      await page.locator(`.react-flow__node[data-id="${ns}Carer"]`).waitFor();
      const edge = page.locator(
        `.react-flow__edge[aria-label="Edge from ${ns}Carer to ${owl}"]`,
      );
      await edge.focus();
      await edge.press("Enter");
      await editor
        .getByRole("button", { name: "Remove triple", exact: true })
        .click();
      await editor
        .getByRole("button", { name: "Confirm remove", exact: true })
        .click();
      await editor.getByText("Triple removed.", { exact: true }).waitFor();
      let actual = (
        await (
          await page.request.get(base + `/api/ontology/${id}/triples`)
        ).json()
      ).triples;
      assert(
        !actual.some((t) => t.s === ns + "Guardian" || t.s === ns + "Carer"),
      );
      await editor.getByRole("button", { name: "New", exact: true }).click();
      await editor.getByLabel("Triple subject").fill(ns + "Person");
      await editor
        .getByLabel("Triple predicate")
        .fill("http://www.w3.org/2000/01/rdf-schema#label");
      await editor.getByLabel("Triple object type").selectOption("literal");
      await editor
        .getByLabel("Triple object", { exact: true })
        .fill("Personne");
      await editor.getByLabel("Literal language").fill("fr");
      await editor
        .getByRole("button", { name: "Add triple", exact: true })
        .click();
      await editor
        .getByText("Triple saved. The graph and ontology are updated.", {
          exact: true,
        })
        .waitFor();
      await page.getByTitle("Literal values", { exact: true }).click();
      await page.waitForFunction(
        () =>
          !document
            .querySelector(".graph-panel [role=status]")
            ?.textContent.includes("Updating graph"),
      );
      await page
        .locator(".react-flow__node")
        .filter({ hasText: "Personne" })
        .waitFor();
      await page.mouse.move(1400, 990);
      await page.waitForTimeout(250);
      await page.getByRole("button", { name: "Fit View", exact: true }).click();
      const sourceHandle = page.locator(
        `.react-flow__node[data-id="${ns}Person"] .react-flow__handle[data-handleid="bottom"]`,
      );
      const targetHandle = page.locator(
        `.react-flow__node[data-id="${ns}Parent"] .react-flow__handle[data-handleid="top"]`,
      );
      const sourcePoint = await sourceHandle.boundingBox();
      const targetPoint = await targetHandle.boundingBox();
      await page.mouse.move(
        sourcePoint.x + sourcePoint.width / 2,
        sourcePoint.y + sourcePoint.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        targetPoint.x + targetPoint.width / 2,
        targetPoint.y + targetPoint.height / 2,
        { steps: 12 },
      );
      await page.mouse.up();
      await page.waitForFunction(
        (subject) =>
          document.querySelector('[aria-label="Triple subject"]')?.value ===
          subject,
        ns + "Person",
      );
      assert.equal(
        await editor.getByLabel("Triple subject").inputValue(),
        ns + "Person",
      );
      assert.equal(
        await editor.getByLabel("Triple object", { exact: true }).inputValue(),
        ns + "Parent",
      );
      await editor.getByLabel("Triple predicate").fill(ns + "related");
      await editor
        .getByRole("button", { name: "Add triple", exact: true })
        .click();
      await editor
        .getByText("Triple saved. The graph and ontology are updated.", {
          exact: true,
        })
        .waitFor();
      actual = (
        await (
          await page.request.get(base + `/api/ontology/${id}/triples`)
        ).json()
      ).triples;
      assert(
        actual.some(
          (t) =>
            t.s === ns + "Person" &&
            t.p === ns + "related" &&
            t.o === ns + "Parent",
        ),
      );
      const downloaded = await page.request.get(
        base + `/api/ontology/${id}/download?format=turtle`,
      );
      assert((await downloaded.text()).includes("Personne"));
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        1280,
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole("link", { name: "Predict", exact: true }).click();
      await page
        .getByRole("button", { name: "Class hierarchy", exact: true })
        .click();
      await page
        .getByLabel("Class", { exact: true })
        .filter({ visible: true })
        .selectOption(ns + "Parent");
      await page
        .getByRole("button", { name: "Run query", exact: true })
        .click();
      await page.getByRole("button", { name: "Graph", exact: true }).click();
      await page
        .getByLabel("Result graph")
        .locator(".react-flow__node")
        .first()
        .waitFor();
      assert(
        (await page.getByLabel("Result graph").innerText()).includes("Person"),
      );

      await page
        .getByRole("button", { name: "Instances", exact: true })
        .click();
      await page
        .getByLabel("Class", { exact: true })
        .filter({ visible: true })
        .selectOption(ns + "Person");
      await page
        .getByRole("button", { name: "Predict Instances", exact: true })
        .click();
      await page.getByRole("button", { name: "Graph", exact: true }).click();
      await page
        .getByLabel("Result graph")
        .filter({ visible: true })
        .locator(".react-flow__node")
        .first()
        .waitFor();
      assert(
        (
          await page
            .getByLabel("Result graph")
            .filter({ visible: true })
            .innerText()
        ).includes("Ann"),
      );
      await page.route("**/api/neural-reasoning/list", (r) =>
        r.fulfill({
          json: {
            neural_ontologies: [
              { neural_ontology_id: "preview-model", ontology_id: id },
            ],
          },
        }),
      );
      await page.route(
        "**/api/neural-reasoning/preview-model/predict-links",
        (r) =>
          r.fulfill({
            json: {
              predictions: [
                { iri: ns + "Parent", score: 0.875 },
                { iri: ns + "Guardian", score: 0.5 },
              ],
            },
          }),
      );
      await page.reload();
      await page
        .getByLabel("Select Ontology", { exact: true })
        .selectOption(id);
      await page
        .getByRole("button", { name: "Neural models", exact: true })
        .click();
      await page.getByLabel("Trained model").selectOption("preview-model");
      await page.getByLabel("Subject", { exact: true }).fill(ns + "Person");
      await page.getByLabel("Relation", { exact: true }).fill(ns + "related");
      await page
        .getByRole("button", { name: "Predict links", exact: true })
        .click();
      await page.getByRole("button", { name: "Graph", exact: true }).click();
      await page
        .getByLabel("Result graph")
        .locator(".react-flow__edge")
        .first()
        .waitFor();
      assert(
        (await page.getByLabel("Result graph").innerText()).includes("0.875"),
      );
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        1280,
      );
      assert.deepEqual(errors, []);
    } finally {
      if (id) await page.request.delete(base + `/api/ontology/${id}`);
      await browser.close();
    }
  },
);
