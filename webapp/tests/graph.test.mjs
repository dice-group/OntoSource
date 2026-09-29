import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypeScript } from "./load-typescript.mjs";
const { indexGraph, buildGraph } = loadTypeScript(new URL("../src/app/utils/graph-model.ts", import.meta.url));
const { getLayoutedElements } = loadTypeScript(new URL("../src/app/utils/graph-layout.ts", import.meta.url));
const type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const owlClass = "http://www.w3.org/2002/07/owl#Class";
const iri = name => `http://example.com/${name}`;
const defaults = { maxTriples: 500, direction: "TB", showTBox: true, showABox: false, showLiterals: false, hiddenNodeTypes: [] };
const triple = (s, p, o) => ({ s, p, o });

test("graph indexing uses declarations beyond the display limit and keeps the full legend", () => {
  const index = indexGraph([
    triple(iri('Person'), iri('related'), iri('Parent')),
    triple(iri('Person'), type, owlClass), triple(iri('Parent'), type, owlClass),
    triple(iri('Ann'), iri('hasName'), { type: 'literal', value: 'Ann' }),
  ]);
  const graph = buildGraph(index, { ...defaults, maxTriples: 1 });
  assert.equal(graph.displayedCount, 1);
  assert.equal(graph.filteredTotal, 3);
  assert.equal(graph.nodes.length, 2);
  assert.ok(graph.nodes.every(node => node.data.boxType === 'tbox'));
  assert.ok(graph.ontologyRelations.some(relation => relation.uri === iri('hasName')));
});

test("box and node-type filters preserve literal identity and accurate counts", () => {
  const index = indexGraph([
    triple(iri('Person'), type, owlClass),
    triple(iri('Ann'), type, iri('Person')),
    triple(iri('Ann'), iri('label'), { type: 'literal', value: 'same' }),
    triple(iri('Ben'), iri('label'), { type: 'literal', value: 'same' }),
  ]);
  assert.equal(buildGraph(index, defaults).displayedCount, 1);
  const graph = buildGraph(index, { ...defaults, showABox: true, showLiterals: true });
  const literals = graph.nodes.filter(n => n.data.boxType === 'literal');
  assert.equal(literals.length, 2);
  assert.equal(new Set(literals.map(n => n.id)).size, 2);
  assert.equal(buildGraph(index, { ...defaults, showABox: true, showLiterals: true, hiddenNodeTypes: ['literal'] }).displayedCount, 2);
  assert.equal(buildGraph(index, { ...defaults, showTBox: false }).displayedCount, 0);
});

test("bidirectional and parallel predicates retain arrows, labels, and separate paths", () => {
  const graph = buildGraph(indexGraph([
    triple(iri('Ann'), iri('knows'), iri('Ben')), triple(iri('Ben'), iri('knows'), iri('Ann')),
    triple(iri('Ann'), iri('married'), iri('Ben')),
  ]), { ...defaults, showABox: true });
  assert.equal(graph.edges.length, 2);
  const knows = graph.edges.find(edge => edge.label === 'knows');
  assert.ok(knows.markerStart && knows.markerEnd && knows.data.isBidirectional);
  const layout = getLayoutedElements(graph.nodes, graph.edges, 'LR');
  assert.deepEqual(layout.edges.map(edge => edge.data.offset), [-25, 25]);
  assert.ok(layout.nodes.every(node => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)));
  assert.ok(layout.edges.every(edge => edge.sourceHandle === 'right' && edge.targetHandle === 'left'));
  assert.equal(graph.nodes[0].position.x, 0);
  assert.equal(knows.data.triples.length, 2);
});

test("empty and cyclic graphs lay out without losing elements", () => {
  assert.deepEqual(getLayoutedElements([], []), { nodes: [], edges: [] });
  const graph = buildGraph(indexGraph([
    triple(iri('a'), iri('p'), iri('b')), triple(iri('b'), iri('p'), iri('c')), triple(iri('c'), iri('p'), iri('a')),
  ]), { ...defaults, showABox: true });
  const result = getLayoutedElements(graph.nodes, graph.edges);
  assert.equal(result.nodes.length, 3); assert.equal(result.edges.length, 3);
  assert.ok(result.nodes.every(node => Number.isFinite(node.position.y)));
});

test("large parallel groups receive distinct centered offsets", () => {
  const nodes = ['a','b'].map(id => ({ id, position: {x:0,y:0}, data: {} }));
  const edges = Array.from({length: 5000}, (_, i) => ({ id: `${i}`, source: 'a', target: 'b', data: {predicate: `${i}`, isBidirectional: false} }));
  const result = getLayoutedElements(nodes, edges);
  assert.equal(new Set(result.edges.map(e => e.data.offset)).size, edges.length);
  assert.equal(result.edges[0].data.offset, -result.edges.at(-1).data.offset);
});

test("absolute URNs remain resource nodes rather than literals", () => {
  const graph = buildGraph(indexGraph([{ s: "urn:entity:a", p: "urn:relation:knows", o: "urn:entity:b" }]), { ...defaults, showABox: true });
  assert.equal(graph.nodes.length, 2);
  assert.ok(graph.nodes.every(node => node.data.boxType === "abox"));
});
