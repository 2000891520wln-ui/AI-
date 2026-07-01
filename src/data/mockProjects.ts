import type { Project } from "../types";

export const mockProjects: Project[] = [
  {
    id: "recent-1",
    name: "家居百科秋季活动",
    createdAt: "2026-05-20 14:26",
    kvImageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=640&q=80",
    formData: {
      title: "家的图解百科",
      subtitle: "家的十万个为什么，这里都有答案",
      dateRange: "2026.9.5 - 2026.9.8",
      benefit: "爆款好物限时 8 折",
      cta: "立即查看",
      brand: "住小帮"
    },
    selectedScenes: ["search-aladdin", "channel-banner"],
    generatedDocuments: []
  },
  {
    id: "recent-2",
    name: "开学季焕新计划",
    createdAt: "2026-05-18 10:12",
    kvImageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=640&q=80",
    formData: {
      title: "开学焕新计划",
      subtitle: "学习装备一次配齐",
      dateRange: "2026.8.20 - 2026.9.10",
      benefit: "满 300 减 50",
      cta: "去挑选",
      brand: "商城频道"
    },
    selectedScenes: ["h5-hero"],
    generatedDocuments: []
  }
];
