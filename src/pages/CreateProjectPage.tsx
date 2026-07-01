import { ArrowLeft, Sparkles } from "lucide-react";
import { UploadKV } from "../components/UploadKV";
import { useAppStore } from "../store/useAppStore";
import type { ProjectFormData } from "../types";

const fields: Array<{ key: keyof ProjectFormData; label: string; placeholder: string }> = [
  { key: "title", label: "主标题", placeholder: "如：家的图解百科" },
  { key: "subtitle", label: "副标题", placeholder: "如：家的十万个为什么，这里都有答案" },
  { key: "dateRange", label: "活动时间", placeholder: "如：2026.9.5 - 2026.9.8" },
  { key: "benefit", label: "利益点", placeholder: "如：限时领取家装灵感包" },
  { key: "cta", label: "按钮文案", placeholder: "如：立即查看" },
  { key: "brand", label: "品牌/频道名", placeholder: "如：住小帮" }
];

export function CreateProjectPage() {
  const { project, updateProjectFields, analyzeProject, goToStep, notify } = useAppStore();
  if (!project) return null;
  const currentProject = project;

  function submit() {
    if (!currentProject.name.trim()) return notify("请先填写活动名称");
    analyzeProject();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_460px]">
      <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-6">
        <h2 className="mb-5 text-xl font-bold">填写活动信息</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-[#374151]">活动名称</span>
            <input value={currentProject.name} onChange={(event) => updateProjectFields({ name: event.target.value })} className="h-11 w-full rounded-[7px] border border-[#D1D5DB] px-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15" />
          </label>
          {fields.map((field) => (
            <label key={field.key}>
              <span className="mb-1 block text-sm font-medium text-[#374151]">{field.label}</span>
              <input value={currentProject.formData[field.key]} placeholder={field.placeholder} onChange={(event) => updateProjectFields({ [field.key]: event.target.value })} className="h-11 w-full rounded-[7px] border border-[#D1D5DB] px-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15" />
            </label>
          ))}
        </div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">上传主 KV 图片</h2>
          <UploadKV value={currentProject.kvImageUrl} onChange={(kvImageUrl) => updateProjectFields({ kvImageUrl })} />
        </section>
        <div className="flex justify-between gap-3">
          <button type="button" onClick={() => goToStep("home")} className="inline-flex items-center gap-2 rounded-[8px] border border-[#D1D5DB] bg-white px-4 py-2.5 font-semibold hover:bg-[#F9FAFB]">
            <ArrowLeft className="h-4 w-4" />返回
          </button>
          <button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded-[8px] bg-[#111827] px-5 py-2.5 font-semibold text-white hover:bg-[#1F2937]">
            <Sparkles className="h-4 w-4" />开始解析
          </button>
        </div>
      </aside>
    </div>
  );
}
