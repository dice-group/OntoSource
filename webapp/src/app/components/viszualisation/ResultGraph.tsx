"use client";

import { useMemo, useState, type ReactNode } from "react";
import "@xyflow/react/dist/style.css";
import type { Triple } from "../../store/ontology-store";
import type { NodeType } from "../../utils/graph-utils";
import useGraphLayout from "../../hooks/useGraphLayout";
import GraphCanvas from "./GraphCanvas";

function Preview({
  triples,
  nodeTypes,
  scores,
}: {
  triples: Triple[];
  nodeTypes?: Record<string, NodeType>;
  scores?: number[];
}) {
  const settings = useMemo(
    () => ({
      maxTriples: 100,
      direction: "LR" as const,
      showTBox: true,
      showABox: true,
      showLiterals: true,
      hiddenNodeTypes: [],
      nodeTypes,
    }),
    [nodeTypes],
  );
  const { graph, pending, error } = useGraphLayout(triples, settings);
  const edges = useMemo(
    () =>
      scores
        ? graph.edges.map((edge, index) => ({
            ...edge,
            label: `${edge.label} · ${scores[index]?.toFixed(3) ?? ""}`,
          }))
        : graph.edges,
    [graph.edges, scores],
  );
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-slate-500">
        {triples.length > 100
          ? `Showing 100 of ${triples.length} relationships. The list includes all results.`
          : "Drag to pan, scroll to zoom. Select an edge to show its label."}
      </p>
      <div
        className="relative h-[400px] border border-slate-200 rounded-lg overflow-hidden"
        aria-label="Result graph"
      >
        {error ? (
          <p className="p-4 text-xs text-red-700" role="alert">
            {error}
          </p>
        ) : pending ? (
          <p className="p-4 text-xs text-slate-500" role="status">
            Preparing result graph…
          </p>
        ) : (
          <GraphCanvas nodes={graph.nodes} edges={edges} alwaysShowLabels />
        )}
      </div>
    </div>
  );
}

export default function ResultGraph({
  triples,
  nodeTypes,
  scores,
  children,
}: {
  triples: Triple[];
  nodeTypes?: Record<string, NodeType>;
  scores?: number[];
  children: ReactNode;
}) {
  const [visual, setVisual] = useState(false);
  if (!triples.length) return children;
  return (
    <>
      <div
        className="flex gap-1 my-3"
        role="group"
        aria-label="Result presentation"
      >
        {([false, true] as const).map((graph) => (
          <button
            key={String(graph)}
            type="button"
            aria-pressed={visual === graph}
            className={`px-3 py-1.5 text-xs rounded-md ${visual === graph ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}
            onClick={() => setVisual(graph)}
          >
            {graph ? "Graph" : "List"}
          </button>
        ))}
      </div>
      {visual ? (
        <Preview triples={triples} nodeTypes={nodeTypes} scores={scores} />
      ) : (
        children
      )}
    </>
  );
}
