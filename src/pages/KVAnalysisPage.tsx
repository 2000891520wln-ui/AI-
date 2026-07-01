import { ArrowLeft, ArrowRight } from "lucide-react";
import { KVAnalysisPanel } from "../components/KVAnalysisPanel";
import { useAppStore } from "../store/useAppStore";

const boxes = [
  { label: "主标题", x: "16%", y: "18%", w: "42%", h: "16%" },
  { label: "副标题", x: "18%", y: "38%", w: "38%", h: "10%" },
  { label: "主视觉", x: "58%", y: "20%", w: "30%", h: "48%" },
  { label: "背景", x: "5%", y: "7%", w: "90%", h: "82%" },
  { label: "Logo", x: "12%", y: "72%", w: "18%", h: "10%" },
  { label: "装饰元素", x: "74%", y: "10%", w: "18%", h: "14%" }
];

export function KVAnalysisPage() {
  const { project, kvAnalysis, updateElementUsage, goToStep } = useAppStore();
  if (!project || !kvAnalysis) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">主 KV 识别预览</h2>
          <div className="relative overflow-hidden rounded-[8px] bg-[#EEF2F7]">
            {project.kvImageUrl ? <img src={project.kvImageUrl} alt="" className="h-[560px] w-full object-cover" /> : <div className="flex h-[560px] items-center justify-center text-[#6B7280]">未上传图片，使用模拟识别区域</div>}
            {boxes.map((box) => (
              <div key={box.label} className="absolute rounded-[6px] border-2 border-[#2563EB] bg-[#2563EB]/12 px-2 py-1 text-xs font-bold text-[#1D4ED8]" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
                {box.label}
              </div>
            ))}
          </div>
        </section>
        <KVAnalysisPanel textElements={kvAnalysis.detectedTextElements} visualElements={kvAnalysis.detectedVisualElements} styleProfile={kvAnalysis.styleProfile} onChange={updateElementUsage} />
      </div>
      <div className="flex justify-between">
        <button type="button" onClick={() => goToStep("create")} className="inline-flex items-center gap-2 rounded-[8px] border border-[#D1D5DB] bg-white px-4 py-2.5 font-semibold hover:bg-[#F9FAFB]">
          <ArrowLeft className="h-4 w-4" />上一步
        </button>
        <button type="button" onClick={() => goToStep("scenes")} className="inline-flex items-center gap-2 rounded-[8px] bg-[#111827] px-5 py-2.5 font-semibold text-white hover:bg-[#1F2937]">
          确认并选择场景<ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
