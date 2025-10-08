"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  markerStart,
  label,
  labelStyle,
  data,
}: EdgeProps) {
  const offset: number = (data?.offset as number) || 0;

  // Calculate control points for curved edges with offset
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (offset !== 0) {
    // Calculate the midpoint
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    // Calculate the perpendicular offset direction
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Perpendicular vector (normalized)
    const perpX = -dy / length;
    const perpY = dx / length;

    // Apply offset to control points
    const controlX = midX + perpX * offset;
    const controlY = midY + perpY * offset;

    // Create a quadratic bezier curve
    edgePath = `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;

    // Label position at the control point
    labelX = controlX;
    labelY = controlY;
  } else {
    // Use default bezier path for edges without offset
    const result = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    edgePath = result[0];
    labelX = result[1];
    labelY = result[2];
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: "all",
              ...labelStyle,
            }}
            className="nodrag nopan bg-white px-1 py-0.5 rounded border border-gray-200 shadow-sm text-gray-900 font-medium"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
