import type { Scene } from "../types";

export const scenes: Scene[] = [
  {
    id: "search-aladdin",
    name: "搜索阿拉丁",
    width: 1170,
    height: 330,
    description: "搜索结果页顶部阿拉丁资源位，信息短、标题强、利益点明确，适合承接话题和活动首屏曝光。",
    safeArea: { x: 48, y: 30, width: 1074, height: 270 },
    requiredFields: ["title", "benefit", "cta"],
    templates: [
      { id: "sa-left", name: "左文右图", sceneId: "search-aladdin", tag: "稳妥通用", layoutType: "left-text-right-image", slots: ["title", "subtitle", "benefit", "visual"] },
      { id: "sa-center", name: "中心标题", sceneId: "search-aladdin", tag: "极简高级", layoutType: "center-title", slots: ["brand", "title", "cta"] },
      { id: "sa-benefit", name: "强利益点", sceneId: "search-aladdin", tag: "信息增强", layoutType: "strong-benefit", slots: ["title", "benefit", "cta", "visual"] }
    ]
  },
  {
    id: "channel-banner",
    name: "频道 Banner",
    width: 1080,
    height: 420,
    description: "横向构图、活动氛围强，适合频道页首屏运营位。",
    safeArea: { x: 58, y: 42, width: 964, height: 336 },
    requiredFields: ["title", "subtitle", "benefit"],
    templates: [
      { id: "cb-left", name: "左文右图", sceneId: "channel-banner", tag: "稳妥通用", layoutType: "left-text-right-image", slots: ["title", "subtitle", "visual"] },
      { id: "cb-bg", name: "沉浸背景", sceneId: "channel-banner", tag: "强视觉", layoutType: "immersive-bg", slots: ["title", "subtitle", "visual", "decoration"] },
      { id: "cb-benefit", name: "利益点强化", sceneId: "channel-banner", tag: "信息增强", layoutType: "strong-benefit", slots: ["title", "benefit", "cta"] }
    ]
  },
  {
    id: "topic-header",
    name: "话题头图",
    width: 1080,
    height: 608,
    description: "主题识别优先、氛围感强，适合话题页或专题页头部。",
    safeArea: { x: 72, y: 58, width: 936, height: 492 },
    requiredFields: ["title", "subtitle", "brand"],
    templates: [
      { id: "th-center", name: "中心标题", sceneId: "topic-header", tag: "稳妥通用", layoutType: "center-title", slots: ["brand", "title", "subtitle"] },
      { id: "th-stack", name: "上下结构", sceneId: "topic-header", tag: "信息增强", layoutType: "top-bottom", slots: ["title", "visual", "dateRange"] },
      { id: "th-minimal", name: "极简品牌", sceneId: "topic-header", tag: "极简高级", layoutType: "minimal-brand", slots: ["brand", "title", "visual"] }
    ]
  },
  {
    id: "h5-hero",
    name: "H5 落地页头图",
    width: 750,
    height: 900,
    description: "视觉完整度高，适合承接下方页面内容和转化按钮。",
    safeArea: { x: 54, y: 70, width: 642, height: 760 },
    requiredFields: ["title", "subtitle", "dateRange", "benefit", "cta"],
    templates: [
      { id: "h5-title", name: "大标题沉浸版", sceneId: "h5-hero", tag: "强视觉", layoutType: "hero-title", slots: ["brand", "title", "visual"] },
      { id: "h5-visual", name: "主视觉强化版", sceneId: "h5-hero", tag: "稳妥通用", layoutType: "visual-focus", slots: ["title", "visual", "benefit"] },
      { id: "h5-info", name: "信息完整版", sceneId: "h5-hero", tag: "信息增强", layoutType: "full-info", slots: ["title", "subtitle", "dateRange", "benefit", "cta"] }
    ]
  }
];

export function getScene(sceneId: string) {
  return scenes.find((scene) => scene.id === sceneId);
}

export function getTemplate(sceneId: string, templateId: string) {
  return getScene(sceneId)?.templates.find((template) => template.id === templateId);
}
