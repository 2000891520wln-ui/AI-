import type { CopyConfig, ExportFormat, GeneratedScene, KVAnalysis, LayerNode, SceneTemplate, VisualConfig } from "../types/studio";

export const analysisSteps = [
  "正在识别主标题、副标题和活动时间",
  "正在提取主视觉图片和图形元素",
  "正在分析色彩、字体和构图关系",
  "正在生成 Design DNA",
  "正在匹配可延展场景规则"
];

export const generationSteps = [
  "正在读取 Design DNA",
  "正在匹配场景模板规则",
  "正在重组文案层级",
  "正在裁切和复用主视觉资产",
  "正在生成可编辑图层",
  "正在渲染预览图"
];

export const sceneTemplates: SceneTemplate[] = [
  {
    id: "search-aladdin",
    name: "搜索阿拉丁",
    description: "用于搜索结果页顶部承接，强调话题识别与快速点击",
    size: "1170 × 330",
    width: 1170,
    height: 330,
    inheritance: "中"
  },
  {
    id: "message-card",
    name: "站内信",
    description: "用于消息通知场景，强调标题、正文和点击查看详情",
    size: "686 × 300",
    width: 686,
    height: 300,
    inheritance: "低"
  },
  {
    id: "activity-center",
    name: "活动中心页",
    description: "用于活动列表卡片，强调活动名称、时间和参与按钮",
    size: "686 × 420",
    width: 686,
    height: 420,
    inheritance: "中"
  },
  {
    id: "creator-center",
    name: "创作者中心",
    description: "用于创作者活动详情，强调话题价值、参与说明和投稿入口",
    size: "750 × 520",
    width: 750,
    height: 520,
    inheritance: "高"
  },
  {
    id: "topic-page",
    name: "话题页",
    description: "用于话题主页头部，强调话题心智与内容流承接",
    size: "750 × 360",
    width: 750,
    height: 360,
    inheritance: "高"
  }
];

export const mockKVAnalysis: KVAnalysis = {
  copy: {
    title: "家的图解百科",
    subtitle: "家的十万个为什么，这里都有答案",
    englishLabel: "(Encyclopedia)",
    date: "2026.05.08 - 09.30",
    brand: "抖音生活服务"
  },
  assets: {
    mainPhoto: "家居空间照片",
    graphicElements: ["蓝色沙发剪影", "黄色椅子剪影", "红色椅子剪影", "黄色标注点", "网格背景", "浅黄色标题底块"],
    logo: "抖音生活服务 Logo"
  },
  style: {
    styleKeywords: ["信息图鉴", "家居百科", "网格背景", "现代主义排版", "高对比黑体标题", "真实照片 + 扁平图形叠加"],
    colors: ["#F8F8F5", "#24160F", "#F6D247", "#2F6DDE", "#E92828"],
    typography: "粗黑体标题 / Mono 英文注释 / 高对比层级",
    composition: "上方大标题 + 中部家居照片 + 扁平家具图形叠加 + 底部 slogan"
  },
  designDNA: {
    summary:
      "以“百科图解”为核心心智，通过网格背景、粗黑体标题、黄色标注线、真实家居照片与扁平家具图形叠加，形成兼具信息感和生活感的活动主视觉。",
    mustKeep: ["粗黑体中文标题", "网格背景", "黄蓝红家具图形", "家居真实照片", "黄色标注点", "副标题 slogan"],
    avoid: ["过度卡通化", "过多装饰元素", "随机家具 icon", "破坏主标题识别", "过度柔和生活方式风"]
  }
};

export const defaultCopyConfig: CopyConfig = {
  title: "家的图解百科",
  subtitle: "家的十万个为什么，这里都有答案",
  date: "2026.05.08 - 09.30",
  cta: "立即参与",
  topic: "#家的图解百科",
  messageTitle: "邀你共创家的图解百科",
  messageBody: "将复杂的家装家居知识，用图解的方式变得一看就懂，最高可获 20 万流量激励！"
};

export const defaultVisualConfig: VisualConfig = {
  showGrid: true,
  showMainPhoto: true,
  showBlueSofa: true,
  showYellowChair: true,
  showRedChair: true,
  showYellowDots: true,
  showLogo: true,
  colors: {
    background: "#F8F8F5",
    title: "#24160F",
    yellow: "#F6D247",
    blue: "#2F6DDE",
    red: "#E92828",
    brand: "#FE2C55"
  }
};

const baseLayers: LayerNode[] = [
  { id: "grid", name: "Background / Grid", type: "background", visible: true, locked: false },
  { id: "title", name: "Title Group", type: "text", visible: true, locked: false },
  { id: "englishLabel", name: "English Label", type: "text", visible: true, locked: false },
  { id: "subtitle", name: "Subtitle", type: "text", visible: true, locked: false },
  { id: "mainPhoto", name: "Main Photo", type: "image", visible: true, locked: false },
  { id: "blueSofa", name: "Blue Sofa Shape", type: "shape", visible: true, locked: false },
  { id: "yellowChair", name: "Yellow Chair Shape", type: "shape", visible: true, locked: false },
  { id: "redChair", name: "Red Chair Shape", type: "shape", visible: true, locked: false },
  { id: "logo", name: "Logo", type: "image", visible: true, locked: false },
  { id: "cta", name: "CTA Button", type: "button", visible: true, locked: false }
];

const strategies: Record<string, string> = {
  "search-aladdin": "压缩主 KV 信息密度，保留标题、slogan、网格背景与右侧缩略图，强化搜索场景下的话题识别效率。",
  "message-card": "弱化装饰元素，将主 KV 转译为通知卡片结构，优先保障消息标题、正文和查看详情入口的可读性。",
  "activity-center": "将主 KV 改造为横向活动卡片，保留核心视觉锚点，并突出活动名称、时间和立即参与按钮。",
  "creator-center": "强化主 KV 的品牌识别和活动心智，用头图承接视觉风格，下方补充话题数据、活动说明和收藏动作。",
  "topic-page": "将主视觉轻量化为话题页头部资产，既保留活动识别，又避免挤压内容流浏览效率。"
};

export async function analyzeMainKV(_file: File | null): Promise<KVAnalysis> {
  await wait(2500);
  return mockKVAnalysis;
}

export async function generateScenes(
  _analysis: KVAnalysis,
  selectedSceneIds: string[],
  _copyConfig: CopyConfig,
  _visualConfig: VisualConfig
): Promise<GeneratedScene[]> {
  await wait(3000);
  return sceneTemplates
    .filter((scene) => selectedSceneIds.includes(scene.id))
    .map((scene) => ({
      id: `generated-${scene.id}`,
      sceneId: scene.id,
      name: scene.name,
      size: scene.size,
      width: scene.width,
      height: scene.height,
      strategy: strategies[scene.id],
      layers: baseLayers.map((layer) => ({ ...layer }))
    }));
}

export async function exportScene(_sceneId: string, _format: ExportFormat): Promise<void> {
  await wait(800);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
