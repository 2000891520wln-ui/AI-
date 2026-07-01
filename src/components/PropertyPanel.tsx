import type { ProjectFormData } from "../types";
import { UploadKV } from "./UploadKV";

const fields: Array<{ key: keyof ProjectFormData; label: string; type?: string }> = [
  { key: "title", label: "主标题" },
  { key: "subtitle", label: "副标题" },
  { key: "dateRange", label: "活动时间" },
  { key: "benefit", label: "利益点" },
  { key: "cta", label: "按钮文案" },
  { key: "brand", label: "品牌/频道名" }
];

export function PropertyPanel({
  formData,
  kvImageUrl,
  backgroundColor,
  primaryColor,
  onChange,
  onColorChange
}: {
  formData: ProjectFormData;
  kvImageUrl: string;
  backgroundColor: string;
  primaryColor: string;
  onChange: (patch: Partial<ProjectFormData> & { kvImageUrl?: string }) => void;
  onColorChange: (patch: { backgroundColor?: string; primaryColor?: string }) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-4">
        <h3 className="mb-4 font-semibold">文案字段</h3>
        <div className="space-y-3">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-sm font-medium text-[#374151]">{field.label}</span>
              <input
                value={formData[field.key]}
                onChange={(event) => onChange({ [field.key]: event.target.value })}
                className="h-10 w-full rounded-[7px] border border-[#D1D5DB] bg-white px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
            </label>
          ))}
        </div>
      </section>
      <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-4">
        <h3 className="mb-4 font-semibold">主视觉图片</h3>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-[#374151]">图片 URL</span>
          <input
            value={kvImageUrl}
            placeholder="粘贴图片 URL，或使用下方上传"
            onChange={(event) => onChange({ kvImageUrl: event.target.value })}
            className="h-10 w-full rounded-[7px] border border-[#D1D5DB] bg-white px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          />
        </label>
        <UploadKV value={kvImageUrl} onChange={(kvImageUrl) => onChange({ kvImageUrl })} />
      </section>
      <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-4">
        <h3 className="mb-4 font-semibold">颜色</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[#6B7280]">背景色</span>
            <input type="color" value={backgroundColor} onChange={(event) => onColorChange({ backgroundColor: event.target.value })} className="h-10 w-full rounded border border-[#D1D5DB]" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[#6B7280]">主色</span>
            <input type="color" value={primaryColor} onChange={(event) => onColorChange({ primaryColor: event.target.value })} className="h-10 w-full rounded border border-[#D1D5DB]" />
          </label>
        </div>
      </section>
    </div>
  );
}
