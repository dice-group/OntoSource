"use client";

import { useMemo, useState, useRef, useEffect } from "react";
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

  const { nodes, edges, visibleTripleCount, triples, total, filteredTotal } =
    useMemo(() => {
      if (!data?.triples)
        return {
          nodes: [],
          edges: [],
          visibleTripleCount: 0,
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
          visibleTripleCount: 0,
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

      // Second pass: filter triples by TBox/ABox/Literals/hidden types/hidden relations before limiting
      const filteredTriples: Triple[] = [];

      allTriples.forEach((t: Triple) => {
        const { s, p, o } = t;

        // Filter by hidden relations first
        if (hiddenRelations.has(p)) return;

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

        // Only render a subset of edges for performance
        const edgeColor = getLinkColor(p, propertyColorMap);
        edgesAcc.push({
          id: `e_${hash(`${s}|${p}|${objectId}`)}_${i}`,
          source: s,
          target: objectId,
          label: shortenUri(p),
          type: "custom",
          style: { strokeWidth: 2, stroke: edgeColor },
          labelStyle: { fontSize: 12, fill: "#334155", fontWeight: 500 },
          markerEnd: { type: "arrowclosed", color: edgeColor },
          data: { predicate: p }, // Store the predicate for filtering
        });
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

      // Filter edges to only show connections between visible nodes and visible relations
      const filteredEdges = edgesAcc.filter((e: any) => {
        // Check if both nodes are visible
        if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target))
          return false;
        // Check if relation is not hidden
        if (e.data?.predicate && hiddenRelations.has(e.data.predicate))
          return false;
        return true;
      });

      // Count visible triples: triples where both subject and object nodes are visible and relation is not hidden
      let visibleCount = 0;
      triples.forEach((t: Triple, i: number) => {
        const { s, p, o } = t;
        let objectId: string;
        if (typeof o === "string") {
          objectId = o;
        } else {
          objectId = `lit_${hash(o.value)}_${i}`;
        }

        // Check if both subject and object are in the visible node set and relation is not hidden
        if (
          filteredNodeIds.has(s) &&
          filteredNodeIds.has(objectId) &&
          !hiddenRelations.has(p)
        ) {
          visibleCount++;
        }
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
        visibleTripleCount: visibleCount,
        triples,
        total,
        filteredTotal: filteredTriples.length, // Total after filtering but before limiting
      };
    }, [
      data,
      layoutDirection,
      showTBox,
      showABox,
      showLiterals,
      hiddenNodeTypes,
      hiddenRelations,
      maxTriplesToDisplay,
    ]);

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
      <div className="min-h-full bg-white rounded-lg border shadow-sm p-8 flex items-center justify-center ">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-3"
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
          <div className="text-gray-600 font-medium">No ontology selected</div>
          <p className="text-gray-500 text-sm mt-1">
            Please select an ontology from the list to visualize its knowledge
            graph
          </p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isPending) {
    return (
      <div className="min-h-full bg-white rounded-lg border shadow-sm p-8 flex items-center justify-center ">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
          <div className="text-gray-600 font-medium">
            Loading knowledge graph...
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Preparing visualization data
          </p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8">
        <div className="text-red-600">
          <h3 className="font-semibold mb-2">Error loading graph</h3>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Determine if we have any data at all
  const hasData = data && data.triples && data.triples.length > 0;
  const hasVisibleTriples = triples.length > 0;

  return (
    <div 
      ref={containerRef}
      className={`bg-white rounded-lg border shadow-sm flex flex-col transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'h-screen'
      }`}
    >
      <div className="p-4 border-b space-y-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">Knowledge Graph</h3>
            <p className="text-sm text-gray-500">
              Showing {nodes.length} nodes and {edges.length} relationships
              {total > 0 &&
                ` (displaying ${triples.length} of ${filteredTotal} filtered triples, ${total} total)`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Legend Toggle Button */}
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="group relative p-2.5 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 hover:border-purple-300 transition-all duration-200 hover:shadow-md active:scale-95"
              title={showLegend ? "Hide legend" : "Show legend"}
            >
              <div className="relative w-5 h-5">
                {/* Eye icon (show) */}
                <svg
                  className={`absolute inset-0 w-5 h-5 text-purple-600 transition-all duration-300 ${
                    showLegend ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {/* Eye-off icon (hide) */}
                <svg
                  className={`absolute inset-0 w-5 h-5 text-purple-600 transition-all duration-300 ${
                    showLegend ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3l18 18"
                  />
                </svg>
              </div>
              
              {/* Tooltip */}
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                {showLegend ? 'Hide legend' : 'Show legend'}
              </span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="group relative p-2.5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md active:scale-95"
              title={isFullscreen ? "Exit fullscreen (ESC)" : "Enter fullscreen"}
            >
              <div className="relative w-5 h-5">
                {/* Animated icon */}
                <svg
                  className={`absolute inset-0 w-5 h-5 text-blue-600 transition-all duration-300 ${
                    isFullscreen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {/* Expand icon */}
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
                <svg
                  className={`absolute inset-0 w-5 h-5 text-blue-600 transition-all duration-300 ${
                    isFullscreen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {/* Compress icon */}
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                  />
                </svg>
              </div>
              
              {/* Tooltip */}
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </span>
            </button>
          </div>
        </div>

        {/* Triple display limit control */}
        <div className="flex items-center gap-4">
          <label
            htmlFor="triple-limit"
            className="text-sm font-medium text-gray-700 whitespace-nowrap"
          >
            Max triples to display:
          </label>
          <input
            id="triple-limit"
            type="range"
            min="100"
            max={filteredTotal || 1000}
            step="100"
            value={Math.min(maxTriplesToDisplay, filteredTotal || 1000)}
            onChange={(e) => setMaxTriplesToDisplay(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <input
            type="number"
            min="100"
            max={filteredTotal || 1000}
            step="100"
            value={maxTriplesToDisplay}
            onChange={(e) => {
              const maxValue = filteredTotal || 1000;
              const newValue = Math.min(
                Math.max(100, Number(e.target.value)),
                maxValue,
              );
              setMaxTriplesToDisplay(newValue);
            }}
            className="w-24 px-2 py-1 text-sm text-gray-900 font-semibold border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-xs text-gray-600 whitespace-nowrap">
            of {filteredTotal || 0} available
          </span>
        </div>

        {/* Layout direction control */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Layout:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLayoutDirection("TB")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                layoutDirection === "TB"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Top-Bottom
            </button>
            <button
              onClick={() => setLayoutDirection("LR")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                layoutDirection === "LR"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Left-Right
            </button>
          </div>
        </div>

        {/* TBox/ABox filter controls */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Show:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTBox(!showTBox)}
              className={`px-3 py-1 text-sm rounded-md transition-colors border-2 ${
                showTBox
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
              }`}
              title="TBox: Classes and Properties (schema)"
            >
              TBox (Schema)
            </button>
            <button
              onClick={() => setShowABox(!showABox)}
              className={`px-3 py-1 text-sm rounded-md transition-colors border-2 border-dashed ${
                showABox
                  ? "bg-orange-600 text-white border-orange-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
              }`}
              title="ABox: Individuals (instances)"
            >
              ABox (Instances)
            </button>
            <button
              onClick={() => setShowLiterals(!showLiterals)}
              className={`px-3 py-1 text-sm rounded-md transition-colors border border-dotted ${
                showLiterals
                  ? "bg-red-600 text-white border-red-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
              }`}
              title="Literal values"
            >
              Literals
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0" style={{ width: width ?? "100%" }}>
        {!hasData ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-gray-600">
              No triples available in this ontology
            </div>
          </div>
        ) : !hasVisibleTriples ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-600 mb-2">
                No triples visible with current filters
              </div>
              <div className="text-sm text-gray-500">
                Try adjusting TBox/ABox/Literal visibility or unhiding node
                types/relations in the legend below
              </div>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            edgeTypes={edgeTypes}
            fitView
            onInit={(instance) => {
              setTimeout(() => instance.fitView({ padding: 0.2 }), 50);
            }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            panOnDrag={true}
            zoomOnScroll={true}
            preventScrolling={true}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
          </ReactFlow>
        )}
      </div>

      {/* Legend Section */}
      <div 
        className={`border-t bg-gray-50 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          showLegend ? 'max-h-[500px] opacity-100 p-4' : 'max-h-0 opacity-0 p-0'
        }`}
      >
        <div className={`transition-all duration-300 ${showLegend ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>

          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Knowledge Types
            </h5>
            <div className="flex flex-wrap gap-4 text-xs text-gray-700">
              <div className="flex items-center space-x-1">
                <div className="w-12 h-6 bg-blue-500 rounded border-2 border-black flex items-center justify-center text-white text-[10px] font-semibold">
                  TB
                </div>
                <span>TBox (Schema: Classes & Properties)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-12 h-6 bg-orange-500 rounded border-2 border-dashed border-black flex items-center justify-center text-white text-[10px]">
                  AB
                </div>
                <span>ABox (Instances: Individuals)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-12 h-6 bg-red-500 rounded border border-dotted border-black flex items-center justify-center text-white text-[10px] italic">
                  Lit
                </div>
                <span>Literals (Data values)</span>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              Node Types (click to hide/show)
            </h5>
            <div className="flex flex-wrap gap-4 text-xs text-gray-700">
              <LegendDot
                color="#3b82f6"
                label="Classes"
                onClick={() => toggleNodeType("class")}
                isHidden={hiddenNodeTypes.has("class")}
              />
              <LegendDot
                color="#10b981"
                label="Properties"
                onClick={() => toggleNodeType("property")}
                isHidden={hiddenNodeTypes.has("property")}
              />
              <LegendDot
                color="#f59e0b"
                label="Individuals"
                onClick={() => toggleNodeType("individual")}
                isHidden={hiddenNodeTypes.has("individual")}
              />
              <LegendDot
                color="#ef4444"
                label="Literals"
                onClick={() => toggleNodeType("literal")}
                isHidden={hiddenNodeTypes.has("literal")}
              />
            </div>
          </div>

          {schemaRelations.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-700 mb-1">
                Schema Relations ({schemaRelations.length})
                <span className="ml-1 text-gray-500 font-normal">
                  (RDF/RDFS/OWL - click to hide/show)
                </span>
              </h5>
              <div className="flex flex-wrap gap-3 text-xs text-gray-700 max-h-32 overflow-y-auto">
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
              <h5 className="text-xs font-medium text-gray-700 mb-1">
                Ontology Relations ({ontologyRelations.length})
                <span className="ml-1 text-gray-500 font-normal">
                  (Domain-specific - click to hide/show)
                </span>
              </h5>
              <div className="flex flex-wrap gap-3 text-xs text-gray-700 max-h-32 overflow-y-auto">
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
    <div
      className={`flex items-center space-x-1 ${onClick ? "cursor-pointer hover:opacity-75 transition-opacity" : ""} ${isHidden ? "opacity-30 line-through" : ""}`}
      onClick={onClick}
      title={
        onClick
          ? isHidden
            ? `Click to show ${label}`
            : `Click to hide ${label}`
          : undefined
      }
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
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
    <div
      className={`flex items-center space-x-1 ${onClick ? "cursor-pointer hover:opacity-75 transition-opacity" : ""} ${isHidden ? "opacity-30 line-through" : ""}`}
      onClick={onClick}
      title={
        onClick
          ? isHidden
            ? `Click to show ${label}`
            : `Click to hide ${label}`
          : undefined
      }
    >
      <div
        className="w-4 h-1 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}
