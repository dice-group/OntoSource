"use client";

import { useMemo, useState, useRef, useEffect, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { Triple } from "../../store/ontology-store";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import CustomEdge from "./CustomEdge";
import {
  NodeType,
  BoxType,
  getNodeType,
  getBoxType,
  getNodeColor,
  getNodeStyle,
  isSchemaRelation,
  generateColorFromString,
  getSchemaRelationColor,
  getLinkColor,
  hash,
  shortenUri,
  getLayoutedElements,
} from "../../utils/graph-utils";
import createGraphDataQueryOptions from "../../queryOptions/createGraphDataQueryOptions";

// Define edge types for React Flow
const edgeTypes = {
  custom: CustomEdge,
};

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

  // Defer heavy recomputation when sliders/toggles change quickly
  const deferredMaxTriples = useDeferredValue(maxTriplesToDisplay);
  const deferredHiddenRelations = useDeferredValue(hiddenRelations);

  // Build legend data from ALL triples (before any filtering) so it's always available
  const { schemaRelations, ontologyRelations } = useMemo(() => {
    if (!data?.triples?.length)
      return {
        schemaRelations: [],
        ontologyRelations: [],
      };

    const predicateSet = new Set<string>();
    data.triples.forEach((t: Triple) => {
      predicateSet.add(t.p);
    });

    const schemaPredicates: Array<{
      uri: string;
      label: string;
      color: string;
    }> = [];
    const ontologyPredicates: Array<{
      uri: string;
      label: string;
      color: string;
    }> = [];

    predicateSet.forEach((predicate) => {
      const color = isSchemaRelation(predicate)
        ? getSchemaRelationColor(predicate)
        : generateColorFromString(predicate);

      const predicateInfo = {
        uri: predicate,
        label: shortenUri(predicate),
        color: color,
      };

      if (isSchemaRelation(predicate)) {
        schemaPredicates.push(predicateInfo);
      } else {
        ontologyPredicates.push(predicateInfo);
      }
    });

    schemaPredicates.sort((a, b) => a.label.localeCompare(b.label));
    ontologyPredicates.sort((a, b) => a.label.localeCompare(b.label));

    return {
      schemaRelations: schemaPredicates,
      ontologyRelations: ontologyPredicates,
    };
  }, [data?.triples]);

  const {
    nodes: allNodes,
    edges: allEdges,
    triples,
    total,
    filteredTotal,
  } = useMemo(() => {
      if (!data?.triples)
        return {
          nodes: [],
          edges: [],
          triples: [],
          total: 0,
          filteredTotal: 0,
        };

      const allTriples = data.triples;
      const total = data.total;

      if (!allTriples?.length)
        return {
          nodes: [],
          edges: [],
          triples: [],
          total: 0,
          filteredTotal: 0,
        };

      // First pass: build a map of node types from rdf:type declarations (on ALL triples)
      const typeMap = new Map<string, NodeType>();

      allTriples.forEach((t: Triple) => {
        const { s, p, o } = t;
        const pLower = p.toLowerCase();

        // Check if this is a type declaration
        if (
          pLower.includes("rdf-syntax-ns#type") ||
          pLower.endsWith("#type") ||
          pLower.endsWith("/type")
        ) {
          if (typeof o === "string") {
            const oLower = o.toLowerCase();

            // Check for property types
            if (
              oLower.includes("objectproperty") ||
              oLower.includes("datatypeproperty")
            ) {
              typeMap.set(s, "property");
            } else if (
              oLower.includes("annotationproperty") ||
              oLower.includes("functionalproperty")
            ) {
              typeMap.set(s, "property");
            } else if (
              oLower.includes("rdf#property") ||
              oLower.includes("rdfs#property")
            ) {
              typeMap.set(s, "property");
            }
            // Check for class types
            else if (
              oLower.includes("owl#class") ||
              oLower.includes("rdfs#class")
            ) {
              typeMap.set(s, "class");
            } else if (oLower.includes("#class")) {
              typeMap.set(s, "class");
            }
            // If it's a named individual or has some other type, mark as individual
            else if (oLower.includes("namedindividual")) {
              typeMap.set(s, "individual");
            }
          }
        }
      });

      // Second pass: filter triples by TBox/ABox/Literals/hidden types (but NOT by hidden relations yet)
      const filteredTriples: Triple[] = [];

      allTriples.forEach((t: Triple) => {
        const { s, p, o } = t;

        // Determine subject type and box
        const subjectType = typeMap.get(s) || getNodeType(s);
        const subjectBox = getBoxType(subjectType);

        // Determine object type and box
        let objectType: NodeType;
        let objectBox: BoxType;

        if (typeof o === "string") {
          objectType = typeMap.get(o) || getNodeType(o);
          objectBox = getBoxType(objectType);
        } else {
          objectType = "literal";
          objectBox = "literal";
        }

        // Check if this triple should be included based on visibility settings
        let includeTriple = true;

        // Filter based on subject visibility
        if (subjectBox === "tbox" && !showTBox) includeTriple = false;
        if (subjectBox === "abox" && !showABox) includeTriple = false;
        if (subjectBox === "literal" && !showLiterals) includeTriple = false;

        // Filter based on object visibility
        if (objectBox === "tbox" && !showTBox) includeTriple = false;
        if (objectBox === "abox" && !showABox) includeTriple = false;
        if (objectBox === "literal" && !showLiterals) includeTriple = false;

        // Filter based on hidden node types
        if (hiddenNodeTypes.has(subjectType) || hiddenNodeTypes.has(objectType))
          includeTriple = false;

        if (includeTriple) {
          filteredTriples.push(t);
        }
      });

      // Now limit the filtered triples based on maxTriplesToDisplay
      const triples =
        maxTriplesToDisplay > 0 && maxTriplesToDisplay < filteredTriples.length
          ? filteredTriples.slice(0, maxTriplesToDisplay)
          : filteredTriples;

      const nodeMap = new Map();
      const edgesAcc: any[] = [];

      // Build color map for predicates
      const propertyColorMap = new Map<string, string>();

      triples.forEach((t: Triple) => {
        const color = isSchemaRelation(t.p)
          ? getSchemaRelationColor(t.p)
          : generateColorFromString(t.p);
        propertyColorMap.set(t.p, color);
      });

      // First, collect ALL nodes from triples (regardless of relation filtering)
      triples.forEach((t: Triple, i: number) => {
        const { s, p, o } = t;

        if (!nodeMap.has(s)) {
          // Use type from typeMap if available, otherwise infer from URI
          const nt = typeMap.get(s) || getNodeType(s);
          const bt = getBoxType(nt);
          nodeMap.set(s, {
            id: s,
            label: shortenUri(s),
            type: nt,
            boxType: bt,
            color: getNodeColor(nt),
          });
        }

        let objectId: string;
        let objectLabel: string;
        let objectType: NodeType;
        let objectBoxType: BoxType;

        if (typeof o === "string") {
          objectId = o;
          objectLabel = shortenUri(o);
          // Use type from typeMap if available, otherwise infer from URI
          objectType = typeMap.get(o) || getNodeType(o);
          objectBoxType = getBoxType(objectType);
        } else {
          objectId = `lit_${hash(o.value)}_${i}`;
          objectLabel =
            o.value.length > 30 ? o.value.slice(0, 30) + "…" : o.value;
          objectType = "literal";
          objectBoxType = "literal";
        }

        if (!nodeMap.has(objectId)) {
          nodeMap.set(objectId, {
            id: objectId,
            label: objectLabel,
            type: objectType,
            boxType: objectBoxType,
            color: getNodeColor(objectType),
          });
        }
      });

      // Now collect edges, filtering by hidden relations
      // First, build a map to detect bidirectional edges
      const edgeMap = new Map<string, { 
        source: string; 
        target: string; 
        predicate: string; 
        index: number;
        objectId: string;
      }>();
      const bidirectionalEdges = new Set<string>();

      triples.forEach((t: Triple, i: number) => {
        const { s, p, o } = t;

        let objectId: string;
        if (typeof o === "string") {
          objectId = o;
        } else {
          objectId = `lit_${hash(o.value)}_${i}`;
        }

        // Create edge keys for both directions
        const forwardKey = `${s}|${p}|${objectId}`;
        const reverseKey = `${objectId}|${p}|${s}`;

        // Check if reverse edge already exists
        if (edgeMap.has(reverseKey)) {
          // Mark both as bidirectional
          bidirectionalEdges.add(forwardKey);
          bidirectionalEdges.add(reverseKey);
        }

        edgeMap.set(forwardKey, { source: s, target: objectId, predicate: p, index: i, objectId });
      });

      // Now create edges, skipping the reverse direction of bidirectional edges
      const processedBidirectional = new Set<string>();

      edgeMap.forEach((edgeInfo, edgeKey) => {
        const { source, target, predicate, index, objectId } = edgeInfo;
        const reverseKey = `${target}|${predicate}|${source}`;

        // If this is bidirectional and we've already processed its reverse, skip it
        if (bidirectionalEdges.has(edgeKey) && processedBidirectional.has(reverseKey)) {
          return;
        }

        const edgeColor = getLinkColor(predicate, propertyColorMap);
        const isBidirectional = bidirectionalEdges.has(edgeKey);

        edgesAcc.push({
          id: `e_${hash(edgeKey)}_${index}`,
          source: source,
          target: objectId,
          label: shortenUri(predicate),
          type: "custom",
          style: { strokeWidth: 2, stroke: edgeColor },
          labelStyle: { fontSize: 12, fill: "#334155", fontWeight: 500 },
          markerEnd: { type: "arrowclosed", color: edgeColor },
          markerStart: isBidirectional ? { type: "arrowclosed", color: edgeColor } : undefined,
          data: { predicate: predicate, isBidirectional }, // Store the predicate for filtering
        });

        // Mark as processed if bidirectional
        if (isBidirectional) {
          processedBidirectional.add(edgeKey);
        }
      });

      // Filter nodes based on TBox/ABox visibility settings and hidden node types
      const filteredNodes = Array.from(nodeMap.values()).filter((n: any) => {
        if (n.boxType === "tbox" && !showTBox) return false;
        if (n.boxType === "abox" && !showABox) return false;
        if (n.boxType === "literal" && !showLiterals) return false;
        if (hiddenNodeTypes.has(n.type)) return false;
        return true;
      });

      const filteredNodeIds = new Set(filteredNodes.map((n: any) => n.id));

      // Filter edges to only show connections between visible nodes (hidden-relations applied downstream)
      const filteredEdges = edgesAcc.filter((e: any) => {
        if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target))
          return false;
        return true;
      });

      const rfNodes = filteredNodes.map((n: any, idx: number) => ({
        id: n.id,
        position: { x: 0, y: 0 }, // Will be set by dagre layout
        data: {
          label: `${n.label} (${n.type})`,
          boxType: n.boxType,
        },
        style: getNodeStyle(n.type, n.boxType),
      }));

      // Apply dagre layout for automatic positioning
      const layouted = getLayoutedElements(
        rfNodes,
        filteredEdges,
        layoutDirection,
      );
      return {
        ...layouted,
        triples,
        total,
        filteredTotal: filteredTriples.length, // Total after filtering but before limiting
      };
    }, [
      data?.triples,
      data?.total,
      layoutDirection,
      showTBox,
      showABox,
      showLiterals,
      hiddenNodeTypes,
      deferredMaxTriples,
    ]);

  // Stage 2: cheap pass that hides edges per current relation filter.
  // Uses deferredHiddenRelations so rapid toggles don't block input.
  const { nodes, edges, visibleTripleCount } = useMemo(() => {
    if (!deferredHiddenRelations.size) {
      return {
        nodes: allNodes,
        edges: allEdges,
        visibleTripleCount: allEdges.length,
      };
    }
    const visibleEdges = allEdges.filter(
      (e: any) => !deferredHiddenRelations.has(e.data?.predicate),
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
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold mb-1">No ontology selected</p>
          <p className="text-slate-400 text-sm">Select an ontology from the list to visualize its knowledge graph</p>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#3B78B8]" />
          <p className="text-slate-700 font-semibold">Loading knowledge graph…</p>
          <p className="text-slate-400 text-sm">Preparing visualization data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-semibold text-sm mb-1">Error loading graph</p>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Determine if we have any data at all
  const hasData = data && data.triples && data.triples.length > 0;
  const hasVisibleTriples = triples.length > 0;

  const toggleBtnBase = "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors";
  const toggleActive = "bg-[#3B78B8] text-white";
  const toggleInactive = "bg-slate-100 text-slate-600 hover:bg-slate-200";

  return (
    <div
      ref={containerRef}
      className={[
        "bg-white border border-slate-200 shadow-sm flex flex-col transition-all duration-300",
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
            <p className="text-sm font-semibold text-slate-900">Knowledge Graph</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {nodes.length} nodes · {edges.length} edges
              {total > 0 && ` · ${triples.length}/${filteredTotal} triples shown`}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={[toggleBtnBase, showLegend ? toggleActive : toggleInactive].join(" ")}
              title={showLegend ? "Hide legend" : "Show legend"}
            >
              Legend
            </button>
            <button
              onClick={toggleFullscreen}
              className={[toggleBtnBase, isFullscreen ? toggleActive : toggleInactive].join(" ")}
              title={isFullscreen ? "Exit fullscreen (ESC)" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 15v4.5M9 15H4.5M15 9h4.5M15 9V4.5M15 15h4.5M15 15v4.5" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Triple limit */}
        <div className="flex items-center gap-3">
          <label htmlFor="triple-limit" className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Triples:
          </label>
          <input
            id="triple-limit"
            type="range"
            min="100"
            max={filteredTotal || 100}
            step="100"
            value={Math.min(maxTriplesToDisplay, filteredTotal || 100)}
            onChange={(e) => setMaxTriplesToDisplay(Number(e.target.value))}
            className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#3B78B8]"
          />
          <input
            type="number"
            min="1"
            step="1"
            value={maxTriplesToDisplay}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!isNaN(v) && v > 0) setMaxTriplesToDisplay(v);
            }}
            className="w-20 px-2 py-1 text-xs text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3B78B8]/20 focus:border-[#3B78B8]"
          />
          <span className="text-xs text-slate-400 whitespace-nowrap">/ {filteredTotal || 0}</span>
        </div>

        {/* Row 3: Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Layout:</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-200">
              {(["TB", "LR"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setLayoutDirection(dir)}
                  className={[
                    "px-3 py-1 text-xs font-medium transition-colors",
                    layoutDirection === dir ? "bg-[#3B78B8] text-white" : "bg-white text-slate-600 hover:bg-slate-50",
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
              onClick={() => setShowTBox(!showTBox)}
              className={[toggleBtnBase, showTBox ? "bg-[#3B78B8] text-white" : toggleInactive].join(" ")}
              title="TBox: Classes and Properties"
            >
              TBox
            </button>
            <button
              onClick={() => setShowABox(!showABox)}
              className={[toggleBtnBase, showABox ? "bg-amber-500 text-white" : toggleInactive].join(" ")}
              title="ABox: Individuals"
            >
              ABox
            </button>
            <button
              onClick={() => setShowLiterals(!showLiterals)}
              className={[toggleBtnBase, showLiterals ? "bg-rose-500 text-white" : toggleInactive].join(" ")}
              title="Literal values"
            >
              Literals
            </button>
          </div>
        </div>
      </div>

      {/* Graph canvas */}
      <div
        className={[
          "flex-1",
          isFullscreen ? "min-h-0" : "min-h-[500px]",
        ].join(" ")}
        style={{ width: width ?? "100%" }}
      >
        {!hasData ? (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <p className="text-slate-500 text-sm">No triples available in this ontology</p>
          </div>
        ) : !hasVisibleTriples ? (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <p className="text-slate-600 text-sm font-medium mb-1">No triples visible</p>
              <p className="text-slate-400 text-xs">Try adjusting the TBox / ABox / Literal filters or the legend</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            edgeTypes={edgeTypes}
            fitView
            onInit={(instance) => setTimeout(() => instance.fitView({ padding: 0.2 }), 50)}
            proOptions={{ hideAttribution: true }}
            minZoom={0.01}
            maxZoom={5}
            nodesConnectable={false}
            elementsSelectable={true}
            panOnDrag={true}
            zoomOnScroll={true}
            preventScrolling={true}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#CBD5E1" />
            <Controls />
          </ReactFlow>
        )}
      </div>

      {/* Legend */}
      <div
        className={[
          "border-t border-slate-100 bg-slate-50 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          showLegend ? "max-h-[480px] opacity-100 p-4" : "max-h-0 opacity-0 p-0",
        ].join(" ")}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Legend</p>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Knowledge Types</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "TBox (Schema)", color: "bg-blue-500", border: "border-2 border-slate-800" },
                { label: "ABox (Instances)", color: "bg-amber-500", border: "border-2 border-dashed border-slate-800" },
                { label: "Literals", color: "bg-rose-500", border: "border border-dotted border-slate-800" },
              ].map(({ label, color, border }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className={`w-8 h-4 rounded ${color} ${border}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Node Types <span className="font-normal">(click to toggle)</span></p>
            <div className="flex flex-wrap gap-3">
              <LegendDot color="#3b82f6" label="Classes" onClick={() => toggleNodeType("class")} isHidden={hiddenNodeTypes.has("class")} />
              <LegendDot color="#10b981" label="Properties" onClick={() => toggleNodeType("property")} isHidden={hiddenNodeTypes.has("property")} />
              <LegendDot color="#f59e0b" label="Individuals" onClick={() => toggleNodeType("individual")} isHidden={hiddenNodeTypes.has("individual")} />
              <LegendDot color="#ef4444" label="Literals" onClick={() => toggleNodeType("literal")} isHidden={hiddenNodeTypes.has("literal")} />
            </div>
          </div>

          {schemaRelations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">
                Schema Relations ({schemaRelations.length})
                <span className="font-normal"> · RDF/RDFS/OWL · click to toggle</span>
              </p>
              <div className="flex flex-wrap gap-3 max-h-28 overflow-y-auto">
                {schemaRelations.map((rel) => (
                  <LegendLine key={rel.uri} color={rel.color} label={rel.label} onClick={() => toggleRelation(rel.uri)} isHidden={hiddenRelations.has(rel.uri)} />
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
                  <LegendLine key={rel.uri} color={rel.color} label={rel.label} onClick={() => toggleRelation(rel.uri)} isHidden={hiddenRelations.has(rel.uri)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, onClick, isHidden }: { color: string; label: string; onClick?: () => void; isHidden?: boolean }) {
  return (
    <div
      className={["flex items-center gap-1.5 text-xs text-slate-600", onClick ? "cursor-pointer hover:opacity-70 transition-opacity" : "", isHidden ? "opacity-30 line-through" : ""].join(" ")}
      onClick={onClick}
      title={onClick ? (isHidden ? `Show ${label}` : `Hide ${label}`) : undefined}
    >
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function LegendLine({ color, label, onClick, isHidden }: { color: string; label: string; onClick?: () => void; isHidden?: boolean }) {
  return (
    <div
      className={["flex items-center gap-1.5 text-xs text-slate-600", onClick ? "cursor-pointer hover:opacity-70 transition-opacity" : "", isHidden ? "opacity-30 line-through" : ""].join(" ")}
      onClick={onClick}
      title={onClick ? (isHidden ? `Show ${label}` : `Hide ${label}`) : undefined}
    >
      <div className="w-4 h-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
