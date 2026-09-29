"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export default memo(function GraphNode({ data, isConnectable }: NodeProps) {
  return (
    <>
      {String(data.label || "")}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ opacity: isConnectable ? 1 : 0 }}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ opacity: isConnectable ? 1 : 0 }}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ opacity: isConnectable ? 1 : 0 }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ opacity: isConnectable ? 1 : 0 }}
      />
    </>
  );
});
