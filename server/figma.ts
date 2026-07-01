type FigmaBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  absoluteBoundingBox?: FigmaBounds;
  children?: FigmaNode[];
};

type FigmaNodesResponse = {
  nodes?: Record<string, { document?: FigmaNode } | null>;
  err?: string;
};

type FigmaImagesResponse = {
  images?: Record<string, string | null>;
  err?: string;
};

export type ParsedFigmaFrame = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hidden: boolean;
  depth: number;
  role: string;
  previewImageUrl: string | null;
};

export async function parseFigmaNode(fileKey: string, nodeId?: string) {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error("缺少 FIGMA_ACCESS_TOKEN，请先在 .env 中配置 Figma Token");

  if (!nodeId) throw new Error("请粘贴带 node-id 的 Figma 节点链接");

  const normalizedNodeId = normalizeNodeId(nodeId);
  const nodeUrl = new URL(`https://api.figma.com/v1/files/${fileKey}/nodes`);
  nodeUrl.searchParams.set("ids", normalizedNodeId);

  const nodeData = await figmaFetch<FigmaNodesResponse>(nodeUrl, token);
  const root = nodeData.nodes?.[normalizedNodeId]?.document;
  if (!root) throw new Error("没有读取到该 Figma 节点，请确认链接权限和 node-id");

  const rootBounds = root.absoluteBoundingBox;
  if (!rootBounds) throw new Error("该 Figma 节点缺少尺寸信息，无法作为主 KV 解析");

  const frames = (root.children || [])
    .filter((child) => child.type === "FRAME" && child.absoluteBoundingBox)
    .map((child) => toParsedFrame(child, rootBounds));

  const imageUrls = await getFigmaImageUrls(fileKey, [normalizedNodeId, ...frames.map((frame) => frame.id)], token);
  const imageUrl = imageUrls[normalizedNodeId] || null;
  const framesWithPreviews = frames.map((frame) => ({
    ...frame,
    previewImageUrl: imageUrls[frame.id] || null
  }));

  return {
    fileKey,
    nodeId: normalizedNodeId,
    name: root.name,
    width: rootBounds.width,
    height: rootBounds.height,
    previewImageUrl: imageUrl,
    frames: framesWithPreviews
  };
}

async function getFigmaImageUrls(fileKey: string, nodeIds: string[], token: string) {
  const imageUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`);
  imageUrl.searchParams.set("ids", nodeIds.join(","));
  imageUrl.searchParams.set("format", "png");
  imageUrl.searchParams.set("scale", "1");

  try {
    const imageData = await figmaFetch<FigmaImagesResponse>(imageUrl, token);
    return imageData.images || {};
  } catch {
    return {};
  }
}

async function figmaFetch<T>(url: URL, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": token
    }
  });

  const data = (await response.json().catch(() => ({}))) as T & { err?: string; message?: string };
  if (!response.ok) {
    throw new Error(data.err || data.message || `Figma API 请求失败：${response.status}`);
  }

  return data;
}

function toParsedFrame(node: FigmaNode, rootBounds: FigmaBounds): ParsedFigmaFrame {
  const bounds = node.absoluteBoundingBox!;
  return {
    id: normalizeNodeId(node.id),
    name: node.name.trim() || "Untitled Frame",
    x: bounds.x - rootBounds.x,
    y: bounds.y - rootBounds.y,
    width: bounds.width,
    height: bounds.height,
    hidden: node.visible === false,
    depth: 0,
    role: inferFrameRole(node.name),
    previewImageUrl: null
  };
}

function inferFrameRole(name: string) {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes("title")) return "title-component";
  if (normalized.includes("subtitle") || normalized.includes("slogan")) return "subtitle-bar";
  if (normalized.includes("pic") || normalized.includes("photo") || normalized.includes("image")) return "main-visual";
  if (normalized.includes("time") || normalized.includes("date")) return "time-card";
  if (normalized.includes("texture") || normalized.includes("background") || normalized.includes("bg")) return "background-texture";
  return "figma-frame";
}

function normalizeNodeId(nodeId: string) {
  return nodeId.replace("-", ":");
}
