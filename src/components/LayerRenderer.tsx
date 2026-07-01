import type { Layer } from "../types";

export function LayerRenderer({ layer }: { layer: Layer }) {
  if (!layer.visible) return null;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    opacity: layer.opacity,
    zIndex: layer.zIndex,
    transform: `rotate(${layer.rotation}deg)`,
    transformOrigin: "center",
    pointerEvents: "none"
  };

  if (layer.type === "image") {
    return (
      <img
        src={layer.src}
        alt=""
        style={{
          ...baseStyle,
          objectFit: "cover",
          borderRadius: layer.style.borderRadius ?? 24,
          boxShadow: "0 18px 50px rgba(17,24,39,0.16)"
        }}
      />
    );
  }

  if (layer.type === "shape" || layer.type === "decoration") {
    return (
      <div
        style={{
          ...baseStyle,
          background: layer.style.fill || layer.style.background,
          borderRadius: layer.style.borderRadius ?? 0,
          border: layer.style.stroke ? `${layer.style.strokeWidth || 1}px solid ${layer.style.stroke}` : undefined
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        display: "flex",
        alignItems: layer.role === "cta" || layer.role === "benefit" ? "center" : "flex-start",
        justifyContent: layer.style.textAlign === "center" ? "center" : layer.style.textAlign === "right" ? "flex-end" : "flex-start",
        overflow: "hidden",
        color: layer.style.color,
        background: layer.style.background,
        borderRadius: layer.style.borderRadius,
        fontSize: layer.style.fontSize,
        fontWeight: layer.style.fontWeight,
        fontFamily: layer.style.fontFamily || "Inter, ui-sans-serif, system-ui, sans-serif",
        lineHeight: layer.style.lineHeight,
        letterSpacing: layer.style.letterSpacing,
        textAlign: layer.style.textAlign,
        padding: layer.style.background ? "0 18px" : 0,
        whiteSpace: "pre-wrap"
      }}
    >
      {layer.content}
    </div>
  );
}
