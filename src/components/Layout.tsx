import { useAppStore } from "../store/useAppStore";
import type { StepId } from "../types";
import { StepProgress } from "./StepProgress";

const titles: Record<StepId, string> = {
  home: "活动主 KV 一键延展工具",
  create: "创建活动",
  analysis: "主 KV 解析确认",
  scenes: "选择线上场景",
  templates: "选择延展方案",
  editor: "轻量编辑器"
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { step } = useAppStore();
  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <header className="border-b border-[#E5E7EB] bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-4">
          <div>
            <div className="text-sm font-semibold text-[#2563EB]">KV Extend MVP</div>
            <h1 className="text-xl font-bold tracking-tight">{titles[step]}</h1>
          </div>
          {step !== "home" ? <StepProgress current={step} /> : null}
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-8 py-8">{children}</main>
    </div>
  );
}
