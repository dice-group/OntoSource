"use client";

import { memo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useStore,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnConnect,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import type { GraphEdge } from "../../utils/graph-utils";
import type { GraphSelection } from "./GraphEditor";
import GraphNode from "./GraphNode";
import CustomEdge, { EdgeLabelVisibility } from "./CustomEdge";

const nodeTypes = { ontology: GraphNode };
const edgeTypes = { custom: CustomEdge };
const proOptions = { hideAttribution: true };
const fitViewOptions = { padding: 0.2 };

type Props = {
  nodes: Node[];
  edges: GraphEdge[];
  alwaysShowLabels: boolean;
  editMode?: boolean;
  onSelect?: (selection: GraphSelection) => void;
};

function GraphScene({
  nodes,
  edges,
  alwaysShowLabels,
  editMode,
  onSelect,
}: Props) {
  const { setNodes, setEdges, fitView } = useReactFlow<Node, GraphEdge>();
  useEffect(() => setNodes(nodes), [nodes, setNodes]);
  useEffect(() => setEdges(edges), [edges, setEdges]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void fitView(fitViewOptions);
    }, 50);
    return () => clearTimeout(timer);
  }, [editMode, fitView]);
  const readableZoom = useStore((state) => state.transform[2] >= 0.6);
  const selectNode: NodeMouseHandler = useCallback(
    (_, node) => {
      if (!editMode) return;
      if (node.data.boxType === "literal") {
        const triples = edges.find((edge) => edge.target === node.id)?.data
          ?.triples;
        if (triples) onSelect?.({ kind: "edge", triples });
      } else onSelect?.({ kind: "node", id: node.id });
    },
    [editMode, edges, onSelect],
  );
  const selectEdge: EdgeMouseHandler<GraphEdge> = useCallback(
    (_, edge) => {
      if (editMode && edge.data?.triples)
        onSelect?.({ kind: "edge", triples: edge.data.triples });
    },
    [editMode, onSelect],
  );
  const select: OnSelectionChangeFunc<Node, GraphEdge> = useCallback(
    ({ nodes, edges }) => {
      if (!editMode) return;
      const edge = edges[0];
      if (edge?.data?.triples)
        onSelect?.({ kind: "edge", triples: edge.data.triples });
      else if (nodes[0] && nodes[0].data.boxType !== "literal")
        onSelect?.({ kind: "node", id: nodes[0].id });
    },
    [editMode, onSelect],
  );
  const connect: OnConnect = useCallback(
    (connection) => {
      onSelect?.({
        kind: "new",
        subject: connection.source,
        object: connection.target,
      });
    },
    [onSelect],
  );
  return (
    <EdgeLabelVisibility.Provider value={alwaysShowLabels || readableZoom}>
      <ReactFlow
        defaultNodes={nodes}
        defaultEdges={edges}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        onSelectionChange={select}
        fitView
        fitViewOptions={fitViewOptions}
        proOptions={proOptions}
        onlyRenderVisibleElements={nodes.length + edges.length > 300}
        minZoom={0.01}
        maxZoom={5}
        nodesConnectable={!!editMode}
        onNodeClick={selectNode}
        onEdgeClick={selectEdge}
        onConnect={connect}
        deleteKeyCode={null}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        preventScrolling
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#cbd7ce"
        />
        <Controls />
      </ReactFlow>
    </EdgeLabelVisibility.Provider>
  );
}

export default memo(function GraphCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphScene {...props} />
    </ReactFlowProvider>
  );
});
