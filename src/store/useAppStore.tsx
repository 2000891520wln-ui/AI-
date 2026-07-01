import React from "react";
import { mockProjects } from "../data/mockProjects";
import { scenes } from "../data/scenes";
import { applyProjectFieldsToDocument, mockAnalyzeKV, mockGenerateDesignDocuments } from "../utils/mockGenerate";
import type { DesignDocument, ElementUsage, KVAnalysis, Project, ProjectFormData, StepId } from "../types";

type AppState = {
  step: StepId;
  project: Project | null;
  kvAnalysis: KVAnalysis | null;
  recentProjects: Project[];
  selectedDocumentId: string | null;
  isGenerating: boolean;
  toast: string | null;
  goToStep: (step: StepId) => void;
  createDraftProject: () => void;
  updateProjectFields: (patch: Partial<ProjectFormData> & { name?: string; kvImageUrl?: string }) => void;
  analyzeProject: () => void;
  updateElementUsage: (id: string, usage: ElementUsage) => void;
  toggleScene: (sceneId: string) => void;
  generateDocuments: () => Promise<void>;
  selectDocument: (documentId: string) => void;
  updateLayerState: (documentId: string, layerId: string, patch: { visible?: boolean; locked?: boolean }) => void;
  updateDocumentColors: (documentId: string, patch: { backgroundColor?: string; primaryColor?: string }) => void;
  notify: (message: string) => void;
};

const StoreContext = React.createContext<AppState | null>(null);

const emptyForm: ProjectFormData = {
  title: "家的图解百科",
  subtitle: "家的十万个为什么，这里都有答案",
  dateRange: "2026.9.5 - 2026.9.8",
  benefit: "限时领取家装灵感包",
  cta: "立即查看",
  brand: "住小帮"
};

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = React.useState<StepId>("home");
  const [project, setProject] = React.useState<Project | null>(null);
  const [kvAnalysis, setKvAnalysis] = React.useState<KVAnalysis | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastRef = React.useRef<number | null>(null);

  function notify(message: string) {
    if (toastRef.current) window.clearTimeout(toastRef.current);
    setToast(message);
    toastRef.current = window.setTimeout(() => setToast(null), 1800);
  }

  function createDraftProject() {
    setProject({
      id: `project-${Date.now()}`,
      name: "家居百科秋季活动",
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      kvImageUrl: "",
      formData: emptyForm,
      selectedScenes: [scenes[0].id],
      generatedDocuments: []
    });
    setKvAnalysis(null);
    setSelectedDocumentId(null);
    setStep("create");
  }

  function updateProjectFields(patch: Partial<ProjectFormData> & { name?: string; kvImageUrl?: string }) {
    setProject((current) => {
      if (!current) return current;
      const next: Project = {
        ...current,
        name: patch.name ?? current.name,
        kvImageUrl: patch.kvImageUrl ?? current.kvImageUrl,
        formData: {
          ...current.formData,
          ...patch
        }
      };
      next.generatedDocuments = current.generatedDocuments.map((document) => applyProjectFieldsToDocument(document, next));
      return next;
    });
  }

  function analyzeProject() {
    if (!project) return;
    setKvAnalysis(mockAnalyzeKV(project));
    setStep("analysis");
  }

  function updateElementUsage(id: string, usage: ElementUsage) {
    setKvAnalysis((current) => {
      if (!current) return current;
      return {
        ...current,
        detectedTextElements: current.detectedTextElements.map((item) => (item.id === id ? { ...item, usage } : item)),
        detectedVisualElements: current.detectedVisualElements.map((item) => (item.id === id ? { ...item, usage } : item))
      };
    });
  }

  function toggleScene(sceneId: string) {
    setProject((current) => {
      if (!current) return current;
      const selected = current.selectedScenes.includes(sceneId)
        ? current.selectedScenes.filter((id) => id !== sceneId)
        : [...current.selectedScenes, sceneId];
      return { ...current, selectedScenes: selected };
    });
  }

  async function generateDocuments() {
    if (!project || !kvAnalysis || project.selectedScenes.length === 0) return;
    setIsGenerating(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    const generatedDocuments = mockGenerateDesignDocuments(project, kvAnalysis, project.selectedScenes);
    setProject((current) => (current ? { ...current, generatedDocuments } : current));
    setSelectedDocumentId(generatedDocuments[0]?.id ?? null);
    setIsGenerating(false);
    setStep("templates");
  }

  function selectDocument(documentId: string) {
    setSelectedDocumentId(documentId);
  }

  function updateLayerState(documentId: string, layerId: string, patch: { visible?: boolean; locked?: boolean }) {
    setProject((current) => {
      if (!current) return current;
      return {
        ...current,
        generatedDocuments: current.generatedDocuments.map((document): DesignDocument => {
          if (document.id !== documentId) return document;
          return {
            ...document,
            layers: document.layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer))
          };
        })
      };
    });
  }

  function updateDocumentColors(documentId: string, patch: { backgroundColor?: string; primaryColor?: string }) {
    setProject((current) => {
      if (!current) return current;
      return {
        ...current,
        generatedDocuments: current.generatedDocuments.map((document): DesignDocument => {
          if (document.id !== documentId) return document;
          return {
            ...document,
            canvas: {
              ...document.canvas,
              backgroundColor: patch.backgroundColor ?? document.canvas.backgroundColor
            },
            layers: document.layers.map((layer) => {
              if (patch.backgroundColor && layer.role === "background") {
                return { ...layer, style: { ...layer.style, fill: patch.backgroundColor } };
              }
              if (patch.primaryColor && ["title", "brand", "cta"].includes(layer.role)) {
                return {
                  ...layer,
                  style: {
                    ...layer.style,
                    color: layer.role === "cta" ? "#FFFFFF" : patch.primaryColor,
                    background: layer.role === "cta" ? patch.primaryColor : layer.style.background
                  }
                };
              }
              return layer;
            })
          };
        })
      };
    });
  }

  const value: AppState = {
    step,
    project,
    kvAnalysis,
    recentProjects: mockProjects,
    selectedDocumentId,
    isGenerating,
    toast,
    goToStep: setStep,
    createDraftProject,
    updateProjectFields,
    analyzeProject,
    updateElementUsage,
    toggleScene,
    generateDocuments,
    selectDocument,
    updateLayerState,
    updateDocumentColors,
    notify
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const store = React.useContext(StoreContext);
  if (!store) throw new Error("useAppStore must be used within AppStoreProvider");
  return store;
}
