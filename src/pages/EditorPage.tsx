import React from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { EditorCanvas } from "../components/EditorCanvas";
import { LayerPanel } from "../components/LayerPanel";
import { PropertyPanel } from "../components/PropertyPanel";
import { getScene, getTemplate } from "../data/scenes";
import { useAppStore } from "../store/useAppStore";
import { exportDesignAsPng } from "../utils/exportImage";

export function EditorPage() {
  const { project, selectedDocumentId, selectDocument, goToStep, updateProjectFields, updateLayerState, updateDocumentColors, notify } = useAppStore();
  const canvasRef = React.useRef<HTMLDivElement>(null);
  if (!project) return null;
  const currentProject = project;
  const document = currentProject.generatedDocuments.find((item) => item.id === selectedDocumentId) || currentProject.generatedDocuments[0];
  if (!document) return null;
  const scene = getScene(document.sceneId);
  const template = getTemplate(document.sceneId, document.templateId);

  async function exportCurrent() {
    const result = await exportDesignAsPng(canvasRef.current, currentProject, document);
    notify(result.ok ? `已生成 PNG：${result.fileName}` : "导出失败，请重试");
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F6F7F9] text-[#111827]">
      <header className="flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white px-5">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => goToStep("templates")} className="inline-flex items-center gap-2 rounded-[7px] border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">
            <ArrowLeft className="h-4 w-4" />返回
          </button>
          <div>
            <div className="font-semibold">{currentProject.name}</div>
            <div className="text-xs text-[#6B7280]">{scene?.name} / {document.canvas.width} × {document.canvas.height}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => notify("已重新生成当前方案的 3 个模板（mock）")} className="inline-flex items-center gap-2 rounded-[7px] border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">
            <RefreshCw className="h-4 w-4" />重新生成
          </button>
          <button type="button" onClick={exportCurrent} className="inline-flex items-center gap-2 rounded-[7px] bg-[#111827] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1F2937]">
            <Download className="h-4 w-4" />导出 PNG
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="overflow-auto border-r border-[#E5E7EB] bg-white p-4">
          <h2 className="mb-3 font-semibold">场景与模板</h2>
          <div className="space-y-5">
            {currentProject.selectedScenes.map((sceneId) => {
              const currentScene = getScene(sceneId);
              const documents = currentProject.generatedDocuments.filter((item) => item.sceneId === sceneId);
              return (
                <section key={sceneId}>
                  <div className="mb-2 text-sm font-semibold text-[#374151]">{currentScene?.name}</div>
                  <div className="space-y-2">
                    {documents.map((item) => {
                      const itemTemplate = getTemplate(item.sceneId, item.templateId);
                      const active = item.id === document.id;
                      return (
                        <button key={item.id} type="button" onClick={() => selectDocument(item.id)} className={`w-full rounded-[7px] border px-3 py-2 text-left text-sm ${active ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]" : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]"}`}>
                          <div className="font-semibold">{itemTemplate?.name}</div>
                          <div className="text-xs text-[#6B7280]">{currentScene?.width} × {currentScene?.height}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </aside>
        <main className="min-w-0 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{template?.name}</h2>
              <p className="text-sm text-[#6B7280]">安全区以蓝色虚线标注，当前版本通过表单编辑内容。</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#2563EB]">{template?.tag}</span>
          </div>
          <EditorCanvas document={document} canvasRef={canvasRef} />
        </main>
        <aside className="overflow-auto border-l border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <PropertyPanel
            formData={currentProject.formData}
            kvImageUrl={currentProject.kvImageUrl}
            backgroundColor={document.canvas.backgroundColor}
            primaryColor={String(document.layers.find((layer) => layer.role === "title")?.style.color || "#111827")}
            onChange={updateProjectFields}
            onColorChange={(patch) => updateDocumentColors(document.id, patch)}
          />
          <div className="mt-5">
            <LayerPanel document={document} onUpdateLayer={(layerId, patch) => updateLayerState(document.id, layerId, patch)} />
          </div>
        </aside>
      </div>
    </div>
  );
}
