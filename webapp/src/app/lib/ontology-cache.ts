import { type QueryClient } from "@tanstack/react-query";

const ontologyQueries = new Set([
  "ontology-summary", "ontology-entities", "graph-data",
  "instances", "super-classes", "sub-classes", "types",
]);

export function invalidateOntologyQueries(queryClient: QueryClient, ontologyId?: string) {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) => queryKey[0] === "ontology-summary-all" || (
      !!ontologyId && ontologyQueries.has(String(queryKey[0])) && queryKey[1] === ontologyId
    ),
  });
}
