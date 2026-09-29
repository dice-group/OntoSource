export const triples = [];
const iri = (i) => `http://example.com/graph#Class${i}`;
for (let i = 0; i < 2000; i++) {
  triples.push({
    s: iri(i),
    p: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    o: "http://www.w3.org/2002/07/owl#Class",
  });
  if (i)
    triples.push({
      s: iri(i),
      p: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
      o: iri(Math.floor((i - 1) / 3)),
    });
  if (i > 4 && i % 3 === 0)
    triples.push({
      s: iri(i),
      p: "http://www.w3.org/2002/07/owl#equivalentClass",
      o: iri(i - 2),
    });
}
export const ontology = {
  id: "perf",
  filename: "benchmark.owl",
  ontology_iri: "http://example.com/graph",
  summary: {
    classes: 2000,
    object_properties: 0,
    data_properties: 0,
    individuals: 0,
    triples: triples.length,
  },
};
