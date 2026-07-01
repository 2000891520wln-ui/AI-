export type AppStep = "upload" | "analyze" | "select" | "export";

export type AppStatus =
  | "empty"
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "selecting"
  | "generating"
  | "generated";

export type ExportFormat = "PNG" | "SVG" | "Figma JSON";

export type KVAnalysis = {
  copy: {
    title: string;
    subtitle: string;
    englishLabel: string;
    date: string;
    brand: string;
  };
  assets: {
    mainPhoto: string;
    graphicElements: string[];
    logo: string;
  };
  style: {
    styleKeywords: string[];
    colors: string[];
    typography: string;
    composition: string;
  };
  designDNA: {
    summary: string;
    mustKeep: string[];
    avoid: string[];
  };
};

export type SceneTemplate = {
  id: string;
  name: string;
  description: string;
  size: string;
  width: number;
  height: number;
  inheritance: "高" | "中" | "低";
};

export type GeneratedScene = {
  id: string;
  sceneId: string;
  name: string;
  size: string;
  strategy: string;
  width: number;
  height: number;
  layers: LayerNode[];
};

export type LayerNode = {
  id: string;
  name: string;
  type: "text" | "image" | "shape" | "background" | "button";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  visible: boolean;
  locked: boolean;
};

export type CopyConfig = {
  title: string;
  subtitle: string;
  date: string;
  cta: string;
  topic: string;
  messageTitle: string;
  messageBody: string;
};

export type VisualConfig = {
  showGrid: boolean;
  showMainPhoto: boolean;
  showBlueSofa: boolean;
  showYellowChair: boolean;
  showRedChair: boolean;
  showYellowDots: boolean;
  showLogo: boolean;
  colors: {
    background: string;
    title: string;
    yellow: string;
    blue: string;
    red: string;
    brand: string;
  };
};
