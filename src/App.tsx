import React from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Figma,
  FileImage,
  Layers3,
  Link2,
  Lock,
  RefreshCw,
  Share2,
  Sparkles,
  Unlock
} from "lucide-react";
import {
  analysisSteps,
  analyzeMainKV,
  defaultCopyConfig,
  defaultVisualConfig,
  exportScene,
  generateScenes,
  generationSteps,
  sceneTemplates
} from "./data/studioMock";
import type { AppStatus, CopyConfig, ExportFormat, GeneratedScene, KVAnalysis, LayerNode, SceneTemplate, VisualConfig } from "./types/studio";

type InspectorTab = "layers" | "export";
type WorkflowStepId = "upload" | "analyze" | "select" | "export";

const projectName = "家的图解百科";
const HOME_KV_FIGMA_NODE_ID = "1564:6485";
const UNTITLED_HOME_KV_FIGMA_FILE_KEY = "nmxu51NeOK4MyZvTd0Rjgl";
const UNTITLED_HOME_KV_FIGMA_NODE_ID = "1:2";
const SEARCH_RESULT_FIGMA_NODE_ID = "2065:1407";
const figmaHomeKvAssets = {
  mainPhoto: "/figma-assets/home-kv-main-photo.png",
  heartLogo: "/figma-assets/home-kv-heart-logo.png",
  untitledScreenshot: "/figma-assets/untitled-home-kv-screenshot.png",
  searchAladdinTemplate: "/figma-assets/search-aladdin-template.png"
};
const figmaAnalysisSteps = [
  "正在读取 Figma fileKey 与 node-id",
  "正在扫描节点树中的 Frame 图层",
  "正在按 Frame 边界建立最小组件单元",
  "正在过滤 Text / Vector / Image 等 Frame 内部子层",
  "正在生成可复用 Frame 组件清单"
];

type UploadedKV = {
  source: "image" | "figma";
  file: File | null;
  name: string;
  type: string;
  width: number;
  height: number;
  dataUrl: string;
  previewImageUrl?: string | null;
  figmaUrl?: string;
  fileKey?: string;
  nodeId?: string;
  figmaFrames?: FigmaFrameUnit[];
};

type FigmaFrameUnit = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hidden?: boolean;
  depth: number;
  role: string;
  previewImageUrl?: string | null;
};

export default function App() {
  const [status, setStatus] = React.useState<AppStatus>("empty");
  const [analysis, setAnalysis] = React.useState<KVAnalysis | null>(null);
  const [copyConfig, setCopyConfig] = React.useState<CopyConfig>(defaultCopyConfig);
  const [visualConfig, setVisualConfig] = React.useState<VisualConfig>(defaultVisualConfig);
  const [selectedSceneIds, setSelectedSceneIds] = React.useState<string[]>([]);
  const [generatedScenes, setGeneratedScenes] = React.useState<GeneratedScene[]>([]);
  const [activeSceneId, setActiveSceneId] = React.useState("search-aladdin");
  const [inspectorTab, setInspectorTab] = React.useState<InspectorTab>("layers");
  const [activeProgress, setActiveProgress] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>("PNG");
  const [exportScale, setExportScale] = React.useState("2x");
  const [transparentBg, setTransparentBg] = React.useState(false);
  const [keepSafeArea, setKeepSafeArea] = React.useState(true);
  const [uploadedKV, setUploadedKV] = React.useState<UploadedKV | null>(null);
  const [selectedFigmaFrameIds, setSelectedFigmaFrameIds] = React.useState<string[]>([]);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(null);
  const toastTimer = React.useRef<number | null>(null);

  const activeScene = generatedScenes.find((scene) => scene.sceneId === activeSceneId) || generatedScenes[0];

  React.useEffect(() => {
    setSelectedLayerId((current) => {
      if (current && activeScene?.layers.some((layer) => layer.id === current)) return current;
      return activeScene?.layers[0]?.id || null;
    });
  }, [activeScene]);

  React.useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const figmaText = event.clipboardData?.getData("text")?.trim();
      if (figmaText && parseFigmaUrl(figmaText)) {
        event.preventDefault();
        void handleFigmaImport(figmaText);
      }
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function notify(message: string) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }

  async function handleFigmaImport(figmaUrl: string) {
    const parsed = parseFigmaUrl(figmaUrl);
    if (!parsed) {
      notify("请输入有效的 Figma 文件或节点链接");
      return;
    }
    const normalizedNodeId = normalizeFigmaNodeId(parsed.nodeId);
    setStatus("analyzing");
    setActiveProgress(0);
    const figmaNode = await requestFigmaNodeParse(parsed.fileKey, normalizedNodeId).catch((error) => {
      notify(error instanceof Error ? `真实 Figma 读取失败，已使用本地兜底：${error.message}` : "真实 Figma 读取失败，已使用本地兜底");
      return null;
    });
    const sourceNodeId = normalizeFigmaNodeId(figmaNode?.nodeId || parsed.nodeId);
    const isHomeKvNode = isHomeKvFigmaSource(parsed.fileKey, sourceNodeId);
    const isSearchResultNode = sourceNodeId === SEARCH_RESULT_FIGMA_NODE_ID;
    const uploaded: UploadedKV = {
      source: "figma",
      file: null,
      name: figmaNode?.name || (isHomeKvNode ? "Frame 108 / 家的图解百科主 KV" : parsed.nodeId ? `Figma Node ${parsed.nodeId}` : `Figma File ${parsed.fileKey}`),
      type: "FIGMA",
      width: figmaNode?.width || (isHomeKvNode ? 1125 : isSearchResultNode ? 1170 : 1080),
      height: figmaNode?.height || (isHomeKvNode ? 1611 : isSearchResultNode ? 2532 : 1920),
      dataUrl: "",
      previewImageUrl: figmaNode?.previewImageUrl || null,
      figmaUrl,
      fileKey: parsed.fileKey,
      nodeId: sourceNodeId || parsed.nodeId,
      figmaFrames: figmaNode?.frames?.length ? figmaNode.frames : createMockFigmaFrameUnits(parsed.fileKey, parsed.nodeId)
    };
    setUploadedKV(uploaded);
    setSelectedFigmaFrameIds(getDefaultSelectedFrameIds(uploaded.figmaFrames || []));
    setAnalysis(null);
    setGeneratedScenes([]);
    notify(figmaNode ? "已读取 Figma 图层，正在 AI 拆解 Frame 单元" : "已接入 Figma 链接，正在使用本地兜底拆解");
    await analyzeUploadedKV(uploaded);
  }

  async function startAnalyze() {
    if (!uploadedKV) {
      notify("请先上传或粘贴主 KV");
      return;
    }
    await analyzeUploadedKV(uploadedKV);
  }

  async function analyzeUploadedKV(targetKV: UploadedKV) {
    setStatus("analyzing");
    const steps = targetKV.source === "figma" ? figmaAnalysisSteps : analysisSteps;
    const progress = runProgress(steps, 2500);
    const result = await analyzeMainKV(targetKV.file);
    await progress;
    setAnalysis(result);
    setCopyConfig({
      ...defaultCopyConfig,
      title: result.copy.title,
      subtitle: result.copy.subtitle,
      date: result.copy.date,
      topic: `#${result.copy.title}`
    });
    setVisualConfig((current) => ({
      ...current,
      colors: {
        ...current.colors,
        background: result.style.colors[0],
        title: result.style.colors[1],
        yellow: result.style.colors[2],
        blue: result.style.colors[3],
        red: result.style.colors[4]
      }
    }));
    setStatus("analyzed");
  }

  async function startGenerate() {
    if (!analysis || selectedSceneIds.length === 0) {
      notify("请至少选择一个延展场景");
      return;
    }
    setStatus("generating");
    const progress = runProgress(generationSteps, 3000);
    const scenes = await generateScenes(analysis, selectedSceneIds, copyConfig, visualConfig);
    await progress;
    const nextScenes =
      uploadedKV?.source === "figma" && uploadedKV.figmaFrames?.length
        ? scenes.map((scene) => ({
            ...scene,
            layers: getSelectedFigmaFrames(uploadedKV.figmaFrames || [], selectedFigmaFrameIds)
              .filter((frame) => !(scene.sceneId === "search-aladdin" && getFrameLayerId(frame) === "time"))
              .map((frame) => ({
                ...createGeneratedLayerFromFrame(frame, scene.sceneId)
              }))
          }))
        : scenes;
    setGeneratedScenes(nextScenes);
    setActiveSceneId(nextScenes[0]?.sceneId || "search-aladdin");
    setSelectedLayerId(nextScenes[0]?.layers[0]?.id || null);
    setInspectorTab("layers");
    setStatus("generated");
  }

  async function runProgress(steps: string[], totalMs: number) {
    const perStep = Math.floor(totalMs / steps.length);
    for (let index = 0; index < steps.length; index += 1) {
      setActiveProgress(index);
      await new Promise((resolve) => window.setTimeout(resolve, perStep));
    }
  }

  async function exportOne(scene = activeScene, format = exportFormat) {
    if (!scene) return;
    await exportScene(scene.sceneId, format);
    notify(`已模拟导出 ${scene.name} ${format}（${exportScale}）`);
  }

  async function exportAll() {
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    notify(`已模拟批量导出 ${generatedScenes.length || selectedSceneIds.length} 个场景`);
  }

  function updateLayer(sceneId: string, layerId: string, patch: Partial<LayerNode>) {
    setGeneratedScenes((current) =>
      current.map((scene) =>
        scene.sceneId === sceneId
          ? { ...scene, layers: scene.layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)) }
          : scene
      )
    );
  }

  function goToWorkflowStep(stepId: WorkflowStepId) {
    if (status === "analyzing" || status === "generating") return;

    if (stepId === "upload") {
      setStatus(uploadedKV ? "uploaded" : "empty");
      return;
    }

    if (stepId === "analyze" && analysis) {
      setStatus("analyzed");
      return;
    }

    if (stepId === "select" && analysis) {
      setStatus("selecting");
      return;
    }

    if (stepId === "export" && generatedScenes.length > 0) {
      setStatus("generated");
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <Header status={status} onExport={() => exportOne()} onBatchExport={exportAll} />
      <StepSidebar
        status={status}
        analysis={analysis}
        generatedScenes={generatedScenes}
        onStepClick={goToWorkflowStep}
      />
      <div className={`grid h-[calc(100vh-152px)] ${status === "generated" ? "grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"}`}>
        <main className="min-w-0 overflow-auto p-6">
          {status === "empty" || status === "uploaded" ? (
            <UploadPanel status={status} uploadedKV={uploadedKV} onFigmaImport={handleFigmaImport} onAnalyze={startAnalyze} />
          ) : null}
          {status === "analyzing" ? (
            <ProgressPanel
              title={uploadedKV?.source === "figma" ? "AI 正在拆解 Figma Frame 图层" : "AI 正在拆解主 KV"}
              steps={uploadedKV?.source === "figma" ? figmaAnalysisSteps : analysisSteps}
              activeIndex={activeProgress}
            />
          ) : null}
          {status === "analyzed" && analysis ? (
            <AnalysisPanel analysis={analysis} uploadedKV={uploadedKV} kvImageUrl={uploadedKV?.dataUrl} selectedFrameIds={selectedFigmaFrameIds} setSelectedFrameIds={setSelectedFigmaFrameIds} onNext={() => setStatus("selecting")} />
          ) : null}
          {status === "selecting" ? (
            <SceneSelector selectedSceneIds={selectedSceneIds} onToggle={(id) => setSelectedSceneIds((current) => toggleValue(current, id))} onGenerate={startGenerate} />
          ) : null}
          {status === "generating" ? <ProgressPanel title="正在生成延展应用" steps={generationSteps} activeIndex={activeProgress} /> : null}
          {status === "generated" ? (
            <GeneratedSceneGrid
              scenes={generatedScenes}
              activeSceneId={activeSceneId}
              copyConfig={copyConfig}
              visualConfig={visualConfig}
              kvImageUrl={uploadedKV?.dataUrl}
              uploadedKV={uploadedKV}
              selectedFrameIds={selectedFigmaFrameIds}
              selectedLayerId={selectedLayerId}
              setSelectedLayerId={setSelectedLayerId}
              updateLayer={updateLayer}
              onSelect={(sceneId) => {
                setActiveSceneId(sceneId);
                setInspectorTab("layers");
              }}
              onExport={(scene) => exportOne(scene, "PNG")}
              onRegenerate={startGenerate}
              onBatchExport={exportAll}
            />
          ) : null}
        </main>
        {status === "generated" ? (
          <RightInspector
            status={status}
            activeScene={activeScene}
            tab={inspectorTab}
            onTabChange={setInspectorTab}
            selectedLayerId={selectedLayerId}
            setSelectedLayerId={setSelectedLayerId}
            updateLayer={updateLayer}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            exportScale={exportScale}
            setExportScale={setExportScale}
            transparentBg={transparentBg}
            setTransparentBg={setTransparentBg}
            keepSafeArea={keepSafeArea}
            setKeepSafeArea={setKeepSafeArea}
            onExport={() => exportOne()}
            onBatchExport={exportAll}
          />
        ) : null}
      </div>
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Header({ status, onExport, onBatchExport }: { status: AppStatus; onExport: () => void; onBatchExport: () => void }) {
  const label = status === "generated" ? "Generated" : status === "analyzed" || status === "selecting" ? "AI Ready" : "Draft";
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-[#E5E7EB] bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111827] text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-black tracking-tight">KV Extend Studio</div>
          <div className="text-xs font-medium text-[#6B7280]">Campaign Visual Expansion Engine</div>
        </div>
        <div className="ml-4 h-8 w-px bg-[#E5E7EB]" />
        <div>
          <div className="text-sm font-semibold">{projectName}</div>
          <div className="text-xs text-[#6B7280]">当前项目</div>
        </div>
        <span className="rounded-full bg-[#FFF1F2] px-3 py-1 text-xs font-bold text-[#FE2C55]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">保存草稿</button>
        <button onClick={onExport} className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">
          <Download className="h-4 w-4" />导出
        </button>
        <button onClick={onBatchExport} className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1F2937]">
          <Share2 className="h-4 w-4" />分享
        </button>
      </div>
    </header>
  );
}

function StepSidebar({
  status,
  analysis,
  generatedScenes,
  onStepClick
}: {
  status: AppStatus;
  analysis: KVAnalysis | null;
  generatedScenes: GeneratedScene[];
  onStepClick: (stepId: WorkflowStepId) => void;
}) {
  const baseSteps: Array<{ id: WorkflowStepId; label: string; active: boolean; done: boolean }> = [
    { id: "upload", label: "上传主 KV", active: ["empty", "uploaded"].includes(status), done: !["empty", "uploaded"].includes(status) },
    { id: "analyze", label: "AI 拆解", active: ["analyzing", "analyzed"].includes(status), done: ["analyzed", "selecting", "generating", "generated"].includes(status) },
    { id: "select", label: "选择场景", active: status === "selecting", done: ["generating", "generated"].includes(status) },
    { id: "export", label: "生成与导出", active: ["generating", "generated"].includes(status), done: status === "generated" }
  ];
  const steps = baseSteps.map((step) => ({
    ...step,
    enabled:
      status !== "analyzing" &&
      status !== "generating" &&
      (step.id === "upload" ||
        (step.id === "analyze" && Boolean(analysis)) ||
        (step.id === "select" && Boolean(analysis)) ||
        (step.id === "export" && generatedScenes.length > 0))
  }));
  return (
    <nav className="border-b border-[#E5E7EB] bg-white px-6 py-3">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              type="button"
              disabled={!step.enabled}
              onClick={() => onStepClick(step.id)}
              className={`flex w-[210px] shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                step.active ? "bg-[#FFF1F2]" : step.enabled ? "hover:bg-[#F9FAFB]" : "opacity-55"
              } ${step.enabled ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? "bg-[#111827] text-white" : step.active ? "bg-[#FE2C55] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                {step.done ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`truncate text-sm font-black ${step.enabled || step.active ? "text-[#111827]" : "text-[#9CA3AF]"}`}>{step.label}</span>
            </button>
            {index < steps.length - 1 ? <div className="mx-5 h-px flex-1 border-t border-dashed border-[#D1D5DB]" /> : null}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

function InfoBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="mb-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <div className="space-y-1 text-xs leading-5 text-[#6B7280]">
        {lines.map((line) => <div key={line}>{line}</div>)}
      </div>
    </section>
  );
}

function UploadPanel({
  status,
  uploadedKV,
  onFigmaImport,
  onAnalyze
}: {
  status: AppStatus;
  uploadedKV: UploadedKV | null;
  onFigmaImport: (figmaUrl: string) => void | Promise<void>;
  onAnalyze: () => void;
}) {
  const [figmaUrl, setFigmaUrl] = React.useState("");

  function handleFigmaPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text").trim();
    if (!parseFigmaUrl(text)) return;
    event.preventDefault();
    event.stopPropagation();
    setFigmaUrl(text);
    void onFigmaImport(text);
  }

  function handleFigmaBlur() {
    if (!parseFigmaUrl(figmaUrl)) return;
    if (uploadedKV?.source === "figma" && uploadedKV.figmaUrl === figmaUrl.trim()) return;
    void onFigmaImport(figmaUrl);
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1500px]">
      <section className="flex min-h-[calc(100vh-200px)] w-full rounded-3xl border border-[#E5E7EB] bg-white p-10 shadow-sm">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="max-w-[820px]">
            <h1 className="text-4xl font-black tracking-tight">接入 Figma 主 KV，开始智能延展</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#6B7280]">
              粘贴 Figma 文件链接或节点链接后，系统会自动读取节点信息，并把业务 Frame 拆解为后续延展的最小组件单元。
            </p>
            <div className="mt-10 rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] p-8">
              <div className="mb-5 flex items-center gap-2 text-base font-black">
                <Figma className="h-4 w-4 text-[#FE2C55]" />
                Figma 接入
              </div>
              <div className="flex gap-2">
                <input
                  value={figmaUrl}
                  onChange={(event) => setFigmaUrl(event.target.value)}
                  onPaste={handleFigmaPaste}
                  onBlur={handleFigmaBlur}
                  placeholder="粘贴 Figma 文件链接或节点链接"
                  className="h-14 min-w-0 flex-1 rounded-2xl border border-[#FE2C55] bg-white px-4 text-base outline-none focus:ring-4 focus:ring-[#FE2C55]/10"
                />
                <button
                  type="button"
                  onClick={() => void onFigmaImport(figmaUrl)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-6 text-base font-black text-white hover:bg-[#1F2937]"
                >
                  <Link2 className="h-4 w-4" />
                  接入
                </button>
              </div>
              <p className="mt-5 text-base leading-8 text-[#6B7280]">系统会通过后端 Figma API 读取目标节点的直接子 Frame，并把每个 Frame 作为后续延展的最小组件单元。</p>
              {uploadedKV?.source === "figma" ? (
                <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-[#111827]">已自动拆解 {uploadedKV.figmaFrames?.length || 0} 个 Frame 组件单元</span>
                    <span className="rounded-full bg-[#ECFDF5] px-2 py-1 font-black text-[#047857]">Frame = 最小组件</span>
                  </div>
                  <div className="mt-2 grid max-h-32 gap-1 overflow-auto pr-1">
                    {(uploadedKV.figmaFrames || []).map((frame) => (
                      <div key={frame.id} className="flex items-center justify-between rounded-xl bg-[#F9FAFB] px-2 py-1.5 text-xs">
                        <span className="min-w-0 truncate font-bold" style={{ paddingLeft: frame.depth * 8 }}>{frame.name}</span>
                        <span className="ml-2 shrink-0 text-[#6B7280]">{Math.round(frame.width)}×{Math.round(frame.height)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <MockKVPreview compact={false} kvImageUrl={uploadedKV?.dataUrl} uploadedKV={uploadedKV} />
        </div>
      </section>
    </div>
  );
}

function MockKVPreview({ compact, kvImageUrl, uploadedKV }: { compact: boolean; kvImageUrl?: string; uploadedKV?: UploadedKV | null }) {
  if (uploadedKV?.source === "figma") {
    return <FigmaPreview uploadedKV={uploadedKV} compact={compact} kvImageUrl={kvImageUrl} />;
  }

  if (kvImageUrl) {
    return (
      <div className={`overflow-hidden rounded-3xl border border-[#E5E7EB] bg-[#F8F8F5] ${compact ? "h-48" : "h-[420px]"}`}>
        <img src={kvImageUrl} alt="主 KV" className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-[#E5E7EB] bg-[#F8F8F5] ${compact ? "h-48" : "h-[420px]"}`}>
      <GridBackground />
      <div className="absolute left-8 top-8 text-xs font-bold text-[#6B7280]">(Encyclopedia)</div>
      <div className="absolute left-8 top-14 text-4xl font-black tracking-tight text-[#24160F]">家的<br />图解百科</div>
      <div className="absolute left-8 top-40 rounded bg-white/80 px-3 py-2 text-sm font-black text-[#24160F]">家的十万个为什么，这里都有答案</div>
      <div className="absolute bottom-8 left-8 text-lg font-black text-[#24160F]"># 家的图解百科</div>
      <PhotoBlock className="absolute right-8 top-20 h-36 w-44" />
      <ShapeSofa className="absolute right-36 top-28 h-16 w-20" color="#2F6DDE" />
      <ShapeChair className="absolute right-16 top-24 h-24 w-12" color="#F6D247" />
      <ShapeChair className="absolute bottom-20 right-10 h-20 w-12" color="#E92828" />
      <Dot className="absolute left-[178px] top-[78px]" color="#F6D247" />
      <Dot className="absolute left-[178px] top-[170px]" color="#F6D247" />
    </div>
  );
}

function FigmaPreview({ uploadedKV, compact = false, kvImageUrl }: { uploadedKV: UploadedKV; compact?: boolean; kvImageUrl?: string }) {
  if (uploadedKV.previewImageUrl) {
    return <FigmaScreenshotPreview uploadedKV={uploadedKV} compact={compact} />;
  }

  if (isHomeKvFigmaSource(uploadedKV.fileKey, normalizeFigmaNodeId(uploadedKV.nodeId))) {
    return <FigmaHomeKvPreview compact={compact} kvImageUrl={kvImageUrl} />;
  }

  return (
    <div className={`flex flex-col justify-between rounded-3xl border border-[#E5E7EB] bg-[#111827] p-6 text-white ${compact ? "h-48" : "h-[420px]"}`}>
      <div>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
          <Figma className="h-5 w-5 text-[#FE2C55]" />
        </div>
        <div className="text-lg font-black">Figma 主 KV</div>
        <div className="mt-2 break-all text-xs leading-5 text-white/60">{uploadedKV.figmaUrl}</div>
      </div>
      <div className="grid gap-2 text-xs text-white/70">
        <div className="rounded-2xl bg-white/10 px-3 py-2">fileKey：{uploadedKV.fileKey}</div>
        <div className="rounded-2xl bg-white/10 px-3 py-2">nodeId：{uploadedKV.nodeId || "未指定，默认读取文件首屏"}</div>
        <div className="rounded-2xl bg-white/10 px-3 py-2">当前：真实 Figma 图层解析</div>
      </div>
    </div>
  );
}

function FigmaScreenshotPreview({ uploadedKV, compact = false }: { uploadedKV: UploadedKV; compact?: boolean }) {
  const canvasWidth = uploadedKV.width || 1125;
  const canvasHeight = uploadedKV.height || 1611;
  const maxWidth = compact ? 330 : 480;
  const maxHeight = compact ? 180 : 520;
  const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-3xl border border-[#E5E7EB] bg-[#F8F8F5] ${compact ? "h-48" : "h-[520px]"}`}>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm" style={{ width: canvasWidth * scale, height: canvasHeight * scale }}>
        <img src={uploadedKV.previewImageUrl || ""} alt={uploadedKV.name} className="h-full w-full object-fill" />
      </div>
    </div>
  );
}

function FigmaHomeKvPreview({ compact = false, kvImageUrl }: { compact?: boolean; kvImageUrl?: string }) {
  const canvasWidth = 1125;
  const canvasHeight = 1611;
  const maxWidth = compact ? 330 : 360;
  const maxHeight = compact ? 180 : 420;
  const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-3xl border border-[#E5E7EB] bg-[#F8F8F5] ${compact ? "h-48" : "h-[420px]"}`}>
      <div style={{ width: canvasWidth * scale, height: canvasHeight * scale }}>
        <div
          className="relative overflow-hidden bg-[#F5F5F5]"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left"
          }}
        >
          <HomeKvFigmaArtwork kvImageUrl={kvImageUrl} />
        </div>
      </div>
    </div>
  );
}

function HomeKvFigmaArtwork({ kvImageUrl, copyConfig = defaultCopyConfig, visualConfig = defaultVisualConfig }: { kvImageUrl?: string; copyConfig?: CopyConfig; visualConfig?: VisualConfig }) {
  const [firstTitle, restTitle] = splitHomeKvTitle(copyConfig.title);
  const photoSrc = kvImageUrl || figmaHomeKvAssets.mainPhoto;
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#F5F5F5] text-[#251408]" style={{ fontFamily: "PingFang SC, system-ui, sans-serif" }}>
      {visualConfig.showGrid ? <GridBackground /> : null}

      <div className="absolute left-[30px] top-[86px] h-[229px] w-[1057px]">
        <div className="absolute left-0 top-[33px] font-mono text-[38px] leading-none tracking-[0.8px]">（Encyclopedia）</div>
        <div className="absolute left-[19px] top-[64px] text-[135px] font-black leading-none tracking-[4px]" style={{ color: visualConfig.colors.title }}>
          {firstTitle}
        </div>
        <div className="absolute left-[318px] top-[27px] h-[179px] w-[723px] bg-[#FFF8E0] mix-blend-multiply" />
        <div className="absolute left-[343px] top-[20px] text-[166px] font-black leading-none tracking-[3px]" style={{ color: visualConfig.colors.title }}>
          {restTitle}
        </div>
        {visualConfig.showYellowDots ? (
          <>
            <div className="absolute left-[302px] top-[12px] h-[194px] w-[32px] border-l-[6px]" style={{ borderColor: visualConfig.colors.yellow }}>
              <div className="absolute left-[-16px] top-[-16px] h-[32px] w-[32px] rounded-full" style={{ background: visualConfig.colors.yellow }} />
            </div>
            <div className="absolute left-[1025px] top-[27px] h-[198px] w-[32px] border-r-[6px]" style={{ borderColor: visualConfig.colors.yellow }}>
              <div className="absolute bottom-[-16px] right-[-16px] h-[32px] w-[32px] rounded-full" style={{ background: visualConfig.colors.yellow }} />
            </div>
          </>
        ) : null}
        {["tu", "jie", "bai", "ke"].map((label, index) => {
          const positions = [
            [350, 0],
            [496, 186],
            [670, 0],
            [841, 186]
          ];
          return (
            <div key={label} className="absolute font-mono text-[31px] leading-none text-[#967528]" style={{ left: positions[index][0], top: positions[index][1] }}>
              {label}
            </div>
          );
        })}
      </div>

      <div className="absolute left-[53px] top-[353px] h-[1081px] w-[1021px] overflow-hidden bg-[#D9C7AF]">
        {visualConfig.showMainPhoto ? <img src={photoSrc} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[linear-gradient(135deg,#8b735f,#e7dac8_45%,#6b7280)]" />}
        <div className="absolute inset-0 ring-1 ring-inset ring-[#CCC9C6]" />
        {visualConfig.showBlueSofa ? <ShapeSofa className="absolute bottom-[284px] left-[-12px] h-[410px] w-[330px] rounded-b-[86px] rounded-tl-[76px]" color={visualConfig.colors.blue} /> : null}
        {visualConfig.showYellowChair ? (
          <div className="absolute left-[640px] top-[242px] h-[405px] w-[215px] rounded-t-[32px]" style={{ background: visualConfig.colors.yellow }}>
            <WhiteDotPattern />
            <div className="absolute bottom-[-88px] left-[10px] h-[95px] w-[8px] rounded-full" style={{ background: visualConfig.colors.yellow }} />
            <div className="absolute bottom-[-80px] right-[14px] h-[88px] w-[8px] rounded-full" style={{ background: visualConfig.colors.yellow }} />
          </div>
        ) : null}
        {visualConfig.showRedChair ? (
          <div className="absolute bottom-[90px] right-[-36px] h-[280px] w-[235px] rounded-tl-[110px] rounded-tr-[110px]" style={{ background: visualConfig.colors.red }}>
            <WhiteDotPattern />
            <div className="absolute bottom-[-148px] right-[62px] h-[170px] w-[20px] rounded-full" style={{ background: visualConfig.colors.red }} />
            <div className="absolute bottom-[-170px] right-[40px] h-[42px] w-[42px] rounded-full" style={{ background: visualConfig.colors.red }} />
          </div>
        ) : null}
      </div>

      <div className="absolute left-[101px] top-[394px] h-[279px] w-[197px] shadow-sm">
        <div className="flex h-[75px] items-center bg-[#251408] px-[14px] font-mono text-[40px] font-bold tracking-[4px] text-white">TIME :）</div>
        <div className="h-[196px] bg-white px-[12px] pt-[10px]">
          <div className="text-[48px] font-black leading-none tracking-[3px] text-[#251408]/30">2026</div>
          <div className="mt-[8px] text-[61px] font-black leading-[58px] tracking-[-2px]">
            <div>05.08</div>
            <div>09.30</div>
          </div>
          <div className="absolute left-[159px] top-[137px] text-[61px] font-black leading-none">-</div>
          <div className="absolute right-[13px] top-[190px] -rotate-90 text-[21px] font-black tracking-[1px] text-[#251408]/30">WED</div>
        </div>
      </div>

      <div className="absolute left-[53px] top-[1434px] flex h-[118px] w-[1019px] items-center border-x-[2.4px] border-b-[2.4px] border-[#CCC9C6] bg-white px-[47px]">
        <div className="text-[57px] font-black leading-none tracking-[-0.9px]" style={{ color: visualConfig.colors.title }}>
          {copyConfig.subtitle}
        </div>
        {visualConfig.showLogo ? <img src={figmaHomeKvAssets.heartLogo} alt="" className="ml-auto h-[88px] w-[72px] object-cover object-left" /> : null}
      </div>
    </div>
  );
}

function WhiteDotPattern() {
  return <div className="absolute inset-0 opacity-90" style={{ backgroundImage: "radial-gradient(circle, white 2px, transparent 2.5px)", backgroundSize: "24px 24px" }} />;
}

function splitHomeKvTitle(title: string) {
  if (title.startsWith("家的")) return ["家的", title.slice(2) || "图解百科"];
  return [title.slice(0, 2), title.slice(2) || "图解百科"];
}

function ProgressPanel({ title, steps, activeIndex }: { title: string; steps: string[]; activeIndex: number }) {
  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1F2] text-[#FE2C55]">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-black">{title}</h2>
          <p className="text-sm text-[#6B7280]">Mock AI 正在处理，稍后进入下一步。</p>
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${index <= activeIndex ? "border-[#FE2C55]/30 bg-[#FFF7F8]" : "border-[#E5E7EB] bg-[#F9FAFB]"}`}>
            <div className={`h-2.5 w-2.5 rounded-full ${index <= activeIndex ? "bg-[#FE2C55]" : "bg-[#D1D5DB]"}`} />
            <span className="text-sm font-semibold">{step}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalysisPanel({
  analysis,
  uploadedKV,
  kvImageUrl,
  selectedFrameIds,
  setSelectedFrameIds,
  onNext
}: {
  analysis: KVAnalysis;
  uploadedKV: UploadedKV | null;
  kvImageUrl?: string;
  selectedFrameIds: string[];
  setSelectedFrameIds: React.Dispatch<React.SetStateAction<string[]>>;
  onNext: () => void;
}) {
  if (uploadedKV?.source === "figma") {
    return <FigmaFrameAnalysisPanel uploadedKV={uploadedKV} kvImageUrl={kvImageUrl} selectedFrameIds={selectedFrameIds} setSelectedFrameIds={setSelectedFrameIds} onNext={onNext} />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-black">AI 拆解结果</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <MockKVPreview compact kvImageUrl={kvImageUrl} uploadedKV={uploadedKV} />
          <div className="space-y-4">
            <AnalysisGroup title="文案识别" items={[analysis.copy.title, analysis.copy.subtitle, analysis.copy.englishLabel, analysis.copy.date, analysis.copy.brand]} checkbox />
            <AnalysisGroup title="视觉资产识别" items={[analysis.assets.mainPhoto, ...analysis.assets.graphicElements, analysis.assets.logo]} checkbox />
          </div>
        </div>
        <div className="mt-5 rounded-3xl bg-[#F9FAFB] p-5">
          <h3 className="mb-3 font-black">风格识别</h3>
          <div className="mb-4 flex flex-wrap gap-2">{analysis.style.styleKeywords.map((tag) => <Chip key={tag}>{tag}</Chip>)}</div>
          <div className="mb-4 flex flex-wrap gap-3">{analysis.style.colors.map((color) => <div key={color} className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-2 py-1 text-xs font-bold"><span className="h-5 w-5 rounded-full border" style={{ background: color }} />{color}</div>)}</div>
          <p className="text-sm leading-6 text-[#4B5563]">{analysis.style.typography}</p>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">{analysis.style.composition}</p>
        </div>
      </section>
      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Design DNA</h2>
        <p className="mt-4 text-sm leading-7 text-[#374151]">{analysis.designDNA.summary}</p>
        <DnaList title="必须保留" items={analysis.designDNA.mustKeep} />
        <DnaList title="避免" items={analysis.designDNA.avoid} />
        <button onClick={onNext} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-bold text-white hover:bg-[#1F2937]">
          选择延展场景<ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

function FigmaFrameAnalysisPanel({
  uploadedKV,
  kvImageUrl,
  selectedFrameIds,
  setSelectedFrameIds,
  onNext
}: {
  uploadedKV: UploadedKV;
  kvImageUrl?: string;
  selectedFrameIds: string[];
  setSelectedFrameIds: React.Dispatch<React.SetStateAction<string[]>>;
  onNext: () => void;
}) {
  const frames = uploadedKV.figmaFrames || [];
  return (
    <div className="flex min-h-full w-full">
      <section className="flex min-h-full w-full flex-col rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <FigmaFrameDecomposition frames={frames} uploadedKV={uploadedKV} kvImageUrl={kvImageUrl} selectedFrameIds={selectedFrameIds} setSelectedFrameIds={setSelectedFrameIds} />
        <button onClick={onNext} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-bold text-white hover:bg-[#1F2937]">
          确认 Frame 单元并选择场景<ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

function AnalysisGroup({ title, items, checkbox }: { title: string; items: string[]; checkbox?: boolean }) {
  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
      <h3 className="mb-3 font-black">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item} className="flex items-center gap-2 rounded-xl bg-[#F9FAFB] px-3 py-2 text-sm font-semibold">
            {checkbox ? <input type="checkbox" defaultChecked className="accent-[#FE2C55]" /> : null}
            {item}
          </label>
        ))}
      </div>
    </section>
  );
}

function FigmaFrameDecomposition({
  frames,
  uploadedKV,
  kvImageUrl,
  selectedFrameIds,
  setSelectedFrameIds
}: {
  frames: FigmaFrameUnit[];
  uploadedKV: UploadedKV;
  kvImageUrl?: string;
  selectedFrameIds: string[];
  setSelectedFrameIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const selectedFrames = frames.filter((frame) => selectedFrameIds.includes(frame.id));

  React.useEffect(() => {
    setSelectedFrameIds((current) => (current.length ? current.filter((id) => frames.some((frame) => frame.id === id)) : getDefaultSelectedFrameIds(frames)));
  }, [frames, setSelectedFrameIds]);

  function toggleFrame(frameId: string) {
    setSelectedFrameIds((current) => (current.includes(frameId) ? current.filter((id) => id !== frameId) : [...current, frameId]));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-black">AI 拆解出的 Frame 组件单元</h3>
        <span className="rounded-full bg-[#FFF1F2] px-2 py-1 text-xs font-black text-[#FE2C55]">Frame = 最小组件</span>
      </div>
      <p className="mb-3 text-xs leading-5 text-[#6B7280]">AI 只把 Figma Frame 当作可复用组件单元；Frame 内部的 Text / Vector / Image 保持封装，不再继续拆散。</p>
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(420px,0.85fr)_minmax(560px,1.15fr)]">
        <FrameUnitLocatorPreview uploadedKV={uploadedKV} selectedFrames={selectedFrames} kvImageUrl={kvImageUrl} />
        <div className="min-h-0 space-y-3 overflow-auto p-1">
          {frames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              onClick={() => toggleFrame(frame.id)}
              className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${
                selectedFrameIds.includes(frame.id) ? "bg-[#FFF1F2] shadow-[inset_0_0_0_1px_rgba(254,44,85,0.32)]" : "bg-[#F9FAFB] hover:bg-[#F3F4F6]"
              }`}
            >
              <div className="truncate font-bold" style={{ paddingLeft: frame.depth * 10 }}>{frame.name}</div>
              <div className="mt-0.5 text-xs text-[#6B7280]">{frame.id} · {Math.round(frame.width)} × {Math.round(frame.height)} · {frame.role}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FrameUnitLocatorPreview({ uploadedKV, selectedFrames, kvImageUrl }: { uploadedKV: UploadedKV; selectedFrames: FigmaFrameUnit[]; kvImageUrl?: string }) {
  const canvasWidth = uploadedKV.width || 1125;
  const canvasHeight = uploadedKV.height || 1611;
  const previewWidth = 390;
  const scale = previewWidth / canvasWidth;
  const previewHeight = canvasHeight * scale;
  const previewPadding = 14;
  const previewAsset = uploadedKV.previewImageUrl || getFigmaPreviewAsset(uploadedKV.fileKey, normalizeFigmaNodeId(uploadedKV.nodeId));
  const visibleSelectedFrames = selectedFrames.map((frame) => getVisibleFrameRect(frame, canvasWidth, canvasHeight)).filter(Boolean) as Array<Pick<FigmaFrameUnit, "id" | "x" | "y" | "width" | "height">>;
  const label = selectedFrames.length ? `已选 ${selectedFrames.length} 个 Frame` : "未选择 Frame";
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{label}</div>
          <div className="mt-0.5 text-xs text-[#6B7280]">点击右侧卡片可多选 / 取消</div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-black text-[#FE2C55]">预览</span>
      </div>
      <div className="mx-auto rounded-xl bg-white" style={{ width: previewWidth + previewPadding * 2, height: previewHeight + previewPadding * 2, padding: previewPadding }}>
        <div
          className="relative overflow-hidden bg-[#F5F5F5]"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left"
          }}
        >
          {previewAsset ? (
            <img src={previewAsset} alt="Figma 主 KV 预览" className="absolute inset-0 h-full w-full object-fill" />
          ) : isHomeKvFigmaSource(uploadedKV.fileKey, normalizeFigmaNodeId(uploadedKV.nodeId)) ? (
            <HomeKvFigmaArtwork kvImageUrl={kvImageUrl} />
          ) : (
            <GenericFigmaFrameMap frames={uploadedKV.figmaFrames || []} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
          )}
          {visibleSelectedFrames.map((frame) => (
            <div
              key={frame.id}
              className="absolute bg-[#FE2C55]/5"
              style={{
                left: frame.x,
                top: frame.y,
                width: Math.max(frame.width, 12),
                height: Math.max(frame.height, 12),
                boxShadow: "inset 0 0 0 8px #FE2C55"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getFigmaPreviewAsset(fileKey?: string, nodeId?: string) {
  if (fileKey === UNTITLED_HOME_KV_FIGMA_FILE_KEY && (!nodeId || nodeId === UNTITLED_HOME_KV_FIGMA_NODE_ID)) {
    return figmaHomeKvAssets.untitledScreenshot;
  }
  return null;
}

function getVisibleFrameRect(frame: FigmaFrameUnit, canvasWidth: number, canvasHeight: number) {
  const left = Math.max(0, frame.x);
  const top = Math.max(0, frame.y);
  const right = Math.min(canvasWidth, frame.x + frame.width);
  const bottom = Math.min(canvasHeight, frame.y + frame.height);
  if (right <= left || bottom <= top) return null;
  return {
    id: frame.id,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

function GenericFigmaFrameMap({ frames, canvasWidth, canvasHeight }: { frames: FigmaFrameUnit[]; canvasWidth: number; canvasHeight: number }) {
  return (
    <div className="relative h-full w-full bg-[#F5F5F5]">
      {frames.map((frame) => (
        <div
          key={frame.id}
          className="absolute rounded-[18px] border border-[#CBD5E1] bg-white/70"
          style={{
            left: frame.x,
            top: frame.y,
            width: Math.min(frame.width, canvasWidth - frame.x),
            height: Math.min(frame.height, canvasHeight - frame.y),
            opacity: frame.hidden ? 0.35 : 1
          }}
        />
      ))}
    </div>
  );
}

function DnaList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-black">{title}</h3>
      <div className="flex flex-wrap gap-2">{items.map((item) => <Chip key={item}>{item}</Chip>)}</div>
    </div>
  );
}

function SceneSelector({ selectedSceneIds, onToggle, onGenerate }: { selectedSceneIds: string[]; onToggle: (id: string) => void; onGenerate: () => void }) {
  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black">选择延展场景</h2>
          <p className="mt-2 text-sm text-[#6B7280]">请选择需要生成的延展场景。每个场景会基于已选 Frame 组件单元生成独立预览。</p>
        </div>
        <button onClick={onGenerate} className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-bold text-white hover:bg-[#1F2937]">
          生成延展应用<ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-5 lg:grid-cols-3 md:grid-cols-2">
        {sceneTemplates.map((scene) => (
          <button key={scene.id} onClick={() => onToggle(scene.id)} className={`rounded-3xl border p-4 text-left transition ${selectedSceneIds.includes(scene.id) ? "border-[#FE2C55] bg-[#FFF7F8] ring-2 ring-[#FE2C55]/10" : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-black">{scene.name}</h3>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${selectedSceneIds.includes(scene.id) ? "bg-[#FE2C55] text-white" : "bg-[#F3F4F6] text-transparent"}`}><Check className="h-4 w-4" /></span>
            </div>
            <Wireframe scene={scene} />
            <div className="mt-3 text-sm font-bold">{scene.size}</div>
            <p className="mt-2 min-h-[60px] text-xs leading-5 text-[#6B7280]">{scene.description}</p>
            <span className="mt-3 inline-flex rounded-full bg-white px-2 py-1 text-xs font-bold text-[#FE2C55]">继承强度：{scene.inheritance}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Wireframe({ scene }: { scene: SceneTemplate }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-2xl bg-[#F3F4F6]">
      <div className="relative rounded-lg border border-[#D1D5DB] bg-white" style={{ width: `${Math.min(132, scene.width / 5)}px`, height: `${Math.min(76, scene.height / 5)}px` }}>
        <div className="absolute left-2 top-2 h-2 w-1/2 rounded bg-[#111827]/20" />
        <div className="absolute bottom-2 left-2 h-2 w-1/3 rounded bg-[#FE2C55]/40" />
        <div className="absolute right-2 top-2 h-2/3 w-1/3 rounded bg-[#CBD5E1]" />
      </div>
    </div>
  );
}

function GeneratedSceneGrid({
  scenes,
  activeSceneId,
  copyConfig,
  visualConfig,
  kvImageUrl,
  uploadedKV,
  selectedFrameIds,
  selectedLayerId,
  setSelectedLayerId,
  updateLayer,
  onSelect,
  onExport,
  onRegenerate,
  onBatchExport
}: {
  scenes: GeneratedScene[];
  activeSceneId: string;
  copyConfig: CopyConfig;
  visualConfig: VisualConfig;
  kvImageUrl?: string;
  uploadedKV: UploadedKV | null;
  selectedFrameIds: string[];
  selectedLayerId: string | null;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  updateLayer: (sceneId: string, layerId: string, patch: Partial<LayerNode>) => void;
  onSelect: (sceneId: string) => void;
  onExport: (scene: GeneratedScene) => void;
  onRegenerate: () => void;
  onBatchExport: () => void;
}) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black">已生成 {scenes.length} 个延展应用</h2>
          <p className="mt-2 text-sm text-[#6B7280]">系统已基于主 KV 的 Design DNA 自动适配不同业务场景。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRegenerate} className="inline-flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold hover:bg-[#F9FAFB]"><RefreshCw className="h-4 w-4" />重新生成</button>
          <button onClick={onBatchExport} className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1F2937]"><Download className="h-4 w-4" />批量导出</button>
        </div>
      </div>
      <div className="grid gap-5 2xl:grid-cols-2">
        {scenes.map((scene) => (
          <article key={scene.id} onClick={() => onSelect(scene.sceneId)} className={`cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition ${activeSceneId === scene.sceneId ? "border-[#FE2C55] ring-2 ring-[#FE2C55]/10" : "border-[#E5E7EB] hover:border-[#CBD5E1]"}`}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black">{scene.name}</h3>
                <p className="text-sm text-[#6B7280]">{scene.size}</p>
              </div>
              <span className="rounded-full bg-[#FFF1F2] px-3 py-1 text-xs font-bold text-[#FE2C55]">可编辑图层</span>
            </div>
            <div className="rounded-3xl bg-[#F3F4F6] p-4">
              <ScenePreviewRenderer scene={scene} copyConfig={copyConfig} visualConfig={visualConfig} kvImageUrl={kvImageUrl} uploadedKV={uploadedKV} selectedFrameIds={selectedFrameIds} selectedLayerId={selectedLayerId} setSelectedLayerId={setSelectedLayerId} updateLayer={updateLayer} />
            </div>
            <p className="mt-4 text-sm leading-6 text-[#4B5563]">{scene.strategy}</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-bold hover:bg-[#F9FAFB]">预览</button>
              <button className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-bold hover:bg-[#F9FAFB]">编辑</button>
              <button className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-bold hover:bg-[#F9FAFB]"><Copy className="h-4 w-4" />复制</button>
              <button onClick={(event) => { event.stopPropagation(); onExport(scene); }} className="rounded-xl bg-[#111827] px-3 py-2 text-sm font-bold text-white hover:bg-[#1F2937]">导出 PNG</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RightInspector(props: {
  status: AppStatus;
  activeScene?: GeneratedScene;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  selectedLayerId: string | null;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  updateLayer: (sceneId: string, layerId: string, patch: Partial<LayerNode>) => void;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  exportScale: string;
  setExportScale: (scale: string) => void;
  transparentBg: boolean;
  setTransparentBg: (value: boolean) => void;
  keepSafeArea: boolean;
  setKeepSafeArea: (value: boolean) => void;
  onExport: () => void;
  onBatchExport: () => void;
}) {
  const { status, activeScene, tab, onTabChange, selectedLayerId, setSelectedLayerId } = props;
  const selectedLayer = activeScene?.layers.find((layer) => layer.id === selectedLayerId) || activeScene?.layers[0];

  return (
    <aside className="overflow-auto border-l border-[#E5E7EB] bg-white p-5">
      <div className="mb-4">
        <h2 className="text-lg font-black">右侧属性面板</h2>
        <p className="mt-1 text-sm text-[#6B7280]">当前：{activeScene?.name || "未选择场景"}</p>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-[#F3F4F6] p-1">
        {([
          ["layers", "图层"],
          ["export", "导出"]
        ] as Array<[InspectorTab, string]>).map(([id, label]) => (
          <button key={id} onClick={() => onTabChange(id)} className={`rounded-xl px-2 py-2 text-sm font-bold ${tab === id ? "bg-white shadow-sm" : "text-[#6B7280]"}`}>{label}</button>
        ))}
      </div>
      {tab === "layers" && activeScene ? <LayerTree scene={activeScene} selectedLayerId={selectedLayer?.id || null} setSelectedLayerId={setSelectedLayerId} updateLayer={props.updateLayer} /> : null}
      {tab === "layers" && activeScene && selectedLayer ? <LayerPositionPanel scene={activeScene} layer={selectedLayer} updateLayer={props.updateLayer} /> : null}
      {tab === "export" ? <ExportPanel {...props} /> : null}
    </aside>
  );
}

function CopyEditor({ copyConfig, setCopyConfig }: { copyConfig: CopyConfig; setCopyConfig: React.Dispatch<React.SetStateAction<CopyConfig>> }) {
  const fields: Array<[keyof CopyConfig, string]> = [
    ["title", "主标题"],
    ["subtitle", "副标题"],
    ["date", "活动时间"],
    ["cta", "CTA"],
    ["topic", "话题名"],
    ["messageTitle", "站内信标题"],
    ["messageBody", "站内信正文"]
  ];
  return (
    <div className="space-y-3">
      {fields.map(([key, label]) => (
        <label key={key} className="block">
          <span className="mb-1 block text-sm font-bold">{label}</span>
          {key === "messageBody" ? (
            <textarea value={copyConfig[key]} onChange={(event) => setCopyConfig((current) => ({ ...current, [key]: event.target.value }))} className="h-24 w-full resize-none rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#FE2C55]" />
          ) : (
            <input value={copyConfig[key]} onChange={(event) => setCopyConfig((current) => ({ ...current, [key]: event.target.value }))} className="h-10 w-full rounded-2xl border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#FE2C55]" />
          )}
        </label>
      ))}
    </div>
  );
}

function VisualEditor({ visualConfig, setVisualConfig }: { visualConfig: VisualConfig; setVisualConfig: React.Dispatch<React.SetStateAction<VisualConfig>> }) {
  const toggles: Array<[keyof Omit<VisualConfig, "colors">, string]> = [
    ["showGrid", "保留网格背景"],
    ["showMainPhoto", "保留主照片"],
    ["showBlueSofa", "保留蓝色沙发"],
    ["showYellowChair", "保留黄色椅子"],
    ["showRedChair", "保留红色椅子"],
    ["showYellowDots", "保留黄色标注点"],
    ["showLogo", "保留 Logo"]
  ];
  const colors: Array<[keyof VisualConfig["colors"], string]> = [
    ["background", "背景"],
    ["title", "标题"],
    ["yellow", "黄色"],
    ["blue", "蓝色"],
    ["red", "红色"],
    ["brand", "品牌色"]
  ];
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        {toggles.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm font-bold">
            {label}
            <input type="checkbox" checked={Boolean(visualConfig[key])} onChange={(event) => setVisualConfig((current) => ({ ...current, [key]: event.target.checked }))} className="accent-[#FE2C55]" />
          </label>
        ))}
      </section>
      <section className="grid grid-cols-2 gap-3">
        {colors.map(([key, label]) => (
          <label key={key} className="text-sm font-bold">
            <span className="mb-1 block">{label}</span>
            <input type="color" value={visualConfig.colors[key]} onChange={(event) => setVisualConfig((current) => ({ ...current, colors: { ...current.colors, [key]: event.target.value } }))} className="h-10 w-full rounded-xl border border-[#E5E7EB]" />
          </label>
        ))}
      </section>
    </div>
  );
}

function LayerTree({
  scene,
  selectedLayerId,
  setSelectedLayerId,
  updateLayer
}: {
  scene: GeneratedScene;
  selectedLayerId: string | null;
  setSelectedLayerId: (layerId: string) => void;
  updateLayer: (sceneId: string, layerId: string, patch: Partial<LayerNode>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-[#F9FAFB] p-3 text-sm font-black">Canvas</div>
      {scene.layers.map((layer) => (
        <button key={layer.id} type="button" onClick={() => setSelectedLayerId(layer.id)} className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left ${selectedLayerId === layer.id ? "border-[#FE2C55] bg-[#FFF7F8]" : "border-[#E5E7EB] bg-white"}`}>
          <div className="flex min-w-0 items-center gap-2">
            <Layers3 className="h-4 w-4 shrink-0 text-[#6B7280]" />
            <span className="truncate text-sm font-bold">{layer.name}</span>
          </div>
          <div className="flex gap-1">
            <span onClick={(event) => { event.stopPropagation(); updateLayer(scene.sceneId, layer.id, { visible: !layer.visible }); }} className="rounded-lg p-1.5 hover:bg-[#F3F4F6]">{layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-[#9CA3AF]" />}</span>
            <span onClick={(event) => { event.stopPropagation(); updateLayer(scene.sceneId, layer.id, { locked: !layer.locked }); }} className="rounded-lg p-1.5 hover:bg-[#F3F4F6]">{layer.locked ? <Lock className="h-4 w-4 text-[#9CA3AF]" /> : <Unlock className="h-4 w-4" />}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function LayerPositionPanel({ scene, layer, updateLayer }: { scene: GeneratedScene; layer: LayerNode; updateLayer: (sceneId: string, layerId: string, patch: Partial<LayerNode>) => void }) {
  const updateNumber = (key: keyof Pick<LayerNode, "x" | "y" | "width" | "height" | "rotation">, value: string) => {
    const next = Number(value);
    if (Number.isFinite(next)) updateLayer(scene.sceneId, layer.id, { [key]: next });
  };

  return (
    <section className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 text-sm font-black">位置</div>
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-[#F3F4F6] p-1 text-[#111827]">
        {["左", "中", "右"].map((label) => <button key={label} className="rounded-lg bg-white px-2 py-2 text-xs font-black shadow-sm">{label}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InspectorNumber label="X" value={layer.x ?? 0} onChange={(value) => updateNumber("x", value)} />
        <InspectorNumber label="Y" value={layer.y ?? 0} onChange={(value) => updateNumber("y", value)} />
        <InspectorNumber label="W" value={layer.width ?? 0} onChange={(value) => updateNumber("width", value)} />
        <InspectorNumber label="H" value={layer.height ?? 0} onChange={(value) => updateNumber("height", value)} />
        <InspectorNumber label="旋转" value={layer.rotation ?? 0} suffix="°" onChange={(value) => updateNumber("rotation", value)} />
        <div className="rounded-xl bg-[#F3F4F6] px-3 py-2 text-xs font-bold text-[#6B7280]">图层<br /><span className="text-[#111827]">{layer.name}</span></div>
      </div>
    </section>
  );
}

function InspectorNumber({ label, value, suffix, onChange }: { label: string; value: number; suffix?: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 text-sm">
      <span className="w-8 text-[#6B7280]">{label}</span>
      <input type="number" value={Math.round(value)} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent font-semibold outline-none" />
      {suffix ? <span className="text-[#6B7280]">{suffix}</span> : null}
    </label>
  );
}

function ExportPanel(props: {
  activeScene?: GeneratedScene;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  exportScale: string;
  setExportScale: (scale: string) => void;
  transparentBg: boolean;
  setTransparentBg: (value: boolean) => void;
  keepSafeArea: boolean;
  setKeepSafeArea: (value: boolean) => void;
  onExport: () => void;
  onBatchExport: () => void;
}) {
  return (
    <div className="space-y-4">
      <InfoBlock title="当前选中场景" lines={[props.activeScene ? `${props.activeScene.name} / ${props.activeScene.size}` : "未选择"]} />
      <Segmented label="导出格式" value={props.exportFormat} options={["PNG", "SVG", "Figma JSON"]} onChange={(value) => props.setExportFormat(value as ExportFormat)} />
      <Segmented label="导出倍率" value={props.exportScale} options={["1x", "2x", "3x"]} onChange={props.setExportScale} />
      <label className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm font-bold">透明背景<input type="checkbox" checked={props.transparentBg} onChange={(event) => props.setTransparentBg(event.target.checked)} className="accent-[#FE2C55]" /></label>
      <label className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] px-3 py-2 text-sm font-bold">保留安全区<input type="checkbox" checked={props.keepSafeArea} onChange={(event) => props.setKeepSafeArea(event.target.checked)} className="accent-[#FE2C55]" /></label>
      <button onClick={props.onExport} className="w-full rounded-2xl bg-[#111827] px-4 py-3 text-sm font-black text-white">导出当前场景</button>
      <button onClick={props.onBatchExport} className="w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-black">批量导出全部场景</button>
    </div>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold">{label}</div>
      <div className="grid gap-1 rounded-2xl bg-[#F3F4F6] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button key={option} onClick={() => onChange(option)} className={`rounded-xl px-2 py-2 text-xs font-black ${value === option ? "bg-white shadow-sm" : "text-[#6B7280]"}`}>{option}</button>
        ))}
      </div>
    </div>
  );
}

function ScenePreviewRenderer({
  scene,
  copyConfig,
  visualConfig,
  kvImageUrl,
  uploadedKV,
  selectedFrameIds,
  selectedLayerId,
  setSelectedLayerId,
  updateLayer
}: {
  scene: GeneratedScene;
  copyConfig: CopyConfig;
  visualConfig: VisualConfig;
  kvImageUrl?: string;
  uploadedKV: UploadedKV | null;
  selectedFrameIds: string[];
  selectedLayerId: string | null;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  updateLayer: (sceneId: string, layerId: string, patch: Partial<LayerNode>) => void;
}) {
  const canvasWidth = scene.sceneId === "search-aladdin" ? 1170 : scene.width;
  const canvasHeight = scene.sceneId === "search-aladdin" ? 2532 : scene.height;
  const maxPreviewHeight = scene.sceneId === "search-aladdin" ? 620 : 330;
  const baseScale = Math.min(1, 560 / canvasWidth, maxPreviewHeight / canvasHeight);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const totalScale = baseScale * zoom;
  const viewportWidth = viewportRef.current?.clientWidth || 0;
  const canvasLeft = viewportWidth / 2 - (canvasWidth * totalScale) / 2 + pan.x;
  const style: React.CSSProperties = {
    width: canvasWidth,
    height: canvasHeight,
    transform: `translate(${canvasLeft}px, ${pan.y}px) scale(${totalScale})`,
    transformOrigin: "top left"
  };
  const panStart = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointX = event.clientX - rect.left;
    const pointY = event.clientY - rect.top;
    const oldTotalScale = totalScale;
    const oldCanvasLeft = rect.width / 2 - (canvasWidth * oldTotalScale) / 2 + pan.x;
    const worldX = (pointX - oldCanvasLeft) / oldTotalScale;
    const worldY = (pointY - pan.y) / oldTotalScale;
    const nextZoom = Math.min(20, Math.max(0.08, zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
    const nextTotalScale = baseScale * nextZoom;
    const nextCanvasBaseLeft = rect.width / 2 - (canvasWidth * nextTotalScale) / 2;
    setPan({
      x: pointX - nextCanvasBaseLeft - worldX * nextTotalScale,
      y: pointY - worldY * nextTotalScale
    });
    setZoom(nextZoom);
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    panStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!panStart.current) return;
    setPan({
      x: panStart.current.panX + event.clientX - panStart.current.x,
      y: panStart.current.panY + event.clientY - panStart.current.y
    });
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    panStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!selectedLayerId || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const layer = scene.layers.find((item) => item.id === selectedLayerId);
    if (!layer || layer.locked) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    updateLayer(scene.sceneId, selectedLayerId, { x: (layer.x || 0) + dx, y: (layer.y || 0) + dy });
  }

  return (
    <div
      ref={viewportRef}
      tabIndex={0}
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onKeyDown={handleKeyDown}
      className="relative h-[620px] w-full overflow-hidden rounded-3xl bg-[#EDEFF3] outline-none"
    >
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#6B7280] shadow-sm">{Math.round(zoom * 100)}%</div>
      <div style={style} className="absolute left-0 top-0 overflow-hidden rounded-2xl bg-white shadow-sm">
        {scene.sceneId === "search-aladdin" ? <SearchResultFigmaPreview scene={scene} copyConfig={copyConfig} visualConfig={visualConfig} kvImageUrl={kvImageUrl} uploadedKV={uploadedKV} selectedFrameIds={selectedFrameIds} selectedLayerId={selectedLayerId} setSelectedLayerId={setSelectedLayerId} updateLayer={updateLayer} canvasScale={totalScale} /> : null}
        {scene.sceneId === "message-card" ? <MessageCardPreview scene={scene} copyConfig={copyConfig} visualConfig={visualConfig} kvImageUrl={kvImageUrl} uploadedKV={uploadedKV} selectedFrameIds={selectedFrameIds} /> : null}
        {scene.sceneId === "activity-center" ? <ActivityCenterPreview scene={scene} copyConfig={copyConfig} visualConfig={visualConfig} kvImageUrl={kvImageUrl} uploadedKV={uploadedKV} selectedFrameIds={selectedFrameIds} /> : null}
        {scene.sceneId === "creator-center" ? <CreatorCenterPreview scene={scene} copyConfig={copyConfig} visualConfig={visualConfig} kvImageUrl={kvImageUrl} uploadedKV={uploadedKV} selectedFrameIds={selectedFrameIds} /> : null}
        {scene.sceneId === "topic-page" ? <TopicPagePreview scene={scene} copyConfig={copyConfig} visualConfig={visualConfig} kvImageUrl={kvImageUrl} uploadedKV={uploadedKV} selectedFrameIds={selectedFrameIds} /> : null}
      </div>
    </div>
  );
}

function useLayer(scene: GeneratedScene) {
  return React.useCallback((id: string) => {
    const layer = scene.layers.find((item) => item.id === id);
    return layer ? layer.visible !== false : false;
  }, [scene.layers]);
}

function getSelectedFigmaFrames(frames: FigmaFrameUnit[], selectedFrameIds: string[]) {
  const selected = frames.filter((frame) => selectedFrameIds.includes(frame.id));
  return selected.length ? selected : frames.filter((frame) => !frame.hidden);
}

function getDefaultSelectedFrameIds(frames: FigmaFrameUnit[]) {
  const preferredNames = ["title", "pic", "subtitle"];
  const preferredFrames = frames.filter((frame) => preferredNames.includes(frame.name.trim().toLowerCase()));
  return (preferredFrames.length ? preferredFrames : frames.filter((frame) => !frame.hidden)).map((frame) => frame.id);
}

function getFrameLayerId(frame: FigmaFrameUnit) {
  const name = frame.name.trim().toLowerCase();
  if (name.includes("texture") || frame.role.includes("background")) return "grid";
  if (name.includes("subtitle") || frame.role.includes("subtitle")) return "subtitle";
  if (name === "title" || frame.role.includes("title")) return "title";
  if (name.includes("pic") || frame.role.includes("visual")) return "mainPhoto";
  if (name.includes("time") || frame.role.includes("time")) return "time";
  return `figma-${frame.id}`;
}

function getFrameLayerType(frame: FigmaFrameUnit): LayerNode["type"] {
  const layerId = getFrameLayerId(frame);
  if (layerId === "title" || layerId === "subtitle" || layerId === "time") return "text";
  if (layerId === "mainPhoto") return "image";
  if (layerId === "grid") return "background";
  return "shape";
}

function createGeneratedLayerFromFrame(frame: FigmaFrameUnit, sceneId: string): LayerNode {
  return {
    id: getFrameLayerId(frame),
    name: `${"  ".repeat(frame.depth)}${frame.name}`,
    type: getFrameLayerType(frame),
    ...getInitialLayerTransform(frame, sceneId),
    rotation: 0,
    opacity: 1,
    visible: !frame.hidden,
    locked: false
  };
}

function getInitialLayerTransform(frame: FigmaFrameUnit, sceneId: string): Pick<LayerNode, "x" | "y" | "width" | "height" | "zIndex"> {
  const layerId = getFrameLayerId(frame);
  if (sceneId === "search-aladdin") {
    if (layerId === "grid") return { x: 0, y: 393, width: 1170, height: 330, zIndex: 0 };
    if (layerId === "title") return { x: 48, y: 442, width: 710, height: 143, zIndex: 3 };
    if (layerId === "subtitle") return { x: 48, y: 610, width: 690, height: 78, zIndex: 4 };
    if (layerId === "mainPhoto") return { x: 778, y: 435, width: 330, height: 220, zIndex: 2 };
    if (layerId === "time") return { x: 734, y: 455, width: 92, height: 132, zIndex: 5 };
  }
  return { x: 0, y: 0, width: Math.round(frame.width), height: Math.round(frame.height), zIndex: 1 };
}

function findFigmaFrame(frames: FigmaFrameUnit[], key: "texture" | "title" | "subtitle" | "pic" | "time") {
  return frames.find((frame) => {
    const name = frame.name.trim().toLowerCase();
    if (key === "texture") return name.includes("texture") || frame.role.includes("background");
    if (key === "pic") return name.includes("pic") || frame.role.includes("visual");
    if (key === "title") return name === "title" || frame.role === "title-component";
    if (key === "subtitle") return name.includes("subtitle") || frame.role.includes("subtitle");
    return name.includes(key) || frame.role.includes(key);
  });
}

function FigmaFrameCrop({
  uploadedKV,
  frame,
  className,
  style,
  width,
  height,
  mode = "contain"
}: {
  uploadedKV: UploadedKV;
  frame: FigmaFrameUnit;
  className?: string;
  style?: React.CSSProperties;
  width: number;
  height: number;
  mode?: "contain" | "cover";
}) {
  if (frame.previewImageUrl) {
    return (
      <div className={className} style={{ width, height, ...style }}>
        <img
          src={frame.previewImageUrl}
          alt={frame.name}
          className="pointer-events-none h-full w-full select-none"
          style={{ objectFit: mode, objectPosition: "center" }}
        />
      </div>
    );
  }

  const canvasWidth = uploadedKV.width || 1125;
  const canvasHeight = uploadedKV.height || 1611;
  const frameWidth = Math.max(frame.width, 1);
  const frameHeight = Math.max(frame.height, 1);
  const scale = mode === "cover" ? Math.max(width / frameWidth, height / frameHeight) : Math.min(width / frameWidth, height / frameHeight);
  const renderedFrameWidth = frameWidth * scale;
  const renderedFrameHeight = frameHeight * scale;
  const left = (width - renderedFrameWidth) / 2 - frame.x * scale;
  const top = (height - renderedFrameHeight) / 2 - frame.y * scale;

  return (
    <div className={className} style={{ width, height, ...style }}>
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        <img
          src={uploadedKV.previewImageUrl || ""}
          alt={frame.name}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            left,
            top,
            width: canvasWidth * scale,
            height: canvasHeight * scale
          }}
        />
      </div>
    </div>
  );
}

function EditableFigmaFrameCrop({
  uploadedKV,
  frame,
  layer,
  sceneId,
  mode,
  rounded,
  selected,
  onSelect,
  updateLayer,
  canvasScale = 1
}: {
  uploadedKV: UploadedKV;
  frame: FigmaFrameUnit;
  layer?: LayerNode;
  sceneId: string;
  mode: "contain" | "cover";
  rounded?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  updateLayer?: (sceneId: string, layerId: string, patch: Partial<LayerNode>) => void;
  canvasScale?: number;
}) {
  const dragStart = React.useRef<{ x: number; y: number; layerX: number; layerY: number } | null>(null);
  const rotateStart = React.useRef<{ x: number; rotation: number } | null>(null);
  if (!layer) return null;
  const activeLayer = layer;
  const keepAspectHeight = mode === "contain" ? Math.max(1, (Math.max(activeLayer.width || 1, 1) / Math.max(frame.width, 1)) * Math.max(frame.height, 1)) : Math.max(activeLayer.height || 1, 1);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    onSelect?.();
    if (activeLayer.locked) return;
    dragStart.current = { x: event.clientX, y: event.clientY, layerX: activeLayer.x || 0, layerY: activeLayer.y || 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current || !updateLayer) return;
    updateLayer(sceneId, activeLayer.id, {
      x: dragStart.current.layerX + (event.clientX - dragStart.current.x) / canvasScale,
      y: dragStart.current.layerY + (event.clientY - dragStart.current.y) / canvasScale
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleRotatePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    onSelect?.();
    if (activeLayer.locked) return;
    rotateStart.current = { x: event.clientX, rotation: activeLayer.rotation || 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleRotatePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!rotateStart.current || !updateLayer) return;
    updateLayer(sceneId, activeLayer.id, {
      rotation: rotateStart.current.rotation + (event.clientX - rotateStart.current.x) * 0.5
    });
  }

  function handleRotatePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    rotateStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      className={`absolute cursor-move touch-none ${rounded ? "rounded-[10px]" : ""}`}
      style={{
        left: activeLayer.x || 0,
        top: activeLayer.y || 0,
        width: Math.max(activeLayer.width || 1, 1),
        height: keepAspectHeight,
        zIndex: activeLayer.zIndex,
        opacity: activeLayer.opacity,
        transform: `rotate(${activeLayer.rotation || 0}deg)`,
        transformOrigin: "center"
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <FigmaFrameCrop
        uploadedKV={uploadedKV}
        frame={frame}
        width={Math.max(activeLayer.width || 1, 1)}
        height={keepAspectHeight}
        mode={mode}
        className={`h-full w-full overflow-hidden ${rounded ? "rounded-[10px]" : ""}`}
      />
      {selected ? (
        <>
          <div className="pointer-events-none absolute inset-0 border-4 border-[#2563EB]" />
          <div
            className="absolute flex h-28 w-28 cursor-grab items-center justify-center rounded-full border-4 border-white bg-[#2563EB] text-[18px] font-black text-white shadow-sm active:cursor-grabbing"
            style={{ right: -18, top: -18 }}
            onPointerDown={handleRotatePointerDown}
            onPointerMove={handleRotatePointerMove}
            onPointerUp={handleRotatePointerUp}
            title="拖拽旋转"
          >
            ↻
          </div>
        </>
      ) : null}
    </div>
  );
}

function SearchAladdinPreview({ scene, copyConfig, visualConfig, kvImageUrl }: PreviewProps) {
  const visible = useLayer(scene);
  return (
    <div className="relative h-full w-full" style={{ background: visualConfig.colors.background }}>
      {visualConfig.showGrid && visible("grid") ? <GridBackground /> : null}
      {visible("englishLabel") ? <div className="absolute left-[48px] top-[42px] font-mono text-[20px] font-bold text-[#4B5563]">(Encyclopedia)</div> : null}
      {visible("title") ? <div className="absolute left-[48px] top-[76px] text-[72px] font-black leading-none tracking-tight" style={{ color: visualConfig.colors.title }}>{copyConfig.title}</div> : null}
      {visible("subtitle") ? <div className="absolute left-[48px] top-[178px] rounded bg-white/85 px-20 py-10 text-[32px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.subtitle}</div> : null}
      {visualConfig.showMainPhoto && visible("mainPhoto") ? <PhotoBlock className="absolute right-[70px] top-[48px] h-[190px] w-[300px]" src={kvImageUrl} /> : null}
      {visualConfig.showBlueSofa && visible("blueSofa") ? <ShapeSofa className="absolute right-[276px] top-[122px] h-[80px] w-[110px]" color={visualConfig.colors.blue} /> : null}
      {visualConfig.showYellowChair && visible("yellowChair") ? <ShapeChair className="absolute right-[140px] top-[86px] h-[128px] w-[70px]" color={visualConfig.colors.yellow} /> : null}
      {visualConfig.showRedChair && visible("redChair") ? <ShapeChair className="absolute right-[44px] top-[172px] h-[104px] w-[70px]" color={visualConfig.colors.red} /> : null}
      {visualConfig.showYellowDots && visible("grid") ? <><Dot className="absolute left-[250px] top-[86px]" color={visualConfig.colors.yellow} /><Dot className="absolute left-[730px] top-[178px]" color={visualConfig.colors.yellow} /></> : null}
      <div className="absolute bottom-[32px] left-[48px] text-[32px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.topic}</div>
      <div className="absolute bottom-[34px] left-[360px] text-[26px] font-bold text-[#6B7280]">2034人参与 · 1.7亿次播放</div>
      {visible("cta") ? <div className="absolute bottom-[24px] right-[74px] rounded-full bg-white px-48 py-[18px] text-[28px] font-black shadow-sm">☆ 收藏</div> : null}
    </div>
  );
}

function SearchResultFigmaPreview({ scene, copyConfig, visualConfig, kvImageUrl, uploadedKV, selectedFrameIds, selectedLayerId, setSelectedLayerId, updateLayer, canvasScale }: PreviewProps) {
  const visible = useLayer(scene);
  const getLayer = React.useCallback((id: string) => scene.layers.find((layer) => layer.id === id), [scene.layers]);
  const selectedFrames = uploadedKV?.figmaFrames ? getSelectedFigmaFrames(uploadedKV.figmaFrames, selectedFrameIds || []) : [];
  const titleFrame = findFigmaFrame(selectedFrames, "title");
  const subtitleFrame = findFigmaFrame(selectedFrames, "subtitle");
  const picFrame = findFigmaFrame(selectedFrames, "pic");
  const timeFrame = findFigmaFrame(selectedFrames, "time");
  const textureFrame = findFigmaFrame(selectedFrames, "texture");
  const canUseFigmaFrames = Boolean(uploadedKV?.previewImageUrl);
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f8f8f8] text-[#161823]" style={{ fontFamily: "PingFang SC, system-ui, sans-serif" }}>
      <img src={figmaHomeKvAssets.searchAladdinTemplate} alt="搜索阿拉丁场景模板" className="absolute inset-0 h-full w-full object-fill" />

      <div className="absolute left-0 top-[393px] h-[330px] w-[1170px] bg-[#f5f5f5]">
        {canUseFigmaFrames && textureFrame && visualConfig.showGrid && visible("grid") ? (
          <EditableFigmaFrameCrop uploadedKV={uploadedKV!} frame={textureFrame} layer={getLayer("grid")} sceneId={scene.sceneId} mode="cover" selected={selectedLayerId === "grid"} onSelect={() => setSelectedLayerId?.("grid")} updateLayer={updateLayer} canvasScale={canvasScale} />
        ) : visualConfig.showGrid && visible("grid") ? (
          <GridBackground />
        ) : null}
        {canUseFigmaFrames && titleFrame && visible("title") ? (
          <EditableFigmaFrameCrop uploadedKV={uploadedKV!} frame={titleFrame} layer={getLayer("title")} sceneId={scene.sceneId} mode="contain" selected={selectedLayerId === "title"} onSelect={() => setSelectedLayerId?.("title")} updateLayer={updateLayer} canvasScale={canvasScale} />
        ) : visible("title") ? (
          <div className="absolute left-[48px] top-[84px] text-[78px] font-black leading-none tracking-[-2px]" style={{ color: visualConfig.colors.title }}>
            {copyConfig.title}
          </div>
        ) : null}
        {!canUseFigmaFrames ? <div className="absolute left-[250px] top-[72px] h-[124px] w-[520px] border-l-[4px] border-r-[4px]" style={{ borderColor: visualConfig.colors.yellow }} /> : null}
        {!canUseFigmaFrames && visualConfig.showYellowDots ? (
          <>
            <Dot className="absolute left-[238px] top-[64px]" color={visualConfig.colors.yellow} />
            <Dot className="absolute left-[760px] top-[188px]" color={visualConfig.colors.yellow} />
          </>
        ) : null}
        {canUseFigmaFrames && subtitleFrame && visible("subtitle") ? (
          <EditableFigmaFrameCrop uploadedKV={uploadedKV!} frame={subtitleFrame} layer={getLayer("subtitle")} sceneId={scene.sceneId} mode="contain" selected={selectedLayerId === "subtitle"} onSelect={() => setSelectedLayerId?.("subtitle")} updateLayer={updateLayer} canvasScale={canvasScale} />
        ) : visible("subtitle") ? (
          <div className="absolute left-[48px] top-[202px] bg-white px-[28px] py-[12px] text-[34px] font-black" style={{ color: visualConfig.colors.title }}>
            {copyConfig.subtitle}
            <span className="ml-[16px] inline-flex h-[42px] w-[42px] items-center justify-center rounded-full text-[28px] text-white" style={{ background: visualConfig.colors.red }}>♪</span>
          </div>
        ) : null}
        {canUseFigmaFrames && picFrame && visualConfig.showMainPhoto && visible("mainPhoto") ? (
          <EditableFigmaFrameCrop uploadedKV={uploadedKV!} frame={picFrame} layer={getLayer("mainPhoto")} sceneId={scene.sceneId} mode="cover" rounded selected={selectedLayerId === "mainPhoto"} onSelect={() => setSelectedLayerId?.("mainPhoto")} updateLayer={updateLayer} canvasScale={canvasScale} />
        ) : visualConfig.showMainPhoto && visible("mainPhoto") ? (
          <PhotoBlock className="absolute right-[76px] top-[48px] h-[180px] w-[290px]" src={kvImageUrl} />
        ) : null}
        {canUseFigmaFrames && timeFrame && visible("time") ? (
          <EditableFigmaFrameCrop uploadedKV={uploadedKV!} frame={timeFrame} layer={getLayer("time")} sceneId={scene.sceneId} mode="contain" selected={selectedLayerId === "time"} onSelect={() => setSelectedLayerId?.("time")} updateLayer={updateLayer} canvasScale={canvasScale} />
        ) : null}
        {!canUseFigmaFrames && visualConfig.showBlueSofa ? <ShapeSofa className="absolute right-[290px] top-[130px] h-[70px] w-[112px]" color={visualConfig.colors.blue} /> : null}
        {!canUseFigmaFrames && visualConfig.showYellowChair ? <ShapeChair className="absolute right-[152px] top-[80px] h-[132px] w-[70px]" color={visualConfig.colors.yellow} /> : null}
        {!canUseFigmaFrames && visualConfig.showRedChair ? <ShapeChair className="absolute right-[42px] top-[178px] h-[100px] w-[72px]" color={visualConfig.colors.red} /> : null}
      </div>
    </div>
  );
}

function MessageCardPreview({ scene, copyConfig, visualConfig, kvImageUrl }: PreviewProps) {
  const visible = useLayer(scene);
  return (
    <div className="relative h-full w-full bg-[#F3F4F6] p-24">
      <div className="h-full rounded-[32px] bg-white p-28 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-[24px] font-black" style={{ color: visualConfig.colors.title }}>抖音创作小助手</div>
          <div className="text-[18px] text-[#9CA3AF]">刚刚</div>
        </div>
        {visible("title") ? <div className="mt-[22px] text-[34px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.messageTitle}</div> : null}
        {visible("subtitle") ? <div className="mt-14 w-[430px] text-[22px] font-semibold leading-[1.45] text-[#4B5563]">{copyConfig.messageBody}</div> : null}
        {visualConfig.showMainPhoto && visible("mainPhoto") ? <PhotoBlock className="absolute right-[58px] top-[104px] h-[126px] w-[150px]" src={kvImageUrl} /> : null}
        {visible("cta") ? <div className="absolute bottom-[36px] left-[52px] text-[24px] font-black" style={{ color: visualConfig.colors.brand }}>查看详情 →</div> : null}
      </div>
      <div className="absolute left-[42px] top-[38px] h-14 w-14 rounded-full" style={{ background: visualConfig.colors.brand }} />
    </div>
  );
}

function ActivityCenterPreview({ scene, copyConfig, visualConfig, kvImageUrl }: PreviewProps) {
  const visible = useLayer(scene);
  return (
    <div className="relative h-full w-full bg-white p-24">
      <div className="relative h-[210px] overflow-hidden rounded-[30px]" style={{ background: visualConfig.colors.background }}>
        {visualConfig.showGrid && visible("grid") ? <GridBackground /> : null}
        {visible("title") ? <div className="absolute left-32 top-[42px] text-[44px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.title}</div> : null}
        {visible("subtitle") ? <div className="absolute left-32 top-[105px] text-[22px] font-bold text-[#4B5563]">{copyConfig.subtitle}</div> : null}
        {visualConfig.showMainPhoto && visible("mainPhoto") ? <PhotoBlock className="absolute right-[26px] top-[26px] h-[150px] w-[190px]" src={kvImageUrl} /> : null}
        <div className="absolute left-28 top-24 rounded-full px-[18px] py-8 text-[18px] font-black text-white" style={{ background: visualConfig.colors.brand }}>活动</div>
      </div>
      <div className="mt-24 flex items-center justify-between">
        <div>
          <div className="text-[30px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.title}</div>
          <div className="mt-8 text-[20px] font-semibold text-[#6B7280]">{copyConfig.date}</div>
        </div>
        {visible("cta") ? <div className="rounded-full px-[30px] py-16 text-[22px] font-black text-white" style={{ background: visualConfig.colors.title }}>{copyConfig.cta}</div> : null}
      </div>
    </div>
  );
}

function CreatorCenterPreview({ scene, copyConfig, visualConfig, kvImageUrl }: PreviewProps) {
  const visible = useLayer(scene);
  return (
    <div className="relative h-full w-full bg-white">
      <div className="relative h-[210px]" style={{ background: visualConfig.colors.background }}>
        {visualConfig.showGrid && visible("grid") ? <GridBackground /> : null}
        {visible("title") ? <div className="absolute left-[38px] top-[54px] text-[52px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.title}</div> : null}
        {visible("subtitle") ? <div className="absolute left-[38px] top-32 rounded bg-white/85 px-20 py-8 text-[22px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.subtitle}</div> : null}
        {visualConfig.showMainPhoto && visible("mainPhoto") ? <PhotoBlock className="absolute right-[42px] top-[34px] h-[140px] w-[190px]" src={kvImageUrl} /> : null}
      </div>
      <div className="px-36 py-28">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[34px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.topic}</div>
            <div className="mt-6 text-[22px] font-semibold text-[#6B7280]">117.6 亿次播放</div>
          </div>
          {visible("cta") ? <div className="rounded-full bg-[#F3F4F6] px-28 py-14 text-[22px] font-black">☆ 收藏</div> : null}
        </div>
        <div className="mt-28 rounded-[28px] bg-[#F8FAFC] p-24 text-[22px] font-semibold leading-[1.55] text-[#374151]">{copyConfig.messageBody}</div>
      </div>
    </div>
  );
}

function TopicPagePreview({ scene, copyConfig, visualConfig, kvImageUrl }: PreviewProps) {
  const visible = useLayer(scene);
  return (
    <div className="relative h-full w-full bg-white">
      <div className="relative h-[150px]" style={{ background: visualConfig.colors.background }}>
        {visualConfig.showGrid && visible("grid") ? <GridBackground /> : null}
        {visible("title") ? <div className="absolute left-[34px] top-44 text-[40px] font-black" style={{ color: visualConfig.colors.title }}>{copyConfig.topic}</div> : null}
        {visualConfig.showMainPhoto && visible("mainPhoto") ? <PhotoBlock className="absolute right-36 top-24 h-[102px] w-[150px]" src={kvImageUrl} /> : null}
      </div>
      <div className="grid grid-cols-4 border-b border-[#E5E7EB] text-center text-[22px] font-black text-[#4B5563]">
        {["综合", "最新", "最热", "相似话题"].map((tab, index) => <div key={tab} className="py-[18px]">{tab}{index === 0 ? <div className="mx-auto mt-8 h-4 w-32 rounded-full bg-[#111827]" /> : null}</div>)}
      </div>
      <div className="grid grid-cols-3 gap-14 p-24">
        {[0, 1, 2].map((item) => <div key={item} className="h-[110px] rounded-[18px] bg-[#E5E7EB]" />)}
      </div>
      {visible("cta") ? <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full px-[42px] py-16 text-[22px] font-black text-white" style={{ background: visualConfig.colors.brand }}>{copyConfig.cta}</div> : null}
    </div>
  );
}

type PreviewProps = {
  scene: GeneratedScene;
  copyConfig: CopyConfig;
  visualConfig: VisualConfig;
  kvImageUrl?: string;
  uploadedKV?: UploadedKV | null;
  selectedFrameIds?: string[];
  selectedLayerId?: string | null;
  setSelectedLayerId?: React.Dispatch<React.SetStateAction<string | null>>;
  updateLayer?: (sceneId: string, layerId: string, patch: Partial<LayerNode>) => void;
  canvasScale?: number;
};

function GridBackground() {
  return <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(17,24,39,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,.12) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />;
}

function PhotoBlock({ className, src }: { className?: string; src?: string }) {
  return (
    <div className={`${className || ""} overflow-hidden rounded-[18px] bg-[#C8B8A1] shadow-sm`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[linear-gradient(135deg,#8B735F,#E6D7C3_45%,#6B7280)]" />}
    </div>
  );
}

function ShapeSofa({ className, color }: { className?: string; color: string }) {
  return <div className={`${className || ""} rounded-b-[24px] rounded-tl-[26px]`} style={{ background: color }} />;
}

function ShapeChair({ className, color }: { className?: string; color: string }) {
  return <div className={`${className || ""} rounded-t-[18px] rounded-bl-[22px]`} style={{ background: color }} />;
}

function Dot({ className, color }: { className?: string; color: string }) {
  return <div className={`${className || ""} h-20 w-20 rounded-full`} style={{ background: color }} />;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-bold text-[#374151]">{children}</span>;
}

function toggleValue(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function readImageFile(file: File): Promise<UploadedKV> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const image = new Image();
      image.onload = () => {
        resolve({
          source: "image",
          file,
          name: file.name || "pasted-kv.png",
          type: file.type.replace("image/", "").toUpperCase(),
          width: image.naturalWidth,
          height: image.naturalHeight,
          dataUrl
        });
      };
      image.onerror = () => reject(new Error("图片格式无法识别"));
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function parseFigmaUrl(value: string): { fileKey: string; nodeId?: string } | null {
  try {
    const text = value.trim();
    const figmaUrl = text.match(/https?:\/\/(?:www\.)?figma\.com\/[^\s)]+/i)?.[0] || text;
    const url = new URL(figmaUrl);
    if (!url.hostname.includes("figma.com")) return null;
    const match = url.pathname.match(/\/(?:file|design)\/([^/]+)/);
    const fileKey = match?.[1];
    if (!fileKey) return null;
    const nodeId = url.searchParams.get("node-id") || undefined;
    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

async function requestFigmaNodeParse(fileKey: string, nodeId?: string) {
  const endpoints = ["/api/figma/parse-node", "http://127.0.0.1:8796/api/figma/parse-node", "http://127.0.0.1:8795/api/figma/parse-node"];
  let lastError = "Figma 节点解析失败";

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fileKey, nodeId })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        lastError = payload?.error || lastError;
        continue;
      }

      return payload as {
        fileKey: string;
        nodeId: string;
        name: string;
        width: number;
        height: number;
        previewImageUrl: string | null;
        frames: FigmaFrameUnit[];
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  throw new Error(lastError);
}

function normalizeFigmaNodeId(nodeId?: string) {
  return nodeId?.replace("-", ":");
}

function isHomeKvFigmaSource(fileKey?: string, nodeId?: string) {
  return nodeId === HOME_KV_FIGMA_NODE_ID || (fileKey === UNTITLED_HOME_KV_FIGMA_FILE_KEY && (!nodeId || nodeId === UNTITLED_HOME_KV_FIGMA_NODE_ID));
}

function createMockFigmaFrameUnits(fileKey?: string, nodeId?: string): FigmaFrameUnit[] {
  const rootId = normalizeFigmaNodeId(nodeId) || "2065:1407";
  if (isHomeKvFigmaSource(fileKey, rootId)) {
    if (fileKey === UNTITLED_HOME_KV_FIGMA_FILE_KEY) {
      return [
        { id: "1:3", name: "texture", x: -27, y: -53.4375, width: 1919.8505859375, height: 8640.6767578125, depth: 0, role: "background-texture" },
        { id: "1:49", name: "title", x: 29.5078125, y: 86.21728515625, width: 1057.484375, height: 228.56494140625, depth: 0, role: "title-component" },
        { id: "1:67", name: "pic", x: 53.015625, y: 353.00048828125, width: 1021, height: 1081.00048828125, depth: 0, role: "main-visual" },
        { id: "1:78", name: "subtitle", x: 53.015625, y: 1434.0009765625, width: 1019, height: 117.99999237060547, depth: 0, role: "subtitle-bar" },
        { id: "1:85", name: "time", x: 101.390625, y: 394.05126953125, width: 197.19625854492188, height: 278.6468811035156, depth: 0, role: "time-card" }
      ];
    }
    return [
      { id: "2072:2472", name: "背景网格 Frame", x: 0, y: 0, width: 1125, height: 1611, depth: 0, role: "background-grid" },
      { id: "2072:2468", name: "标题组合 Frame", x: 30, y: 86, width: 1057, height: 229, depth: 0, role: "title-component" },
      { id: "2072:2471", name: "主视觉照片 Frame", x: 53, y: 353, width: 1021, height: 1081, depth: 0, role: "main-visual" },
      { id: "1564:6591", name: "活动时间牌 Frame", x: 101, y: 394, width: 197, height: 279, depth: 0, role: "time-card" },
      { id: "2072:2470", name: "底部 Slogan Frame", x: 53, y: 1434, width: 1019, height: 118, depth: 0, role: "subtitle-bar" }
    ];
  }
  return [
    { id: "2065:1570", name: "导航搜索区 Frame", x: 0, y: 0, width: 1170, height: 393, depth: 0, role: "navigation" },
    { id: "2065:1481", name: "阿拉丁主 KV Frame", x: 0, y: 393, width: 1170, height: 330, depth: 0, role: "main-kv-card" },
    { id: "2065:1544", name: "标题与 Slogan Frame", x: 33, y: 442, width: 710, height: 235, depth: 1, role: "copy-component" },
    { id: "2065:1567", name: "右侧主视觉 Frame", x: 835, y: 416, width: 289, height: 260, depth: 1, role: "visual-component" },
    { id: "2065:1654", name: "话题信息 Frame", x: 0, y: 903, width: 1170, height: 1059, depth: 0, role: "topic-info-card" },
    { id: "2065:1674", name: "视频内容卡 Frame", x: 12, y: 1974, width: 1146, height: 1669, depth: 0, role: "video-card" },
    { id: "2065:1679", name: "互动区 Frame", x: 12, y: 3343, width: 1146, height: 252, depth: 1, role: "engagement" },
    { id: "2065:1688", name: "热评组件 Frame", x: 12, y: 2088, width: 1146, height: 138, depth: 1, role: "comment-component" }
  ];
}

function statusLabel(status: AppStatus) {
  const labels: Record<AppStatus, string> = {
    empty: "未上传",
    uploaded: "已上传",
    analyzing: "AI 分析中",
    analyzed: "AI 分析完成",
    selecting: "选择场景",
    generating: "生成中",
    generated: "生成完成"
  };
  return labels[status];
}
