import type { ElementUsage, KVDetectedElement, KVVisualElement, StyleProfile } from "../types";

const usageLabels: Array<{ value: ElementUsage; label: string }> = [
  { value: "keep", label: "保留" },
  { value: "style-only", label: "仅参考风格" },
  { value: "unused", label: "不使用" }
];

export function KVAnalysisPanel({
  textElements,
  visualElements,
  styleProfile,
  onChange
}: {
  textElements: KVDetectedElement[];
  visualElements: KVVisualElement[];
  styleProfile: StyleProfile;
  onChange: (id: string, usage: ElementUsage) => void;
}) {
  return (
    <div className="space-y-5">
      <ElementGroup title="文案元素" items={textElements} onChange={onChange} />
      <ElementGroup title="视觉元素" items={visualElements} onChange={onChange} />
      <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-4">
        <h3 className="mb-3 font-semibold">风格元素</h3>
        <div className="space-y-3 text-sm">
          <div>
            <div className="mb-2 text-[#6B7280]">色彩风格</div>
            <div className="flex gap-2">{styleProfile.colors.map((color) => <span key={color} className="h-7 w-7 rounded-full border border-[#D1D5DB]" style={{ background: color }} />)}</div>
          </div>
          <Info label="版式风格" value={styleProfile.layoutStyle} />
          <Info label="信息密度" value={styleProfile.density} />
          <Info label="整体氛围" value={styleProfile.mood} />
        </div>
      </section>
    </div>
  );
}

function ElementGroup({ title, items, onChange }: { title: string; items: KVDetectedElement[]; onChange: (id: string, usage: ElementUsage) => void }) {
  return (
    <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-[7px] bg-[#F9FAFB] p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-sm text-[#6B7280]">{item.value}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {usageLabels.map((usage) => (
                <button key={usage.value} type="button" onClick={() => onChange(item.id, usage.value)} className={`rounded-[6px] border px-2 py-1.5 text-xs font-semibold ${item.usage === usage.value ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]" : "border-[#E5E7EB] bg-white text-[#6B7280]"}`}>
                  {usage.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] pt-3">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
