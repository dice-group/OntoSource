import type { Node } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import type { GraphEdge } from "./graph-utils";

export const getLayoutedElements = (
  nodes: Node[],
  edges: GraphEdge[],
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

  const edgeGroups = new Map<string, GraphEdge[]>();
  edges.forEach((edge) => {
    const pathKey = JSON.stringify([edge.source, edge.target]);
    if (!edgeGroups.has(pathKey)) {
      edgeGroups.set(pathKey, []);
    }
    edgeGroups.get(pathKey)!.push(edge);
  });

  const edgeIndices = new Map<string, number>();
  const layoutedEdges = edges.map((original) => {
    const edge = {
      ...original,
      sourceHandle: direction === "LR" ? "right" : "bottom",
      targetHandle: direction === "LR" ? "left" : "top",
    };
    const pathKey = JSON.stringify([edge.source, edge.target]);
    const parallelEdges = edgeGroups.get(pathKey) || [];

    if (parallelEdges.length === 1) {
      return {
        ...edge,
        data: {
          ...edge.data!,
          offset: 0,
        },
      };
    }

    const edgeIndex = edgeIndices.get(pathKey) || 0;
    edgeIndices.set(pathKey, edgeIndex + 1);
    const totalEdges = parallelEdges.length;

    const offset = (edgeIndex - (totalEdges - 1) / 2) * 50;

    return {
      ...edge,
      data: {
        ...edge.data!,
        offset,
      },
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
};
