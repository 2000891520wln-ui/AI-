import { scenes } from "../data/scenes";
import type { DesignDocument, KVAnalysis, Layer, LayoutType, Project, Scene, Template } from "../types";

const fallbackImage = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1000&q=80";

export function mockAnalyzeKV(project: Project): KVAnalysis {
  return {
    detectedTextElements: [
      { id: "text-title", label: "主标题", value: project.formData.title || "家的图解百科", usage: "keep" },
      { id: "text-subtitle", label: "副标题", value: project.formData.subtitle || "家的十万个为什么，这里都有答案", usage: "keep" },
      { id: "text-date", label: "活动时间", value: project.formData.dateRange || "2026.9.5 - 2026.9.8", usage: "keep" }
    ],
    detectedVisualElements: [
      { id: "visual-main", label: "主视觉", value: "家具/商品主体", usage: "keep", role: "main-visual" },
      { id: "visual-bg", label: "背景", value: "米色纸张纹理", usage: "style-only", role: "background" },
      { id: "visual-logo", label: "Logo", value: project.formData.brand || "频道标识", usage: "keep", role: "logo" },
      { id: "visual-deco", label: "装饰元素", value: "标签、箭头、贴纸", usage: "style-only", role: "decoration" }
    ],
    styleProfile: {
      colors: ["#F3E7D1", "#111827", "#D93636", "#2F7D57"],
      layoutStyle: "编辑拼贴风",
      density: "中等",
      mood: "温暖、可信、轻运营感"
    }
  };
}

export function mockGenerateDesignDocuments(project: Project, kvAnalysis: KVAnalysis, selectedSceneIds: string[]): DesignDocument[] {
  return scenes
    .filter((scene) => selectedSceneIds.includes(scene.id))
    .flatMap((scene) =>
      scene.templates.map((template) => createDocument(project, kvAnalysis, scene, template))
    );
}

export function applyProjectFieldsToDocument(document: DesignDocument, project: Project): DesignDocument {
  return {
    ...document,
    layers: document.layers.map((layer) => {
      const next = { ...layer };
      if (layer.role === "title") next.content = project.formData.title;
      if (layer.role === "subtitle") next.content = project.formData.subtitle;
      if (layer.role === "dateRange") next.content = project.formData.dateRange;
      if (layer.role === "benefit") next.content = project.formData.benefit;
      if (layer.role === "cta") next.content = project.formData.cta;
      if (layer.role === "brand") next.content = project.formData.brand;
      if (layer.role === "mainVisual") next.src = project.kvImageUrl || fallbackImage;
      return next;
    })
  };
}

function createDocument(project: Project, analysis: KVAnalysis, scene: Scene, template: Template): DesignDocument {
  const colors = analysis.styleProfile.colors;
  const canvas = {
    width: scene.width,
    height: scene.height,
    backgroundColor: colors[0],
    safeArea: scene.safeArea
  };

  return {
    id: `${project.id}-${template.id}`,
    projectId: project.id,
    sceneId: scene.id,
    templateId: template.id,
    canvas,
    layers: buildLayers(template.layoutType, scene, project, colors)
  };
}

function baseLayer(layer: Partial<Layer> & Pick<Layer, "id" | "type" | "role" | "x" | "y" | "width" | "height">): Layer {
  return {
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    locked: false,
    visible: true,
    style: {},
    ...layer
  };
}

function buildLayers(layout: LayoutType, scene: Scene, project: Project, colors: string[]): Layer[] {
  const w = scene.width;
  const h = scene.height;
  const img = project.kvImageUrl || fallbackImage;
  const dark = colors[1] || "#111827";
  const red = colors[2] || "#D93636";
  const green = colors[3] || "#2F7D57";
  const titleSize = Math.max(38, Math.round(w * (h > w ? 0.07 : 0.052)));
  const subtitleSize = Math.max(22, Math.round(w * 0.025));

  const bg = baseLayer({ id: "layer-bg", type: "shape", role: "background", x: 0, y: 0, width: w, height: h, locked: true, zIndex: 0, style: { fill: colors[0] || "#F3E7D1" } });
  const deco1 = baseLayer({ id: "layer-deco-1", type: "decoration", role: "decoration", x: w * 0.06, y: h * 0.08, width: w * 0.12, height: h * 0.08, rotation: -8, zIndex: 2, style: { fill: green, borderRadius: 18 } });
  const deco2 = baseLayer({ id: "layer-deco-2", type: "decoration", role: "decoration", x: w * 0.78, y: h * 0.12, width: w * 0.14, height: h * 0.08, rotation: 7, zIndex: 2, style: { fill: red, borderRadius: 999 } });

  const title = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
    baseLayer({ id: "layer-title", type: "text", role: "title", content: project.formData.title, x, y, width, height: titleSize * 2.25, zIndex: 5, style: { color: dark, fontSize: titleSize, fontWeight: 800, lineHeight: 1.04, textAlign: align } });
  const subtitle = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
    baseLayer({ id: "layer-subtitle", type: "text", role: "subtitle", content: project.formData.subtitle, x, y, width, height: subtitleSize * 2.2, zIndex: 5, style: { color: "#374151", fontSize: subtitleSize, fontWeight: 500, lineHeight: 1.35, textAlign: align } });
  const brand = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
    baseLayer({ id: "layer-brand", type: "text", role: "brand", content: project.formData.brand, x, y, width, height: 36, zIndex: 6, style: { color: dark, fontSize: Math.max(20, Math.round(w * 0.022)), fontWeight: 700, textAlign: align } });
  const benefit = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
    baseLayer({ id: "layer-benefit", type: "text", role: "benefit", content: project.formData.benefit, x, y, width, height: 54, zIndex: 7, style: { color: "#FFFFFF", fontSize: Math.max(22, Math.round(w * 0.032)), fontWeight: 800, background: red, borderRadius: 18, textAlign: align } });
  const cta = (x: number, y: number, width: number) =>
    baseLayer({ id: "layer-cta", type: "text", role: "cta", content: project.formData.cta, x, y, width, height: 46, zIndex: 8, style: { color: "#FFFFFF", fontSize: Math.max(18, Math.round(w * 0.022)), fontWeight: 700, background: dark, borderRadius: 999, textAlign: "center" } });
  const date = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
    baseLayer({ id: "layer-date", type: "text", role: "dateRange", content: project.formData.dateRange, x, y, width, height: 32, zIndex: 6, style: { color: "#4B5563", fontSize: Math.max(17, Math.round(w * 0.019)), fontWeight: 600, textAlign: align } });
  const visual = (x: number, y: number, width: number, height: number, opacity = 1) =>
    baseLayer({ id: "layer-visual", type: "image", role: "mainVisual", src: img, x, y, width, height, opacity, zIndex: 4, style: { borderRadius: Math.round(Math.min(w, h) * 0.04) } });

  if (scene.id === "search-aladdin") {
    const compactTitle = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
      baseLayer({ id: "layer-title", type: "text", role: "title", content: project.formData.title, x, y, width, height: 78, zIndex: 5, style: { color: dark, fontSize: 58, fontWeight: 900, lineHeight: 1.04, textAlign: align } });
    const compactSubtitle = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
      baseLayer({ id: "layer-subtitle", type: "text", role: "subtitle", content: project.formData.subtitle, x, y, width, height: 38, zIndex: 5, style: { color: "#1F2937", fontSize: 25, fontWeight: 700, lineHeight: 1.25, textAlign: align, background: "rgba(255,255,255,0.78)", borderRadius: 4 } });
    const compactBrand = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
      baseLayer({ id: "layer-brand", type: "text", role: "brand", content: project.formData.brand, x, y, width, height: 28, zIndex: 6, style: { color: "#4B5563", fontSize: 18, fontWeight: 700, textAlign: align } });
    const compactBenefit = (x: number, y: number, width: number, align: "left" | "center" = "left") =>
      baseLayer({ id: "layer-benefit", type: "text", role: "benefit", content: project.formData.benefit, x, y, width, height: 42, zIndex: 7, style: { color: "#FFFFFF", fontSize: 22, fontWeight: 800, background: red, borderRadius: 999, textAlign: align } });
    const compactCta = (x: number, y: number, width: number) =>
      baseLayer({ id: "layer-cta", type: "text", role: "cta", content: project.formData.cta, x, y, width, height: 42, zIndex: 8, style: { color: "#FFFFFF", fontSize: 20, fontWeight: 800, background: dark, borderRadius: 999, textAlign: "center" } });
    const grid = baseLayer({
      id: "layer-grid",
      type: "shape",
      role: "backgroundTint",
      x: 0,
      y: 0,
      width: w,
      height: h,
      locked: true,
      zIndex: 1,
      style: {
        background:
          "linear-gradient(rgba(17,24,39,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.06) 1px, transparent 1px)",
        borderRadius: 0
      }
    });

    if (layout === "left-text-right-image") {
      return [
        bg,
        grid,
        deco1,
        visual(790, 52, 300, 205),
        compactBrand(58, 46, 280),
        compactTitle(58, 82, 650),
        compactSubtitle(58, 178, 690),
        compactBenefit(58, 244, 330),
        compactCta(410, 244, 150)
      ];
    }
    if (layout === "center-title") {
      return [
        bg,
        grid,
        visual(850, 70, 230, 170, 0.9),
        deco1,
        deco2,
        compactBrand(250, 48, 670, "center"),
        compactTitle(190, 92, 780, "center"),
        compactSubtitle(260, 188, 640, "center"),
        compactCta(490, 248, 190)
      ];
    }
    if (layout === "strong-benefit") {
      return [
        bg,
        grid,
        visual(760, 38, 330, 230),
        compactBrand(58, 42, 340),
        compactBenefit(58, 82, 430),
        compactTitle(58, 140, 600),
        compactSubtitle(58, 232, 620),
        compactCta(510, 82, 170),
        deco2
      ];
    }
  }

  if (layout === "left-text-right-image") {
    return [bg, deco1, visual(w * 0.58, h * 0.12, w * 0.34, h * 0.72), brand(w * 0.07, h * 0.12, w * 0.42), title(w * 0.07, h * 0.23, w * 0.46), subtitle(w * 0.07, h * 0.52, w * 0.44), benefit(w * 0.07, h * 0.68, w * 0.34), cta(w * 0.07, h * 0.82, w * 0.2)];
  }
  if (layout === "center-title") {
    return [bg, deco1, deco2, visual(w * 0.36, h * 0.48, w * 0.28, h * 0.34, 0.92), brand(w * 0.25, h * 0.12, w * 0.5, "center"), title(w * 0.16, h * 0.24, w * 0.68, "center"), subtitle(w * 0.2, h * 0.44, w * 0.6, "center"), cta(w * 0.39, h * 0.78, w * 0.22)];
  }
  if (layout === "strong-benefit") {
    return [bg, visual(w * 0.6, h * 0.04, w * 0.35, h * 0.88), title(w * 0.07, h * 0.16, w * 0.48), benefit(w * 0.07, h * 0.48, w * 0.43), subtitle(w * 0.07, h * 0.64, w * 0.42), cta(w * 0.07, h * 0.8, w * 0.22), deco2];
  }
  if (layout === "immersive-bg") {
    return [visual(0, 0, w, h, 0.38), baseLayer({ id: "layer-tint", type: "shape", role: "backgroundTint", x: 0, y: 0, width: w, height: h, zIndex: 1, style: { fill: "rgba(243,231,209,0.78)" } }), deco1, deco2, title(w * 0.12, h * 0.22, w * 0.76, "center"), subtitle(w * 0.2, h * 0.53, w * 0.6, "center"), benefit(w * 0.33, h * 0.72, w * 0.34, "center")];
  }
  if (layout === "top-bottom") {
    return [bg, brand(w * 0.08, h * 0.08, w * 0.5), title(w * 0.08, h * 0.18, w * 0.64), subtitle(w * 0.08, h * 0.36, w * 0.58), visual(w * 0.12, h * 0.54, w * 0.76, h * 0.32), date(w * 0.08, h * 0.88, w * 0.6), deco2];
  }
  if (layout === "minimal-brand") {
    return [bg, visual(w * 0.58, h * 0.18, w * 0.3, h * 0.58), brand(w * 0.11, h * 0.18, w * 0.42), title(w * 0.11, h * 0.33, w * 0.42), subtitle(w * 0.11, h * 0.6, w * 0.36), cta(w * 0.11, h * 0.77, w * 0.2)];
  }
  if (layout === "hero-title") {
    return [bg, visual(w * 0.08, h * 0.35, w * 0.84, h * 0.46), deco1, brand(w * 0.12, h * 0.09, w * 0.5, "center"), title(w * 0.12, h * 0.16, w * 0.76, "center"), subtitle(w * 0.16, h * 0.83, w * 0.68, "center")];
  }
  if (layout === "visual-focus") {
    return [bg, visual(w * 0.08, h * 0.18, w * 0.84, h * 0.54), title(w * 0.1, h * 0.08, w * 0.8, "center"), benefit(w * 0.16, h * 0.76, w * 0.68, "center"), cta(w * 0.33, h * 0.86, w * 0.34), deco2];
  }
  return [bg, brand(w * 0.1, h * 0.08, w * 0.5), title(w * 0.1, h * 0.16, w * 0.8), subtitle(w * 0.1, h * 0.34, w * 0.76), visual(w * 0.14, h * 0.47, w * 0.72, h * 0.25), benefit(w * 0.12, h * 0.76, w * 0.76, "center"), date(w * 0.12, h * 0.86, w * 0.5), cta(w * 0.58, h * 0.84, w * 0.28)];
}
