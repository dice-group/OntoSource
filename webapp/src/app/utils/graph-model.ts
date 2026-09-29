import type { Node, MarkerType } from "@xyflow/react";
import type { Triple } from "../store/ontology-store";
import {
  type NodeType,
  type BoxType,
  type GraphEdge,
  getNodeType,
  getBoxType,
  getNodeStyle,
  isSchemaRelation,
  getLinkColor,
  hash,
  shortenUri,
} from "./graph-utils";

export type GraphSettings = {
  maxTriples: number;
  direction: "TB" | "LR";
  showTBox: boolean;
  showABox: boolean;
  showLiterals: boolean;
  hiddenNodeTypes: NodeType[];
  nodeTypes?: Record<string, NodeType>;
};
export type GraphRelation = { uri: string; label: string; color: string };
export type GraphResult = {
  nodes: Node[];
  edges: GraphEdge[];
  displayedCount: number;
  filteredTotal: number;
  schemaRelations: GraphRelation[];
  ontologyRelations: GraphRelation[];
};

export function indexGraph(allTriples: Triple[]) {
  const typeMap = new Map<string, NodeType>();

  allTriples.forEach((t: Triple) => {
    const { s, p, o } = t;
    const pLower = p.toLowerCase();

    if (
      pLower.includes("rdf-syntax-ns#type") ||
      pLower.endsWith("#type") ||
      pLower.endsWith("/type")
    ) {
      if (typeof o === "string") {
        const oLower = o.toLowerCase();

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
        } else if (
          oLower.includes("owl#class") ||
          oLower.includes("rdfs#class")
        ) {
          typeMap.set(s, "class");
        } else if (oLower.includes("#class")) {
          typeMap.set(s, "class");
        } else if (oLower.includes("namedindividual")) {
          typeMap.set(s, "individual");
        }
      }
    }
  });

  const predicates = [...new Set(allTriples.map((t) => t.p))];
  const relations = predicates
    .map((uri) => ({ uri, label: shortenUri(uri), color: getLinkColor(uri) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return {
    triples: allTriples,
    typeMap,
    colors: new Map(
      relations.map((relation) => [relation.uri, relation.color]),
    ),
    schemaRelations: relations.filter((r) => isSchemaRelation(r.uri)),
    ontologyRelations: relations.filter((r) => !isSchemaRelation(r.uri)),
  };
}

export function buildGraph(
  index: ReturnType<typeof indexGraph>,
  settings: GraphSettings,
): GraphResult {
  const { colors } = index;
  const typeMap = settings.nodeTypes
    ? new Map([...index.typeMap, ...Object.entries(settings.nodeTypes)])
    : index.typeMap;
  const { showTBox, showABox, showLiterals } = settings;
  const hiddenNodeTypes = new Set(settings.hiddenNodeTypes);
  const limit = Math.max(1, Math.floor(settings.maxTriples));
  const triples: Triple[] = [];
  let filteredTotal = 0;

  index.triples.forEach((t: Triple) => {
    const { s, o } = t;

    const subjectType = typeMap.get(s) || getNodeType(s);
    const subjectBox = getBoxType(subjectType);

    let objectType: NodeType;
    let objectBox: BoxType;

    if (typeof o === "string") {
      objectType = typeMap.get(o) || getNodeType(o);
      objectBox = getBoxType(objectType);
    } else {
      objectType = "literal";
      objectBox = "literal";
    }

    let includeTriple = true;

    if (subjectBox === "tbox" && !showTBox) includeTriple = false;
    if (subjectBox === "abox" && !showABox) includeTriple = false;
    if (subjectBox === "literal" && !showLiterals) includeTriple = false;

    if (objectBox === "tbox" && !showTBox) includeTriple = false;
    if (objectBox === "abox" && !showABox) includeTriple = false;
    if (objectBox === "literal" && !showLiterals) includeTriple = false;

    if (hiddenNodeTypes.has(subjectType) || hiddenNodeTypes.has(objectType))
      includeTriple = false;

    if (includeTriple) {
      filteredTotal++;
      if (triples.length < limit) triples.push(t);
    }
  });

  const nodeMap = new Map<
    string,
    { id: string; label: string; type: NodeType; boxType: BoxType }
  >();
  const edgesAcc: GraphEdge[] = [];

  triples.forEach((t: Triple, i: number) => {
    const { s, o } = t;

    if (!nodeMap.has(s)) {
      const nt = typeMap.get(s) || getNodeType(s);
      const bt = getBoxType(nt);
      nodeMap.set(s, {
        id: s,
        label: shortenUri(s),
        type: nt,
        boxType: bt,
      });
    }

    let objectId: string;
    let objectLabel: string;
    let objectType: NodeType;
    let objectBoxType: BoxType;

    if (typeof o === "string") {
      objectId = o;
      objectLabel = shortenUri(o);
      objectType = typeMap.get(o) || getNodeType(o);
      objectBoxType = getBoxType(objectType);
    } else {
      objectId = `lit_${hash(o.value)}_${i}`;
      objectLabel = o.value.length > 30 ? o.value.slice(0, 30) + "…" : o.value;
      objectType = "literal";
      objectBoxType = "literal";
    }

    if (!nodeMap.has(objectId)) {
      nodeMap.set(objectId, {
        id: objectId,
        label: objectLabel,
        type: objectType,
        boxType: objectBoxType,
      });
    }
  });

  const edgeMap = new Map<
    string,
    {
      source: string;
      target: string;
      predicate: string;
      index: number;
      objectId: string;
    }
  >();
  const bidirectionalEdges = new Set<string>();

  triples.forEach((t: Triple, i: number) => {
    const { s, p, o } = t;

    let objectId: string;
    if (typeof o === "string") {
      objectId = o;
    } else {
      objectId = `lit_${hash(o.value)}_${i}`;
    }

    const forwardKey = `${s}|${p}|${objectId}`;
    const reverseKey = `${objectId}|${p}|${s}`;

    if (edgeMap.has(reverseKey)) {
      bidirectionalEdges.add(forwardKey);
      bidirectionalEdges.add(reverseKey);
    }

    edgeMap.set(forwardKey, {
      source: s,
      target: objectId,
      predicate: p,
      index: i,
      objectId,
    });
  });

  const processedBidirectional = new Set<string>();

  edgeMap.forEach((edgeInfo, edgeKey) => {
    const { source, target, predicate, index, objectId } = edgeInfo;
    const reverseKey = `${target}|${predicate}|${source}`;

    if (
      bidirectionalEdges.has(edgeKey) &&
      processedBidirectional.has(reverseKey)
    ) {
      return;
    }

    const edgeColor = getLinkColor(predicate, colors);
    const isBidirectional = bidirectionalEdges.has(edgeKey);

    edgesAcc.push({
      id: `e_${hash(edgeKey)}_${index}`,
      source: source,
      target: objectId,
      label: shortenUri(predicate),
      type: "custom",
      style: { strokeWidth: 2, stroke: edgeColor },
      labelStyle: { fontSize: 12, fill: "#334155", fontWeight: 500 },
      markerEnd: { type: "arrowclosed" as MarkerType, color: edgeColor },
      markerStart: isBidirectional
        ? { type: "arrowclosed" as MarkerType, color: edgeColor }
        : undefined,
      data: {
        predicate: predicate,
        isBidirectional,
        triples: [
          triples[index],
          ...(isBidirectional && reverseKey !== edgeKey
            ? [triples[edgeMap.get(reverseKey)!.index]]
            : []),
        ],
      },
    });

    if (isBidirectional) {
      processedBidirectional.add(edgeKey);
    }
  });

  const rfNodes = Array.from(nodeMap.values()).map((n) => ({
    id: n.id,
    type: "ontology",
    connectable: n.type === "literal" ? false : undefined,
    position: { x: 0, y: 0 },
    data: {
      label: `${n.label} (${n.type})`,
      boxType: n.boxType,
    },
    style: {
      ...getNodeStyle(n.type, n.boxType),
      width: 150,
      textAlign: "center" as const,
    },
  }));

  return {
    nodes: rfNodes,
    edges: edgesAcc,
    displayedCount: triples.length,
    filteredTotal,
    schemaRelations: index.schemaRelations,
    ontologyRelations: index.ontologyRelations,
  };
}
