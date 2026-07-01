import { Check } from "lucide-react";
import type { Scene } from "../types";

export function SceneCard({ scene, selected, onToggle }: { scene: Scene; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`group rounded-[8px] border bg-white p-4 text-left transition ${selected ? "border-[#2563EB] ring-2 ring-[#2563EB]/15" : "border-[#E5E7EB] hover:border-[#CBD5E1]"}`}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{scene.name}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{scene.width} × {scene.height}</p>
        </div>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#D1D5DB] text-transparent"}`}>
          <Check className="h-4 w-4" />
        </span>
      </div>
      <div className="mb-4 flex h-24 items-center justify-center rounded-[6px] bg-[#F3F4F6]">
        <div className="rounded-[4px] border border-[#D1D5DB] bg-white" style={{ width: `${Math.min(160, scene.width / 6)}px`, height: `${Math.min(84, scene.height / 6)}px` }} />
      </div>
      <p className="text-sm leading-6 text-[#4B5563]">{scene.description}</p>
    </button>
  );
}
