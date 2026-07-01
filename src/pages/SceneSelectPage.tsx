import { ArrowLeft, Wand2 } from "lucide-react";
import { SceneCard } from "../components/SceneCard";
import { scenes } from "../data/scenes";
import { useAppStore } from "../store/useAppStore";

export function SceneSelectPage() {
  const { project, toggleScene, generateDocuments, goToStep, isGenerating, notify } = useAppStore();
  if (!project) return null;
  const currentProject = project;

  async function submit() {
    if (currentProject.selectedScenes.length === 0) return notify("请至少选择一个线上场景");
    await generateDocuments();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="grid gap-4 md:grid-cols-2">
        {scenes.map((scene) => <SceneCard key={scene.id} scene={scene} selected={currentProject.selectedScenes.includes(scene.id)} onToggle={() => toggleScene(scene.id)} />)}
      </section>
      <aside className="h-fit rounded-[8px] border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-lg font-bold">已选择场景</h2>
        <div className="mt-4 space-y-3">
          {currentProject.selectedScenes.map((sceneId) => {
            const scene = scenes.find((item) => item.id === sceneId);
            return scene ? <div key={scene.id} className="rounded-[7px] bg-[#F9FAFB] p-3 text-sm"><div className="font-semibold">{scene.name}</div><div className="text-[#6B7280]">{scene.width} × {scene.height}</div></div> : null;
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => goToStep("analysis")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#D1D5DB] bg-white px-4 py-2.5 font-semibold hover:bg-[#F9FAFB]">
            <ArrowLeft className="h-4 w-4" />上一步
          </button>
          <button type="button" disabled={isGenerating} onClick={submit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#111827] px-4 py-2.5 font-semibold text-white hover:bg-[#1F2937] disabled:opacity-60">
            <Wand2 className="h-4 w-4" />{isGenerating ? "生成中" : "生成方案"}
          </button>
        </div>
      </aside>
    </div>
  );
}
