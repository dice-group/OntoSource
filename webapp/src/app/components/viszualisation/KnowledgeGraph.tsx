"use client";

import { useMemo, useState, useRef, useEffect, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import "@xyflow/react/dist/style.css";
import { type NodeType, getNodeColor } from "../../utils/graph-utils";
import createGraphDataQueryOptions from "../../queryOptions/createGraphDataQueryOptions";
import useGraphLayout from "../../hooks/useGraphLayout";
import GraphCanvas from "./GraphCanvas";
import GraphEditor, { type GraphSelection } from "./GraphEditor";

interface KnowledgeGraphProps {
  ontologyId: string | null;
  width?: number;
}

export default function KnowledgeGraph({
  ontologyId,
  width,
}: KnowledgeGraphProps) {
  const [maxTriplesToDisplay, setMaxTriplesToDisplay] = useState(500);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");

  // Default: only show TBox (schema)
  const [showTBox, setShowTBox] = useState(true);
  const [showABox, setShowABox] = useState(false);
  const [showLiterals, setShowLiterals] = useState(false);
  // Track hidden node types and relations
  const [hiddenNodeTypes, setHiddenNodeTypes] = useState<Set<NodeType>>(
    new Set(),
  );
  const [hiddenRelations, setHiddenRelations] = useState<Set<string>>(
    new Set(),
  );

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Legend visibility state
  const [showLegend, setShowLegend] = useState(true);

  const { data, isPending, error } = useQuery({
    ...createGraphDataQueryOptions(ontologyId || ""),
    enabled: !!ontologyId,
  });

  const [editMode, setEditMode] = useState(false);
  const [selection, setSelection] = useState<GraphSelection>(null);
  useEffect(() => {
    setSelection(null);
    setEditMode(false);
  }, [ontologyId]);
  const [alwaysShowLabels, setAlwaysShowLabels] = useState(false);
  const settings = useMemo(
    () => ({
      maxTriples: maxTriplesToDisplay,
      direction: layoutDirection,
      showTBox,
      showABox,
      showLiterals,
      hiddenNodeTypes: [...hiddenNodeTypes],
    }),
    [
      maxTriplesToDisplay,
      layoutDirection,
      showTBox,
      showABox,
      showLiterals,
      hiddenNodeTypes,
    ],
  );
  const {
    graph,
    pending: layoutPending,
    error: layoutError,
  } = useGraphLayout(data?.triples, settings, ontologyId || undefined);
  const {
    nodes: allNodes,
    edges: allEdges,
    displayedCount,
    filteredTotal,
    schemaRelations,
    ontologyRelations,
  } = graph;
  const total = data?.total || 0;
  const deferredHiddenRelations = useDeferredValue(hiddenRelations);

  // Stage 2: cheap pass that hides edges per current relation filter.
  // Uses deferredHiddenRelations so rapid toggles don't block input.
  const { nodes, edges } = useMemo(() => {
    if (!deferredHiddenRelations.size) {
      return {
        nodes: allNodes,
        edges: allEdges,
        visibleTripleCount: allEdges.length,
      };
    }
    const visibleEdges = allEdges.filter(
      (e) => !deferredHiddenRelations.has(String(e.data?.predicate ?? "")),
    );
    return {
      nodes: allNodes,
      edges: visibleEdges,
      visibleTripleCount: visibleEdges.length,
    };
  }, [allNodes, allEdges, deferredHiddenRelations]);

  // Toggle functions for legend items
  const toggleNodeType = (nodeType: NodeType) => {
    setHiddenNodeTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeType)) {
        newSet.delete(nodeType);
      } else {
        newSet.add(nodeType);
      }
      return newSet;
    });
  };

  const toggleRelation = (relationUri: string) => {
    setHiddenRelations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(relationUri)) {
        newSet.delete(relationUri);
      } else {
        newSet.add(relationUri);
      }
      return newSet;
    });
  };

  // Fullscreen functionality
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  // Listen for fullscreen changes (e.g., user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (!ontologyId) {
    return (
      <div className="flex-1 surface-panel p-8 flex items-center justify-center min-h-[540px]">
        <div className="text-center">
          <div className="empty-state-icon">
            <svg
              className="w-7 h-7 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold mb-1">
            No ontology selected
          </p>
          <p className="text-slate-500 text-sm">
            Select an ontology from the list to visualize its knowledge graph
          </p>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex-1 surface-panel p-8 flex items-center justify-center min-h-[540px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-primary" />
          <p className="text-slate-700 font-semibold">
            Loading knowledge graph…
          </p>
          <p className="text-slate-500 text-sm">Preparing visualization data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 surface-panel p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-semibold text-sm mb-1">
            Error loading graph
          </p>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Determine if we have any data at all
  const hasData = data && data.triples && data.triples.length > 0;
  const hasVisibleTriples = displayedCount > 0;

  const toggleBtnBase =
    "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors";
  const toggleActive = "bg-primary text-white";
  const toggleInactive = "bg-slate-100 text-slate-600 hover:bg-slate-200";

  return (
    <div
      ref={containerRef}
      className={[
        "graph-panel bg-white border border-slate-200 flex flex-col",
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none h-screen w-screen"
          : "rounded-2xl",
      ].join(" ")}
    >
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0 space-y-3">
        {/* Row 1: title + actions */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Knowledge Graph
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {nodes.length} nodes · {edges.length} edges
              {total > 0 &&
                ` · ${displayedCount}/${filteredTotal} triples shown`}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              aria-pressed={editMode}
              onClick={() => setEditMode((value) => !value)}
              className={[
                toggleBtnBase,
                editMode ? toggleActive : toggleInactive,
              ].join(" ")}
            >
              Edit graph
            </button>
            <button
              aria-pressed={showLegend}
              onClick={() => setShowLegend(!showLegend)}
              className={[
                toggleBtnBase,
                showLegend ? toggleActive : toggleInactive,
              ].join(" ")}
              title={showLegend ? "Hide legend" : "Show legend"}
            >
              Legend
            </button>
            <button
              onClick={toggleFullscreen}
              className={[
                toggleBtnBase,
                isFullscreen ? toggleActive : toggleInactive,
              ].join(" ")}
              title={
                isFullscreen ? "Exit fullscreen (ESC)" : "Enter fullscreen"
              }
            >
              {isFullscreen ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 9V4.5M9 9H4.5M9 15v4.5M9 15H4.5M15 9h4.5M15 9V4.5M15 15h4.5M15 15v4.5"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Triple limit */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="triple-limit"
            className="text-xs font-medium text-slate-600 whitespace-nowrap"
          >
            Triples:
          </label>
          <input
            id="triple-limit"
            type="range"
            min="1"
            max={Math.max(filteredTotal || total, 1)}
            step="1"
            value={Math.min(
              maxTriplesToDisplay,
              Math.max(filteredTotal || total, 1),
            )}
            onChange={(e) => setMaxTriplesToDisplay(Number(e.target.value))}
            className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary"
          />
          <input
            type="number"
            aria-label="Maximum triples to display"
            min="1"
            step="1"
            max={Math.max(filteredTotal || total, 1)}
            value={Math.min(
              maxTriplesToDisplay,
              Math.max(filteredTotal || total, 1),
            )}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!isNaN(v) && v > 0)
                setMaxTriplesToDisplay(
                  Math.min(v, Math.max(filteredTotal || total, 1)),
                );
            }}
            className="w-20 px-2 py-1 text-xs text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">
            / {filteredTotal || 0}
          </span>
        </div>

        {/* Row 3: Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Layout:</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-200">
              {(["TB", "LR"] as const).map((dir) => (
                <button
                  key={dir}
                  aria-pressed={layoutDirection === dir}
                  onClick={() => setLayoutDirection(dir)}
                  className={[
                    "px-3 py-1 text-xs font-medium transition-colors",
                    layoutDirection === dir
                      ? "bg-primary text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {dir === "TB" ? "Top↓" : "Left→"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Show:</span>
            <button
              aria-pressed={showTBox}
              onClick={() => setShowTBox(!showTBox)}
              className={[
                toggleBtnBase,
                showTBox ? "bg-primary text-white" : toggleInactive,
              ].join(" ")}
              title="TBox: Classes and Properties"
            >
              TBox
            </button>
            <button
              aria-pressed={showABox}
              onClick={() => setShowABox(!showABox)}
              className={[
                toggleBtnBase,
                showABox ? "bg-amber-700 text-white" : toggleInactive,
              ].join(" ")}
              title="ABox: Individuals"
            >
              ABox
            </button>
            <button
              aria-pressed={showLiterals}
              onClick={() => setShowLiterals(!showLiterals)}
              className={[
                toggleBtnBase,
                showLiterals ? "bg-rose-700 text-white" : toggleInactive,
              ].join(" ")}
              title="Literal values"
            >
              Literals
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={alwaysShowLabels}
              onChange={(event) => setAlwaysShowLabels(event.target.checked)}
            />
            Always show edge labels
          </label>
        </div>
      </div>

      <div
        className="px-4 text-xs text-slate-500"
        role="status"
        aria-live="polite"
      >
        {layoutPending ? (
          <p className="py-2">
            Updating graph… You can keep using the controls.
          </p>
        ) : layoutError ? (
          <p className="py-2 text-red-700">{layoutError}</p>
        ) : null}
      </div>

      {/* Graph canvas */}
      <div
        className={[
          "graph-canvas flex-1",
          isFullscreen ? "min-h-0" : "min-h-[540px]",
        ].join(" ")}
        style={{ width: width ?? "100%" }}
      >
        <div className="absolute inset-0 flex">
          <div className="relative flex-1 min-w-0">
            {!hasData ? (
              <div className="h-full flex items-center justify-center bg-slate-50">
                <p className="text-slate-500 text-sm">
                  No triples available in this ontology
                </p>
              </div>
            ) : !hasVisibleTriples ? (
              <div className="h-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <p className="text-slate-600 text-sm font-medium mb-1">
                    {layoutPending
                      ? "Preparing graph…"
                      : layoutError
                        ? "Graph layout unavailable"
                        : "No triples visible"}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {layoutPending
                      ? "The graph will appear when its layout is ready."
                      : "Try adjusting the triple limit, filters, or legend."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0">
                <GraphCanvas
                  nodes={nodes}
                  edges={edges}
                  alwaysShowLabels={alwaysShowLabels}
                  editMode={editMode}
                  onSelect={setSelection}
                />
              </div>
            )}
          </div>
          {editMode && (
            <GraphEditor
              key={ontologyId}
              ontologyId={ontologyId}
              triples={data?.triples || []}
              selection={selection}
              onSelect={setSelection}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        className={[
          "border-t border-slate-100 bg-slate-50 flex-shrink-0 transition-colors duration-300 ease-in-out overflow-hidden",
          showLegend
            ? "max-h-[480px] opacity-100 p-4"
            : "max-h-0 opacity-0 p-0",
        ].join(" ")}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Legend
          </p>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">
              Knowledge Types
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                {
                  label: "TBox (Schema)",
                  color: "bg-primary",
                  border: "border-2 border-slate-800",
                },
                {
                  label: "ABox (Instances)",
                  color: "bg-amber-700",
                  border: "border-2 border-dashed border-slate-800",
                },
                {
                  label: "Literals",
                  color: "bg-rose-700",
                  border: "border border-dotted border-slate-800",
                },
              ].map(({ label, color, border }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-xs text-slate-600"
                >
                  <div className={`w-8 h-4 rounded ${color} ${border}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">
              Node Types <span className="font-normal">(click to toggle)</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <LegendDot
                color={getNodeColor("class")}
                label="Classes"
                onClick={() => toggleNodeType("class")}
                isHidden={hiddenNodeTypes.has("class")}
              />
              <LegendDot
                color={getNodeColor("property")}
                label="Properties"
                onClick={() => toggleNodeType("property")}
                isHidden={hiddenNodeTypes.has("property")}
              />
              <LegendDot
                color={getNodeColor("individual")}
                label="Individuals"
                onClick={() => toggleNodeType("individual")}
                isHidden={hiddenNodeTypes.has("individual")}
              />
              <LegendDot
                color={getNodeColor("literal")}
                label="Literals"
                onClick={() => toggleNodeType("literal")}
                isHidden={hiddenNodeTypes.has("literal")}
              />
            </div>
          </div>

          {schemaRelations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">
                Schema Relations ({schemaRelations.length})
                <span className="font-normal">
                  {" "}
                  · RDF/RDFS/OWL · click to toggle
                </span>
              </p>
              <div className="flex flex-wrap gap-3 max-h-28 overflow-y-auto">
                {schemaRelations.map((rel) => (
                  <LegendLine
                    key={rel.uri}
                    color={rel.color}
                    label={rel.label}
                    onClick={() => toggleRelation(rel.uri)}
                    isHidden={hiddenRelations.has(rel.uri)}
                  />
                ))}
              </div>
            </div>
          )}

          {ontologyRelations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">
                Domain Relations ({ontologyRelations.length})
                <span className="font-normal"> · click to toggle</span>
              </p>
              <div className="flex flex-wrap gap-3 max-h-28 overflow-y-auto">
                {ontologyRelations.map((rel) => (
                  <LegendLine
                    key={rel.uri}
                    color={rel.color}
                    label={rel.label}
                    onClick={() => toggleRelation(rel.uri)}
                    isHidden={hiddenRelations.has(rel.uri)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  onClick,
  isHidden,
}: {
  color: string;
  label: string;
  onClick?: () => void;
  isHidden?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={!isHidden}
      className={[
        "flex items-center gap-1.5 text-xs text-slate-600",
        onClick ? "cursor-pointer hover:opacity-70 transition-opacity" : "",
        isHidden ? "opacity-30 line-through" : "",
      ].join(" ")}
      onClick={onClick}
      title={
        onClick ? (isHidden ? `Show ${label}` : `Hide ${label}`) : undefined
      }
    >
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </button>
  );
}

function LegendLine({
  color,
  label,
  onClick,
  isHidden,
}: {
  color: string;
  label: string;
  onClick?: () => void;
  isHidden?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={!isHidden}
      className={[
        "flex items-center gap-1.5 text-xs text-slate-600",
        onClick ? "cursor-pointer hover:opacity-70 transition-opacity" : "",
        isHidden ? "opacity-30 line-through" : "",
      ].join(" ")}
      onClick={onClick}
      title={
        onClick ? (isHidden ? `Show ${label}` : `Hide ${label}`) : undefined
      }
    >
      <span
        className="w-4 h-1 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </button>
  );
}
