"use client";

import { useEffect, useRef, useState } from "react";
import type { Triple } from "../store/ontology-store";
import type { GraphSettings, GraphResult } from "../utils/graph-model";
import type { GraphRequest, GraphResponse } from "../workers/graph.worker";

const EMPTY_GRAPH: GraphResult = {
  nodes: [],
  edges: [],
  displayedCount: 0,
  filteredTotal: 0,
  schemaRelations: [],
  ontologyRelations: [],
};

export default function useGraphLayout(
  triples: Triple[] | undefined,
  settings: GraphSettings,
  contextKey?: string,
) {
  const worker = useRef<{
    instance: Worker;
    triples: Triple[];
    busy: boolean;
  } | null>(null);
  const requestId = useRef(0);
  const [result, setResult] = useState<{
    triples?: Triple[];
    contextKey?: string;
    graph: GraphResult;
  }>({ graph: EMPTY_GRAPH });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = ++requestId.current;
    setError("");
    if (!triples) {
      worker.current?.instance.terminate();
      worker.current = null;
      setPending(false);
      return;
    }
    setPending(true);
    const timer = setTimeout(() => {
      let current = worker.current;
      let initialize = false;
      if (!current || current.triples !== triples || current.busy) {
        current?.instance.terminate();
        try {
          current = {
            instance: new Worker(
              new URL("../workers/graph.worker.ts", import.meta.url),
            ),
            triples,
            busy: false,
          };
        } catch {
          worker.current = null;
          setPending(false);
          setError(
            "Graph layout could not start. Reload the page and try again.",
          );
          return;
        }
        worker.current = current;
        initialize = true;
      }
      const active = current;
      active.busy = true;
      active.instance.onmessage = ({ data }: MessageEvent<GraphResponse>) => {
        if (worker.current !== active) return;
        active.busy = false;
        if (data.id !== requestId.current) return;
        setPending(false);
        if ("error" in data) setError(data.error);
        else setResult({ triples, contextKey, graph: data.graph });
      };
      active.instance.onerror = () => {
        if (worker.current !== active) return;
        active.instance.terminate();
        worker.current = null;
        if (id !== requestId.current) return;
        setPending(false);
        setError(
          "Graph layout stopped unexpectedly. Reduce the triple limit or reload the page.",
        );
      };
      active.instance.postMessage({
        id,
        settings,
        ...(initialize ? { triples } : {}),
      } satisfies GraphRequest);
    }, 120);
    return () => clearTimeout(timer);
  }, [triples, settings, contextKey]);

  useEffect(
    () => () => {
      worker.current?.instance.terminate();
      worker.current = null;
    },
    [],
  );

  return {
    graph:
      result.triples === triples ||
      (contextKey && result.contextKey === contextKey)
        ? result.graph
        : EMPTY_GRAPH,
    pending,
    error,
  };
}
