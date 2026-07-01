import React from "react";
import type { DesignDocument } from "../types";
import { LayerRenderer } from "./LayerRenderer";

export function EditorCanvas({
  document,
  previewOnly = false,
  canvasRef
}: {
  document: DesignDocument;
  previewOnly?: boolean;
  canvasRef?: React.RefObject<HTMLDivElement>;
}) {
  const sortedLayers = [...document.layers].sort((a, b) => a.zIndex - b.zIndex);
  const maxPreviewWidth = previewOnly ? 280 : 860;
  const scale = Math.min(maxPreviewWidth / document.canvas.width, (previewOnly ? 220 : 650) / document.canvas.height);
  const width = document.canvas.width * scale;
  const height = document.canvas.height * scale;

  return (
    <div className={previewOnly ? "flex items-center justify-center" : "flex min-h-[680px] items-center justify-center overflow-auto rounded-[8px] bg-[#E5E7EB] p-8"}>
      <div style={{ width, height }} className="relative shrink-0">
        <div
          ref={canvasRef}
          className="absolute left-0 top-0 overflow-hidden bg-white shadow-sm"
          style={{
            width: document.canvas.width,
            height: document.canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            borderRadius: previewOnly ? 8 / scale : 0
          }}
        >
          {sortedLayers.map((layer) => <LayerRenderer key={layer.id} layer={layer} />)}
          {!previewOnly ? (
            <div
              className="absolute border-2 border-dashed border-[#2563EB]/50"
              style={{
                left: document.canvas.safeArea.x,
                top: document.canvas.safeArea.y,
                width: document.canvas.safeArea.width,
                height: document.canvas.safeArea.height,
                zIndex: 80,
                pointerEvents: "none"
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
