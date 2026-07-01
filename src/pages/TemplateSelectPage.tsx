import { ArrowLeft } from "lucide-react";
import { TemplateCard } from "../components/TemplateCard";
import { scenes } from "../data/scenes";
import { useAppStore } from "../store/useAppStore";

export function TemplateSelectPage() {
  const { project, selectDocument, goToStep } = useAppStore();
  if (!project) return null;

  return (
    <div className="space-y-8">
      {project.generatedDocuments.length === 0 ? (
        <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-8 text-center">
          <p className="text-[#6B7280]">还没有生成方案，请先选择场景。</p>
          <button type="button" onClick={() => goToStep("scenes")} className="mt-4 rounded-[8px] bg-[#111827] px-4 py-2.5 font-semibold text-white">去选择场景</button>
        </div>
      ) : (
        scenes.filter((scene) => project.selectedScenes.includes(scene.id)).map((scene) => (
          <section key={scene.id}>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold">{scene.name}</h2>
                <p className="mt-1 text-sm text-[#6B7280]">{scene.description}</p>
              </div>
              <span className="text-sm font-medium text-[#6B7280]">{scene.width} × {scene.height}</span>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {project.generatedDocuments.filter((document) => document.sceneId === scene.id).map((document) => (
                <TemplateCard
                  key={document.id}
                  document={document}
                  onSelect={() => selectDocument(document.id)}
                  onEdit={() => {
                    selectDocument(document.id);
                    goToStep("editor");
                  }}
                />
              ))}
            </div>
          </section>
        ))
      )}
      <button type="button" onClick={() => goToStep("scenes")} className="inline-flex items-center gap-2 rounded-[8px] border border-[#D1D5DB] bg-white px-4 py-2.5 font-semibold hover:bg-[#F9FAFB]">
        <ArrowLeft className="h-4 w-4" />上一步
      </button>
    </div>
  );
}
