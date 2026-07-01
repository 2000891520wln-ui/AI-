export type StepId = "home" | "create" | "analysis" | "scenes" | "templates" | "editor";

export type ElementUsage = "keep" | "style-only" | "unused";

export type LayerType = "text" | "image" | "shape" | "decoration";

export type LayoutType =
  | "left-text-right-image"
  | "center-title"
  | "strong-benefit"
  | "immersive-bg"
  | "top-bottom"
  | "minimal-brand"
  | "hero-title"
  | "visual-focus"
  | "full-info";

export type ProjectFormData = {
  title: string;
  subtitle: string;
  dateRange: string;
  benefit: string;
  cta: string;
  brand: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  kvImageUrl: string;
  formData: ProjectFormData;
  selectedScenes: string[];
  generatedDocuments: DesignDocument[];
};

export type KVDetectedElement = {
  id: string;
  label: string;
  value: string;
  usage: ElementUsage;
};

export type KVVisualElement = KVDetectedElement & {
  role: "main-visual" | "background" | "logo" | "decoration";
};

export type StyleProfile = {
  colors: string[];
  layoutStyle: string;
  density: "低" | "中等" | "高";
  mood: string;
};

export type KVAnalysis = {
  detectedTextElements: KVDetectedElement[];
  detectedVisualElements: KVVisualElement[];
  styleProfile: StyleProfile;
};

export type SafeArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Scene = {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
  safeArea: SafeArea;
  requiredFields: Array<keyof ProjectFormData>;
  templates: Template[];
};

export type Template = {
  id: string;
  name: string;
  sceneId: string;
  tag: string;
  layoutType: LayoutType;
  slots: string[];
};

export type CanvasMeta = {
  width: number;
  height: number;
  backgroundColor: string;
  safeArea: SafeArea;
};

export type LayerStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  borderRadius?: number;
  background?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
};

export type Layer = {
  id: string;
  type: LayerType;
  role: string;
  content?: string;
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  style: LayerStyle;
};

export type DesignDocument = {
  id: string;
  projectId: string;
  sceneId: string;
  templateId: string;
  canvas: CanvasMeta;
  layers: Layer[];
};
