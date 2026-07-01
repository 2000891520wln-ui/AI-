import type { StepId } from "../types";

const steps: Array<{ id: StepId; label: string }> = [
  { id: "create", label: "创建" },
  { id: "analysis", label: "解析" },
  { id: "scenes", label: "场景" },
  { id: "templates", label: "方案" },
  { id: "editor", label: "编辑导出" }
];

export function StepProgress({ current }: { current: StepId }) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === current));
  return (
    <div className="hidden items-center gap-2 lg:flex">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className={`flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-bold ${index <= activeIndex ? "bg-[#111827] text-white" : "bg-[#E5E7EB] text-[#6B7280]"}`}>
            {index + 1}
          </div>
          <span className={`text-sm ${index <= activeIndex ? "font-semibold text-[#111827]" : "text-[#6B7280]"}`}>{step.label}</span>
          {index < steps.length - 1 ? <div className="h-px w-9 bg-[#D1D5DB]" /> : null}
        </div>
      ))}
    </div>
  );
}
