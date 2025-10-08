import { Node, Edge } from "@xyflow/react";
import dagre from "dagre";

export type NodeType = "class" | "property" | "individual" | "literal";
export type BoxType = "tbox" | "abox" | "literal";

export function getNodeType(uri: string): NodeType {
  const lower = uri.toLowerCase();

  // Check for literal values (non-URIs)
  if (!uri.startsWith("http") && !uri.startsWith("_:")) return "literal";

  // Check for blank nodes
  if (uri.startsWith("_:")) return "individual";

  // Check for OWL/RDFS Classes
  if (lower.includes("owl#class") || lower.includes("rdfs#class"))
    return "class";
  if (lower.includes("#class") && !lower.includes("property")) return "class";
  if (lower.includes("/class") && !lower.includes("property")) return "class";

  // Check for OWL/RDF/RDFS Properties
  if (
    lower.includes("owl#objectproperty") ||
    lower.includes("owl#datatypeproperty")
  )
    return "property";
  if (
    lower.includes("owl#annotationproperty") ||
    lower.includes("rdf#property")
  )
    return "property";
  if (lower.includes("rdfs#property")) return "property";
  if (lower.includes("#property") || lower.includes("/property"))
    return "property";

  // Check for common OWL/RDFS resources that are properties
  if (lower.includes("rdfs#subclassof") || lower.includes("rdfs#subpropertyof"))
    return "property";
  if (lower.includes("rdfs#domain") || lower.includes("rdfs#range"))
    return "property";
  if (lower.includes("rdfs#label") || lower.includes("rdfs#comment"))
    return "property";
  if (lower.includes("owl#equivalentclass") || lower.includes("owl#sameas"))
    return "property";

  // Default to individual for other URIs
  return "individual";
}

export function getBoxType(nodeType: NodeType): BoxType {
  // TBox: Classes and Properties (schema/terminology)
  if (nodeType === "class" || nodeType === "property") return "tbox";
  // ABox: Individuals (assertions/instances)
  if (nodeType === "individual") return "abox";
  // Literals are data values
  return "literal";
}

export function getNodeColor(type: NodeType): string {
  switch (type) {
    case "class":
      return "#3b82f6";
    case "property":
      return "#10b981";
    case "individual":
      return "#f59e0b";
    case "literal":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

export function getNodeStyle(type: NodeType, boxType: BoxType) {
  const baseStyle = {
    background: getNodeColor(type),
    color: "white",
    borderRadius: 10,
    padding: "6px 10px",
    fontSize: 12,
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    maxWidth: 240,
  };

  // Different border styles for TBox vs ABox
  if (boxType === "tbox") {
    return {
      ...baseStyle,
      border: "2px solid rgba(0,0,0,0.3)",
      fontWeight: 600,
    };
  } else if (boxType === "abox") {
    return {
      ...baseStyle,
      border: "2px dashed rgba(0,0,0,0.3)",
      fontWeight: 400,
    };
  } else {
    return {
      ...baseStyle,
      border: "1px dotted rgba(0,0,0,0.2)",
      fontStyle: "italic",
    };
  }
}

// Check if a predicate is a schema relation (from W3C specifications)
export function isSchemaRelation(predicate: string): boolean {
  const lower = predicate.toLowerCase();
  return (
    lower.includes("w3.org/1999/02/22-rdf-syntax-ns#") ||
    lower.includes("w3.org/2000/01/rdf-schema#") ||
    lower.includes("w3.org/2002/07/owl#") ||
    lower.includes("w3.org/2001/xmlschema#") ||
    lower.includes("w3.org/ns/") ||
    lower.includes("xmlns.com/foaf")
  );
}

// Generate a consistent color for a string using HSL
export function generateColorFromString(
  str: string,
  saturation = 70,
  lightness = 50,
): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Get predefined color for common schema relations
export function getSchemaRelationColor(predicate: string): string {
  const lower = predicate.toLowerCase();
  if (lower.includes("type")) return "#8b5cf6";
  if (lower.includes("subclassof")) return "#3b82f6";
  if (lower.includes("subpropertyof")) return "#2563eb";
  if (lower.includes("sameas")) return "#f97316";
  if (lower.includes("equivalentclass")) return "#10b981";
  if (lower.includes("equivalentproperty")) return "#059669";
  if (lower.includes("domain")) return "#f59e0b";
  if (lower.includes("range")) return "#d97706";
  if (lower.includes("inverseof")) return "#ec4899";
  if (lower.includes("disjointwith")) return "#ef4444";
  if (lower.includes("label")) return "#6366f1";
  if (lower.includes("comment")) return "#8b5cf6";
  return "#64748b"; // Default for other schema relations
}

export function getLinkColor(
  predicate: string,
  propertyColorMap?: Map<string, string>,
): string {
  // Check if it's a schema relation first
  if (isSchemaRelation(predicate)) {
    return getSchemaRelationColor(predicate);
  }

  // Otherwise, use the generated color from the property color map
  if (propertyColorMap && propertyColorMap.has(predicate)) {
    return propertyColorMap.get(predicate)!;
  }

  // Fallback: generate a color on the fly
  return generateColorFromString(predicate);
}

export function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export function shortenUri(uri: string): string {
  return uri.split("#").pop() || uri.split("/").pop() || uri;
}

// Helper function to create unique edge path identifiers
function getEdgePathKey(source: string, target: string): string {
  return `${source}__${target}`;
}

// Layout configuration
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "TB",
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 50;

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 150,
    nodesep: 100,
    edgesep: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  // Group edges by their source-target pairs to detect parallel edges
  const edgeGroups = new Map<string, Edge[]>();
  edges.forEach((edge) => {
    const pathKey = getEdgePathKey(edge.source, edge.target);
    if (!edgeGroups.has(pathKey)) {
      edgeGroups.set(pathKey, []);
    }
    edgeGroups.get(pathKey)!.push(edge);
  });

  // Calculate curve offsets for parallel edges
  const layoutedEdges = edges.map((edge) => {
    const pathKey = getEdgePathKey(edge.source, edge.target);
    const parallelEdges = edgeGroups.get(pathKey) || [];

    // If there's only one edge between these nodes, no offset needed
    if (parallelEdges.length === 1) {
      return {
        ...edge,
        data: {
          ...edge.data,
          offset: 0,
        },
      };
    }

    // For multiple edges between same nodes, calculate offset
    const edgeIndex = parallelEdges.indexOf(edge);
    const totalEdges = parallelEdges.length;

    // Calculate offset: center the group of edges around 0
    const offset = (edgeIndex - (totalEdges - 1) / 2) * 50;

    return {
      ...edge,
      data: {
        ...edge.data,
        offset,
      },
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
};
