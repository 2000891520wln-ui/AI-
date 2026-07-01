import { Edit3, MousePointer2 } from "lucide-react";
import type { DesignDocument } from "../types";
import { getScene, getTemplate } from "../data/scenes";
import { EditorCanvas } from "./EditorCanvas";

export function TemplateCard({ document, onSelect, onEdit }: { document: DesignDocument; onSelect: () => void; onEdit: () => void }) {
  const scene = getScene(document.sceneId);
  const template = getTemplate(document.sceneId, document.templateId);
  return (
    <article className="rounded-[8px] border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{template?.name}</h4>
          <p className="mt-1 text-sm text-[#6B7280]">{scene?.width} × {scene?.height}</p>
        </div>
        <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">{template?.tag}</span>
      </div>
      <div className="mb-4 rounded-[8px] bg-[#F3F4F6] p-4">
        <EditorCanvas document={document} previewOnly />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onSelect} className="inline-flex items-center justify-center gap-2 rounded-[7px] border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">
          <MousePointer2 className="h-4 w-4" />选择
        </button>
        <button type="button" onClick={onEdit} className="inline-flex items-center justify-center gap-2 rounded-[7px] bg-[#111827] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1F2937]">
          <Edit3 className="h-4 w-4" />编辑
        </button>
      </div>
    </article>
  );
}
