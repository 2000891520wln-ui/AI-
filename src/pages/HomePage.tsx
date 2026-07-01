import { Plus } from "lucide-react";
import { ProjectCard } from "../components/ProjectCard";
import { useAppStore } from "../store/useAppStore";

export function HomePage() {
  const { recentProjects, createDraftProject } = useAppStore();
  return (
    <div className="space-y-8">
      <section className="rounded-[10px] border border-[#E5E7EB] bg-white p-10">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-bold tracking-tight">活动主 KV 一键延展工具</h2>
          <p className="mt-4 text-lg text-[#6B7280]">上传主 KV，自动生成多场景线上物料。面向运营同学的任务式、模板化延展流程。</p>
          <button type="button" onClick={createDraftProject} className="mt-8 inline-flex items-center gap-2 rounded-[8px] bg-[#111827] px-5 py-3 font-semibold text-white hover:bg-[#1F2937]">
            <Plus className="h-5 w-5" />创建活动
          </button>
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">最近项目</h2>
          <span className="text-sm text-[#6B7280]">Mock 数据</span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {recentProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      </section>
    </div>
  );
}
