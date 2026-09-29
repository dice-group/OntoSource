import type { Triple } from "../store/ontology-store";
import type { Edge } from "@xyflow/react";

export type NodeType = "class" | "property" | "individual" | "literal";
export type BoxType = "tbox" | "abox" | "literal";

export function getNodeType(uri: string): NodeType {
  const lower = uri.toLowerCase();

  // Check for literal values (non-URIs)
  if (!/^[a-z][a-z0-9+.-]*:/i.test(uri) && !uri.startsWith("_:")) return "literal";

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
      return "#3a78b8";
    case "property":
      return "#6c5fa8";
    case "individual":
      return "#93651f";
    case "literal":
      return "#a34965";
    default:
      return "#6b7280";
  }
}

export function getNodeStyle(type: NodeType, boxType: BoxType) {
  const baseStyle = {
    background: getNodeColor(type),
    color: "white",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12,
    boxShadow: "none",
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
  if (lower.includes("subclassof")) return "#3a78b8";
  if (lower.includes("subpropertyof")) return "#2563eb";
  if (lower.includes("sameas")) return "#f97316";
  if (lower.includes("equivalentclass")) return "#6c5fa8";
  if (lower.includes("equivalentproperty")) return "#059669";
  if (lower.includes("domain")) return "#93651f";
  if (lower.includes("range")) return "#d97706";
  if (lower.includes("inverseof")) return "#ec4899";
  if (lower.includes("disjointwith")) return "#a34965";
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
  return uri.split(/[\/#]/).filter(Boolean).pop() || uri;
}

export type GraphEdge = Edge<{ predicate: string; isBidirectional: boolean; offset?: number; triples?: Triple[] }>;
