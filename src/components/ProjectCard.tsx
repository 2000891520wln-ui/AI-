import { FileImage } from "lucide-react";
import type { Project } from "../types";

export function ProjectCard({ project }: { project: Project }) {
  const generatedCount = project.generatedDocuments.length || project.selectedScenes.length * 3;
  return (
    <article className="overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white">
      <div className="aspect-[16/9] bg-[#EEF2F7]">
        {project.kvImageUrl ? <img src={project.kvImageUrl} alt="" className="h-full w-full object-cover" /> : <FileImage className="m-auto h-full w-10 text-[#9CA3AF]" />}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-semibold">{project.name}</h3>
        <div className="text-sm text-[#6B7280]">{project.createdAt}</div>
        <div className="text-sm font-medium text-[#2563EB]">已生成 {generatedCount} 张物料</div>
      </div>
    </article>
  );
}
