import { ImagePlus } from "lucide-react";

export function UploadKV({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <label className="block cursor-pointer rounded-[8px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 transition hover:border-[#2563EB]">
      {value ? (
        <img src={value} alt="主 KV 预览" className="h-64 w-full rounded-[6px] object-cover" />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-[#6B7280]">
          <ImagePlus className="h-9 w-9" />
          <div className="text-sm font-medium">点击上传主 KV 图片</div>
          <div className="text-xs">支持 PNG / JPG，本地预览不会上传到服务端</div>
        </div>
      )}
      <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
    </label>
  );
}
