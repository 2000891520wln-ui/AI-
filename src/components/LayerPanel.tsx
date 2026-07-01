import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import type { DesignDocument } from "../types";

const roleLabels: Record<string, string> = {
  background: "背景层",
  backgroundTint: "背景层",
  mainVisual: "主视觉层",
  title: "主标题层",
  subtitle: "副标题层",
  benefit: "利益点层",
  cta: "按钮层",
  decoration: "装饰层",
  brand: "品牌层",
  dateRange: "活动时间层"
};

export function LayerPanel({
  document,
  onUpdateLayer
}: {
  document: DesignDocument;
  onUpdateLayer: (layerId: string, patch: { visible?: boolean; locked?: boolean }) => void;
}) {
  return (
    <details className="rounded-[8px] border border-[#E5E7EB] bg-white p-4" open>
      <summary className="cursor-pointer font-semibold">高级图层</summary>
      <div className="mt-4 space-y-2">
        {[...document.layers].sort((a, b) => b.zIndex - a.zIndex).map((layer) => (
          <div key={layer.id} className="flex items-center justify-between gap-2 rounded-[7px] bg-[#F9FAFB] px-3 py-2">
            <span className="truncate text-sm font-medium">{roleLabels[layer.role] || layer.role}</span>
            <div className="flex gap-1">
              <button type="button" title="显示/隐藏" onClick={() => onUpdateLayer(layer.id, { visible: !layer.visible })} className="rounded p-1.5 hover:bg-[#E5E7EB]">
                {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-[#9CA3AF]" />}
              </button>
              <button type="button" title="锁定/解锁" onClick={() => onUpdateLayer(layer.id, { locked: !layer.locked })} className="rounded p-1.5 hover:bg-[#E5E7EB]">
                {layer.locked ? <Lock className="h-4 w-4 text-[#9CA3AF]" /> : <Unlock className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
