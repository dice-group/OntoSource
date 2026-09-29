import type { Triple } from "../store/ontology-store";
import {
  indexGraph,
  buildGraph,
  type GraphSettings,
  type GraphResult,
} from "../utils/graph-model";
import { getLayoutedElements } from "../utils/graph-layout";

export type GraphRequest = {
  id: number;
  triples?: Triple[];
  settings: GraphSettings;
};
export type GraphResponse =
  { id: number; graph: GraphResult } | { id: number; error: string };

let index: ReturnType<typeof indexGraph> | undefined;
self.onmessage = ({ data }: MessageEvent<GraphRequest>) => {
  try {
    if (data.triples) index = indexGraph(data.triples);
    if (!index) throw new Error("No ontology data available.");
    const graph = buildGraph(index, data.settings);
    const layout = getLayoutedElements(
      graph.nodes,
      graph.edges,
      data.settings.direction,
    );
    self.postMessage({
      id: data.id,
      graph: { ...graph, ...layout },
    } satisfies GraphResponse);
  } catch {
    self.postMessage({
      id: data.id,
      error:
        "Could not arrange this graph. Reduce the triple limit or narrow the filters, then retry.",
    } satisfies GraphResponse);
  }
};
