import React from "react";
import ReactDOM from "react-dom/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Maximize2,
  Paperclip,
  Pin,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Wand2,
  Archive,
  X
} from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import "./styles.css";

type Decoration = {
  tape: string;
  pin: string;
  rotate: number;
  clip: "tape" | "pin" | "clip" | "washi";
};

type InspirationImage = {
  id: string;
  clientId?: string;
  userId?: string;
  weekStart: string;
  dayIndex: number;
  title: string;
  imageDataUrl?: string | null;
  imageUrl?: string | null;
  storagePath?: string | null;
  sourceFingerprint?: string;
  imageAspectRatio?: number;
  keywords: string[];
  reversePrompt: string;
  decoration: Decoration;
  createdAt?: string;
  updatedAt?: string;
  analysisNote?: string;
};

type CardPosition = {
  x: number;
  y: number;
};

type SearchSuggestion = {
  keyword: string;
  count: number;
};

type UiStyle = "journal" | "gallery" | "archive";

type AuthConfig = {
  enabled?: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const dayShort = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const tapes = ["#f8d891", "#f0b8a4", "#d7c3ff", "#b8d8bd", "#f5eee2"];
const pins = ["#d6a316", "#b15b3d", "#6f8d63", "#7b61ff"];
const clips: Decoration["clip"][] = ["tape", "pin", "clip", "washi"];
const localStorageKey = "design-terminology-journal";
const deletedCardsStorageKey = "design-terminology-deleted-cards";
const positionStorageKey = "design-terminology-card-positions";
const galleryPositionStorageKey = "design-terminology-gallery-card-positions";
const authTokenStorageKey = "journal-auth-token";
const uiStyleStorageKey = "journal-ui-style";
const columnWidth = 1200;
const boardWidth = columnWidth * 7;
const boardHeight = 3200;
const defaultStyleScales: Record<UiStyle, number> = { journal: 0.5, gallery: 1, archive: 0.42 };
const uiStyles: Array<{ id: UiStyle; label: string; description: string }> = [
  { id: "journal", label: "手帐", description: "纸张、胶带和轻微错落排版" },
  { id: "gallery", label: "漂浮", description: "无边界空间、分层漂浮卡片和纵深浏览" },
  { id: "archive", label: "档案", description: "馆藏目录、黑框图片和索引信息" }
];
const defaultPromptTemplate = `请你作为一名资深视觉设计师和 AI 视觉风格分析师，基于用户上传的参考图反推出一段可复用的 AI 生图 prompt。

请重点分析：
1. 视觉类型与设计语言
2. 构图系统与视觉重心
3. 核心元素、必要元素、禁止元素
4. 字体气质与图文关系
5. 色彩系统、饱和度、明度、对比度
6. 材质、肌理、颗粒、印刷或手绘特征
7. 信息密度与层级
8. 最容易翻车的 Anti-AI 规则

最终输出要能直接用于 AI 生图工具。`;

function App() {
  if (new URLSearchParams(window.location.search).get("migrate") === "export") return <MigrationExport />;
  return <JournalApp />;
}

function JournalApp() {
  const defaultTemplate = React.useMemo(() => readDefaultPromptTemplate(), []);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [images, setImages] = React.useState<InspirationImage[]>([]);
  const [activeCard, setActiveCard] = React.useState<InspirationImage | null>(null);
  const [pending, setPending] = React.useState<Record<string, boolean>>({});
  const [uiStyle, setUiStyle] = React.useState<UiStyle>(() => readUiStyle());
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<InspirationImage[]>([]);
  const [searchSuggestions, setSearchSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [searchMode, setSearchMode] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [canvasScale, setCanvasScale] = React.useState(1);
  const styleScaleRef = React.useRef<Record<UiStyle, number>>({ ...defaultStyleScales });
  const [galleryDepth, setGalleryDepth] = React.useState(0);
  const [cardPositions, setCardPositions] = React.useState<Record<string, CardPosition>>(() => readPositions());
  const [galleryCardPositions, setGalleryCardPositions] = React.useState<Record<string, CardPosition>>(() => readPositions(galleryPositionStorageKey));
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimerRef = React.useRef<number | null>(null);
  const [promptTemplate, setPromptTemplate] = React.useState(() => localStorage.getItem("journal-prompt-template") || defaultTemplate);
  const viewportRef = React.useRef<HTMLElement>(null);
  const searchBoxRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const floatingInputRef = React.useRef<HTMLInputElement>(null);
  const pinchDistanceRef = React.useRef<number | null>(null);
  const canvasPanRef = React.useRef<{ pointerId: number; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const centeredWeekRef = React.useRef<string | null>(null);
  const zoomAnchorRef = React.useRef<{ pointerX: number; pointerY: number; worldX: number; worldY: number } | null>(null);
  const pendingCreateIdsRef = React.useRef(new Set<string>());
  const deletedCardIdsRef = React.useRef(readDeletedCards());
  const recentPasteSignatureRef = React.useRef<{ signature: string; at: number } | null>(null);
  const pasteInFlightRef = React.useRef(false);
  const recentImageFingerprintsRef = React.useRef(new Map<string, number>());
  const analysisRetryIdsRef = React.useRef(new Set<string>());
  const imagesRef = React.useRef<InspirationImage[]>([]);
  const weekStart = React.useMemo(() => startOfWeek(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const weekKey = formatKey(weekStart);
  const weekDates = React.useMemo(() => days.map((_, index) => addDays(weekStart, index)), [weekStart]);
  const todayWeekKey = React.useMemo(() => formatKey(startOfWeek(new Date())), []);

  const activeUiStyle = React.useMemo(() => uiStyles.find((style) => style.id === uiStyle) || uiStyles[0], [uiStyle]);
  const nextUiStyle = React.useCallback(() => {
    styleScaleRef.current[uiStyle] = canvasScale;
    const index = uiStyles.findIndex((style) => style.id === uiStyle);
    const nextStyle = uiStyles[(index + 1) % uiStyles.length].id;
    if (nextStyle === "journal") centeredWeekRef.current = null;
    setCanvasScale(nextStyle === "journal" ? defaultStyleScales.journal : styleScaleRef.current[nextStyle]);
    setUiStyle(nextStyle);
  }, [canvasScale, uiStyle]);

  React.useEffect(() => {
    styleScaleRef.current = { ...defaultStyleScales };
    setCanvasScale(styleScaleRef.current[uiStyle]);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", false);
    document.documentElement.dataset.uiStyle = uiStyle;
    localStorage.setItem(uiStyleStorageKey, uiStyle);
    localStorage.setItem("journal-theme", "light");
  }, [uiStyle]);

  React.useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const disconnectedAnalysisSignature = images
    .filter((card) => needsAnalysisRetry(card) && Boolean(getCardImageSrc(card)))
    .map((card) => card.id)
    .join("|");

  React.useEffect(() => {
    const retryableCards = images.filter(
      (card) => needsAnalysisRetry(card) && Boolean(getCardImageSrc(card)) && !analysisRetryIdsRef.current.has(card.id)
    );
    if (!retryableCards.length) return;

    let cancelled = false;
    void (async () => {
      const statusResponse = await fetch("/api/ai/status").catch(() => null);
      const status = statusResponse?.ok ? await statusResponse.json().catch(() => null) : null;
      if (!status?.configured || cancelled) return;

      for (const card of retryableCards) {
        if (cancelled) return;
        analysisRetryIdsRef.current.add(card.id);
        setPending((current) => ({ ...current, [card.id]: true }));
        try {
          const response = await fetch("/api/analyze-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageDataUrl: getCardImageSrc(card), promptTemplate })
          });
          if (!response.ok) throw new Error("AI 重新分析失败");
          const analysis = (await response.json()) as { keywords: string[]; reversePrompt: string };
          if (cancelled) return;

          setImages((current) =>
            persistLocal(
              weekKey,
              current.map((item) =>
                item.id === card.id
                  ? { ...item, keywords: analysis.keywords, reversePrompt: analysis.reversePrompt, analysisNote: "AI 已重新连接并完成分析" }
                  : item
              )
            )
          );

          if (!card.id.startsWith("temp-")) {
            void fetch(`/api/images/${card.id}/analysis`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
              body: JSON.stringify(analysis)
            }).catch(() => undefined);
          }
        } catch {
          analysisRetryIdsRef.current.delete(card.id);
        } finally {
          if (!cancelled) {
            setPending((current) => {
              const next = { ...current };
              delete next[card.id];
              return next;
            });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [disconnectedAnalysisSignature, promptTemplate, weekKey]);

  React.useEffect(() => {
    setCardPositions((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([, position]) => Math.abs(position.x) <= columnWidth && Math.abs(position.y) <= boardHeight)
      );
      if (Object.keys(next).length === Object.keys(current).length) return current;
      savePositions(next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    loadWeek(weekKey).then(setImages);
  }, [weekKey]);

  React.useEffect(() => {
    const syncWeek = () => {
      if (document.hidden) return;
      if (pendingCreateIdsRef.current.size > 0) return;
      void loadWeek(weekKey).then((rows) => applySyncedRows(rows, weekKey));
    };
    const timer = window.setInterval(syncWeek, 2500);
    window.addEventListener("ai-journal-sync", syncWeek);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("ai-journal-sync", syncWeek);
    };
  }, [weekKey]);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const anchor = zoomAnchorRef.current;
    if (!viewport || !anchor) return;

    viewport.scrollLeft = anchor.worldX * canvasScale - anchor.pointerX;
    viewport.scrollTop = anchor.worldY * canvasScale - anchor.pointerY;
    zoomAnchorRef.current = null;
  }, [canvasScale]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    const todayIndex = findTodayIndex(weekDates);
    const centerKey = `${weekKey}:${uiStyle}`;
    if (!viewport || uiStyle === "gallery" || todayIndex < 0 || centeredWeekRef.current === centerKey) return;

    centeredWeekRef.current = centerKey;
    requestAnimationFrame(() => {
      const targetLeft = (todayIndex * columnWidth + columnWidth / 2) * canvasScale - viewport.clientWidth / 2;
      viewport.scrollLeft = Math.max(0, targetLeft);
      viewport.scrollTop = 0;
    });
  }, [canvasScale, uiStyle, weekDates, weekKey]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || uiStyle !== "gallery") return;

    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, (boardWidth * canvasScale - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (boardHeight * canvasScale - viewport.clientHeight) / 2);
    });
  }, [canvasScale, uiStyle, weekKey]);

  React.useEffect(() => {
    localStorage.setItem("journal-prompt-template", promptTemplate);
  }, [promptTemplate]);

  React.useEffect(() => {
    const blurSearchOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && searchBoxRef.current?.contains(target)) return;
      searchInputRef.current?.blur();
    };
    document.addEventListener("pointerdown", blurSearchOnOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", blurSearchOnOutsidePointerDown, true);
  }, []);

  React.useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchSuggestions([]);
      setSearchLoading(false);
      setSearchMode(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const headers = await getAuthHeaders();
        const [response, suggestionsResponse] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers }),
          fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, { headers })
        ]);
        if (!response.ok) throw new Error("search unavailable");
        const rows = ((await response.json()) as InspirationImage[]).map(resolveLegacyCard);
        const suggestions = suggestionsResponse.ok ? ((await suggestionsResponse.json()) as SearchSuggestion[]) : [];
        if (!cancelled) {
          setSearchResults(rows);
          setSearchSuggestions(suggestions);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchSuggestions([]);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  React.useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text/plain") || "";
      if (tryImportMigrationData(text, notify)) {
        event.preventDefault();
        window.setTimeout(() => window.location.reload(), 650);
        return;
      }

      const files = imageFilesFromClipboard(event.clipboardData);
      if (!files.length) return;
      const globalWindow = window as Window & { __journalPasteLockAt?: number };
      const globalNow = Date.now();
      if (globalWindow.__journalPasteLockAt && globalNow - globalWindow.__journalPasteLockAt < 1800) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      globalWindow.__journalPasteLockAt = globalNow;
      if (pasteInFlightRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const signature = files.map((file) => `${file.name}:${file.type}:${file.size}:${file.lastModified}`).join("|");
      const previousPaste = recentPasteSignatureRef.current;
      const now = Date.now();
      if (previousPaste && previousPaste.signature === signature && now - previousPaste.at < 1200) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      recentPasteSignatureRef.current = { signature, at: now };
      pasteInFlightRef.current = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      void addFilesToToday(files).finally(() => {
        window.setTimeout(() => {
          pasteInFlightRef.current = false;
        }, 250);
        window.setTimeout(() => {
          if (globalWindow.__journalPasteLockAt === globalNow) delete globalWindow.__journalPasteLockAt;
        }, 1800);
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [todayWeekKey, weekKey]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      if (uiStyle === "gallery") {
        event.preventDefault();
        setGalleryDepth((current) => clamp(current - event.deltaY * 1.1, 0, images.length * 240 + 720));
        return;
      }
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomCanvasAt(Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [images.length, uiStyle]);

  function zoomCanvasAt(scaleFactor: number, clientX: number, clientY: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    setCanvasScale((previousScale) => {
      const nextScale = clamp(previousScale * scaleFactor, uiStyle === "gallery" ? 0.02 : 0.05, uiStyle === "gallery" ? 48 : 12);
      if (nextScale === previousScale) return previousScale;

      const rect = viewport.getBoundingClientRect();
      const pointerX = clientX - rect.left;
      const pointerY = clientY - rect.top;
      const worldX = (viewport.scrollLeft + pointerX) / previousScale;
      const worldY = (viewport.scrollTop + pointerY) / previousScale;
      zoomAnchorRef.current = { pointerX, pointerY, worldX, worldY };

      return nextScale;
    });
  }

  function moveCard(id: string, position: CardPosition) {
    const updatePositions = uiStyle === "gallery" ? setGalleryCardPositions : setCardPositions;
    const storageKey = uiStyle === "gallery" ? galleryPositionStorageKey : positionStorageKey;
    updatePositions((current) => {
      const next = { ...current, [id]: position };
      savePositions(next, storageKey);
      return next;
    });
  }

  function notify(message: string) {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1500);
  }

  function applySyncedRows(rows: InspirationImage[], targetWeekKey = weekKey) {
    setImages((current) => {
      const protectedRows = current.filter((item) => item.weekStart === targetWeekKey && (pendingCreateIdsRef.current.has(item.id) || item.id.startsWith("temp-")));
      const deletedIds = currentDeletedCards(deletedCardIdsRef);
      const nextRows = mergeCards(protectedRows, rows).filter((item) => !deletedIds.has(item.id));
      if (sameCards(current, nextRows)) return current;
      return persistLocal(targetWeekKey, nextRows);
    });
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (event.touches.length !== 2) {
      pinchDistanceRef.current = null;
      return;
    }
    pinchDistanceRef.current = touchDistance(event.touches[0], event.touches[1]);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (event.touches.length !== 2 || pinchDistanceRef.current === null) return;
    event.preventDefault();
    const nextDistance = touchDistance(event.touches[0], event.touches[1]);
    const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
    zoomCanvasAt(nextDistance / pinchDistanceRef.current, centerX, centerY);
    pinchDistanceRef.current = nextDistance;
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLElement>) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (event.button !== 0 || event.pointerType === "touch") return;
    if ((event.target as HTMLElement).closest("[data-canvas-pan-ignore='true'], button, input, textarea, select, a")) return;

    event.preventDefault();
    canvasPanRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLElement>) {
    const viewport = viewportRef.current;
    const pan = canvasPanRef.current;
    if (!viewport || !pan || pan.pointerId !== event.pointerId) return;
    event.preventDefault();
    viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
    viewport.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
  }

  function handleCanvasPointerEnd(event: React.PointerEvent<HTMLElement>) {
    const pan = canvasPanRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    canvasPanRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  }

  async function loadWeek(key: string) {
    const deletedIds = currentDeletedCards(deletedCardIdsRef);
    const localRows = readLocal(key).filter((row) => !deletedIds.has(row.id)).map(resolveLegacyCard);
    try {
      const response = await fetch(`/api/images?weekStart=${key}`, {
        headers: await getAuthHeaders()
      });
      if (!response.ok) throw new Error("api unavailable");
      const serverRows = ((await response.json()) as InspirationImage[]).filter((row) => !deletedIds.has(row.id)).map(resolveLegacyCard);
      const rows = mergeCards(localRows, serverRows);
      if (rows.length) saveLocal(key, rows);
      return rows;
    } catch {
      return localRows;
    }
  }

  async function addFiles(files: File[], dayIndex: number, targetWeekKey = weekKey) {
    const batchFingerprints = new Set<string>();
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const imageAspectRatio = await imageAspectRatioFromFile(file);
      const imageDataUrl = await fileToDataUrl(file);
      const sourceFingerprint = await fingerprintDataUrl(imageDataUrl);
      if (batchFingerprints.has(sourceFingerprint)) continue;
      batchFingerprints.add(sourceFingerprint);
      const nowMs = Date.now();
      for (const [fingerprint, timestamp] of recentImageFingerprintsRef.current) {
        if (nowMs - timestamp > 15000) recentImageFingerprintsRef.current.delete(fingerprint);
      }
      const alreadyCreating = recentImageFingerprintsRef.current.has(sourceFingerprint);
      const alreadyOnBoard = imagesRef.current.some(
        (item) => item.weekStart === targetWeekKey && item.dayIndex === dayIndex && item.sourceFingerprint === sourceFingerprint
      );
      if (alreadyCreating || alreadyOnBoard) continue;
      recentImageFingerprintsRef.current.set(sourceFingerprint, nowMs);
      const tempId = `temp-${crypto.randomUUID()}`;
      pendingCreateIdsRef.current.add(tempId);
      setCardPositions((current) => {
        if (!current[tempId]) return current;
        const next = { ...current };
        delete next[tempId];
        savePositions(next);
        return next;
      });
      const decoration = randomDecoration();
      const now = new Date().toISOString();
      const optimistic: InspirationImage = {
        id: tempId,
        clientId: tempId,
        weekStart: targetWeekKey,
        dayIndex,
        title: file.name || "pasted screenshot",
        imageDataUrl,
        sourceFingerprint,
        imageAspectRatio,
        decoration,
        keywords: ["分析中"],
        reversePrompt: "AI 正在分析视觉风格并生成反推 prompt...",
        analysisNote: "正在调用 AI",
        createdAt: now,
        updatedAt: now
      };
      setImages((current) => persistLocal(targetWeekKey, [...current, optimistic]));
      setPending((current) => ({ ...current, [tempId]: true }));

      try {
        const analysisImageDataUrl = await imageDataUrlToAnalysisPreview(imageDataUrl);
        const response = await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
          body: JSON.stringify({
            weekStart: targetWeekKey,
            dayIndex,
            title: optimistic.title,
            imageDataUrl,
            analysisImageDataUrl,
            decoration,
            promptTemplate,
            asyncAnalysis: true,
            fast: true
          })
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "AI 分析接口调用失败");
        }
        const resolved = (await response.json()) as InspirationImage;
        pendingCreateIdsRef.current.delete(tempId);
        setImages((current) =>
          persistLocal(
            targetWeekKey,
            current.map((item) =>
              item.id === tempId
                ? { ...resolved, clientId: tempId, sourceFingerprint, imageAspectRatio, analysisNote: resolved.analysisNote || "接口已返回关键词和 prompt" }
                : item
            )
          )
        );
        setCardPositions((current) => {
          if (!current[tempId]) return current;
          const next = { ...current, [resolved.id]: current[tempId] };
          delete next[tempId];
          savePositions(next);
          return next;
        });
        if (isAnalyzingCard(resolved)) {
          void waitForAnalysis(resolved.id, targetWeekKey);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 分析接口调用失败";
        const fallback = {
          ...optimistic,
          id: crypto.randomUUID(),
          clientId: tempId,
          sourceFingerprint,
          imageAspectRatio,
          keywords: ["AI 未连接"],
          reversePrompt: "没有配置可用的 GPT/Gemini API Key，应用无法根据图片生成真实关键词和 prompt。",
          analysisNote: `AI 接口未完成：${message}`
        };
        setImages((current) => persistLocal(targetWeekKey, current.map((item) => (item.id === tempId ? fallback : item))));
      } finally {
        pendingCreateIdsRef.current.delete(tempId);
        setPending((current) => {
          const next = { ...current };
          delete next[tempId];
          return next;
        });
      }
    }
  }

  async function waitForAnalysis(id: string, targetWeekKey: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await delay(attempt < 12 ? 1200 : 2500);
      try {
        const rows = await loadWeek(targetWeekKey);
        const updated = rows.find((item) => item.id === id);
        if (!updated) continue;
        setImages((current) => persistLocal(targetWeekKey, current.map((item) => (item.id === id ? { ...updated, analysisNote: isAnalyzingCard(updated) ? "AI 正在分析" : "AI 已生成" } : item))));
        if (!isAnalyzingCard(updated)) return;
      } catch {
        // Keep the optimistic card visible and try again briefly.
      }
    }
  }

  async function addFilesToToday(files: File[]) {
    if (weekKey !== todayWeekKey) {
      setWeekOffset(0);
    }
    await addFiles(files, findTodayIndex(days.map((_, index) => addDays(startOfWeek(new Date()), index))), todayWeekKey);
  }

  async function deleteKeyword(card: InspirationImage, keyword: string) {
    const keywords = card.keywords.filter((item) => item !== keyword);
    setImages((current) => persistLocal(weekKey, current.map((item) => (item.id === card.id ? { ...item, keywords } : item))));
    await fetch(`/api/images/${card.id}/keywords`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({ keywords })
    }).catch(() => undefined);
  }

  async function deleteCard(card: InspirationImage) {
    deletedCardIdsRef.current.add(card.id);
    rememberDeletedCard(card.id);
    const sameDayIds = images.filter((item) => item.weekStart === card.weekStart && item.dayIndex === card.dayIndex).map((item) => item.id);
    setCardPositions((current) => {
      const next = { ...current };
      for (const id of sameDayIds) delete next[id];
      savePositions(next);
      return next;
    });
    setGalleryCardPositions((current) => {
      if (!current[card.id]) return current;
      const next = { ...current };
      delete next[card.id];
      savePositions(next, galleryPositionStorageKey);
      return next;
    });
    setImages((current) => persistLocal(weekKey, current.filter((item) => item.id !== card.id)));
    await fetch(`/api/images/${card.id}`, {
      method: "DELETE",
      headers: await getAuthHeaders()
    }).catch(() => undefined);
  }

  function centerTodayContent() {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (uiStyle === "gallery") {
      viewport.scrollLeft = Math.max(0, (boardWidth * canvasScale - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (boardHeight * canvasScale - viewport.clientHeight) / 2);
      return;
    }

    const todayIndex = findTodayIndex(days.map((_, index) => addDays(startOfWeek(new Date()), index)));
    if (todayIndex < 0) return;

    const target = viewport.querySelector<HTMLElement>(`[data-day-index="${todayIndex}"] .polaroid-card`) || viewport.querySelector<HTMLElement>(`[data-day-index="${todayIndex}"] .day-heading`);
    if (target) {
      const viewportRect = viewport.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      viewport.scrollLeft = Math.max(0, viewport.scrollLeft + targetRect.left - viewportRect.left - (viewport.clientWidth - targetRect.width) / 2);
      viewport.scrollTop = Math.max(0, viewport.scrollTop + targetRect.top - viewportRect.top - 112);
      return;
    }

    const targetLeft = (todayIndex * columnWidth + columnWidth / 2) * canvasScale - viewport.clientWidth / 2;
    viewport.scrollLeft = Math.max(0, targetLeft);
    viewport.scrollTop = 0;
  }

  function goToToday() {
    centeredWeekRef.current = null;
    setSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchSuggestions([]);
    setSearchLoading(false);
    setWeekOffset(0);
    if (uiStyle === "gallery") setGalleryDepth(0);
    window.setTimeout(centerTodayContent, 80);
    window.setTimeout(centerTodayContent, 220);
  }

  function jumpToSearchResult(card: InspirationImage) {
    const targetWeekStart = parseDateKey(card.weekStart);
    const nextOffset = Math.round((targetWeekStart.getTime() - startOfWeek(new Date()).getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(nextOffset);
    setActiveCard(card);
    setSearchMode(false);

    window.setTimeout(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = Math.max(0, (card.dayIndex * columnWidth + columnWidth / 2) * canvasScale - viewport.clientWidth / 2);
      viewport.scrollTop = 0;
    }, 80);
  }

  function closeSearchPage() {
    setSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchSuggestions([]);
    setSearchLoading(false);
  }

  function imagesForDay(dayIndex: number) {
    return sortCardsForDay(images.filter((image) => image.dayIndex === dayIndex));
  }

  return (
    <main className={cn("hand-drawn-ui min-h-screen overflow-hidden bg-background text-foreground", `ui-style-${uiStyle}`)}>
      <div className="journal-grain" />
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-zinc-200/70 bg-background/92 px-4 py-3 backdrop-blur-xl dark:border-zinc-800/70">
        <div className="mx-auto flex max-w-[1880px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5">
            <h1 className="font-journal text-2xl font-medium tracking-normal text-zinc-950 dark:text-amber-50">
              Week {weekNumber(weekStart)}
            </h1>
            <span className="h-7 w-px bg-zinc-300 dark:bg-zinc-700" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatRange(weekStart, addDays(weekStart, 6))}</p>
          </div>
          <div ref={searchBoxRef} className="relative min-w-[280px] flex-1 max-w-[560px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInputRef}
              className="h-10 w-full rounded-lg border border-zinc-200/80 bg-white/90 px-9 pr-20 text-sm font-sans text-zinc-800 outline-none backdrop-blur-xl transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/88 dark:text-zinc-100"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchMode(Boolean(event.target.value.trim()));
              }}
              onFocus={() => setSearchMode(Boolean(searchQuery.trim()))}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchMode(false);
                if (event.key === "Enter" && searchQuery.trim()) setSearchMode(true);
              }}
              placeholder="搜索关键词 / prompt"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-sans text-zinc-400">
              {searchLoading ? "搜索中" : searchResults.length ? `${searchResults.length} 个结果` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="top-nav-button" onClick={() => setWeekOffset((value) => value - 1)} aria-label="上一周">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="top-nav-button h-9 rounded-md bg-white/90 px-4 text-xs dark:bg-zinc-900/80" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="top-nav-button" onClick={() => setWeekOffset((value) => value + 1)} aria-label="下一周">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <aside className="fixed right-5 top-[74px] z-40 overflow-hidden rounded-lg border border-zinc-200/80 bg-white/88 shadow-journal backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/88">
        <button
          className={cn("grid h-11 w-11 place-items-center border-b", templateOpen && "bg-amber-100 text-amber-950 dark:bg-amber-300/10 dark:text-amber-100")}
          onClick={() => setTemplateOpen((value) => !value)}
          aria-label="Prompt 模板"
          title="Prompt 模板"
        >
          <Wand2 className="h-4 w-4" />
        </button>
        <button
          className="style-switch-button grid h-11 w-11 place-items-center border-b"
          onClick={nextUiStyle}
          aria-label={`切换界面风格，当前为${activeUiStyle.label}`}
          title={`当前风格：${activeUiStyle.label}。点击切换下一种风格`}
        >
          <span className="relative grid h-5 w-5 place-items-center">
            {uiStyle === "journal" && <Sparkles className="h-4 w-4" />}
            {uiStyle === "gallery" && <Sun className="h-4 w-4" />}
            {uiStyle === "archive" && <Archive className="h-4 w-4" />}
          </span>
        </button>
        <button className="grid h-11 w-11 place-items-center border-b" aria-label="导出">
          <Download className="h-4 w-4" />
        </button>
        <button className="grid h-11 w-11 place-items-center text-red-500" aria-label="清理">
          <Trash2 className="h-4 w-4" />
        </button>
      </aside>

      {templateOpen && (
        <section className="template-panel fixed right-[86px] top-[74px] z-40 w-[380px] rounded-xl border border-zinc-200/80 bg-white/94 p-4 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/94">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-amber-50">Prompt 模板</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">新上传图片会按这个模板反推出 prompt，并生成关键词。</p>
            </div>
            <button className="image-float-button grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-800 dark:text-zinc-100" onClick={() => setTemplateOpen(false)} aria-label="关闭模板">
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            className="template-textarea h-[360px] w-full resize-none rounded-lg border border-zinc-200 bg-white/90 p-3 text-xs leading-5 text-zinc-700 outline-none focus:border-amber-400 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200"
            value={promptTemplate}
            onChange={(event) => setPromptTemplate(event.target.value)}
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <button className="rounded-md px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => setPromptTemplate(readDefaultPromptTemplate())}>
              恢复默认
            </button>
            <button
              className="rounded-md bg-zinc-950 px-3 py-2 text-xs font-medium text-white shadow-sm dark:bg-amber-200 dark:text-zinc-950"
              onClick={() => {
                localStorage.setItem("journal-default-prompt-template", promptTemplate);
                setTemplateOpen(false);
                notify("已设为默认模板");
              }}
            >
              保存模板
            </button>
          </div>
        </section>
      )}

      {searchMode && searchQuery.trim() && (
        <SearchResultsPage
          query={searchQuery}
          results={searchResults}
          suggestions={searchSuggestions}
          loading={searchLoading}
          onSuggestion={(keyword) => {
            setSearchQuery(keyword);
            setSearchMode(true);
          }}
          onSelect={jumpToSearchResult}
          onClose={closeSearchPage}
        />
      )}
        <section
          ref={viewportRef}
          className={cn("canvas-viewport h-screen overflow-auto px-0 pb-8 pt-[76px]", searchMode && searchQuery.trim() && "hidden")}
          onDoubleClick={(event) => {
            if (uiStyle !== "gallery") return;
            if ((event.target as HTMLElement).closest("[data-canvas-pan-ignore='true'], button, input, textarea, select, a")) return;
            floatingInputRef.current?.click();
          }}
          onDragOver={(event) => {
            if (uiStyle === "gallery") event.preventDefault();
          }}
          onDrop={(event) => {
            if (uiStyle !== "gallery") return;
            event.preventDefault();
            const files = [...event.dataTransfer.files];
            if (files.length) void addFilesToToday(files);
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerEnd}
          onPointerCancel={handleCanvasPointerEnd}
        >
          <input
            ref={floatingInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = [...(event.target.files || [])];
              if (files.length) void addFilesToToday(files);
              event.currentTarget.value = "";
            }}
          />
          <div
            className="canvas-space"
            style={{
              width: `${boardWidth * canvasScale + 2400}px`,
              minHeight: `${boardHeight * canvasScale + 1600}px`
            }}
          >
            <div
              className="weekly-board grid origin-top-left grid-cols-7 overflow-visible bg-white/78 dark:bg-zinc-950/52"
              style={{
                width: `${boardWidth}px`,
                minHeight: `${boardHeight}px`,
                gridTemplateColumns: `repeat(7, ${columnWidth}px)`,
                transform: `scale(${canvasScale})`
              }}
            >
              {weekDates.map((date, dayIndex) => (
                <DayColumn
                  key={formatKey(date)}
                  date={date}
                  dayIndex={dayIndex}
                  images={imagesForDay(dayIndex)}
                  onFiles={addFiles}
                  onDeleteCard={deleteCard}
                  onDeleteKeyword={deleteKeyword}
                  onOpenPreview={setActiveCard}
                  onMoveCard={moveCard}
                  onCopy={notify}
                  onImageLoadError={() => void loadWeek(weekKey).then((rows) => applySyncedRows(rows, weekKey))}
                  cardPositions={uiStyle === "gallery" ? galleryCardPositions : cardPositions}
                  canvasScale={canvasScale}
                  pending={pending}
                  uiStyle={uiStyle}
                  galleryDepth={galleryDepth}
                  depthOffset={images.filter((image) => image.dayIndex < dayIndex).length}
                  totalCards={images.length}
                />
              ))}
            </div>
          </div>
          <div className="pointer-events-none fixed bottom-5 left-5 z-40 rounded-md border border-zinc-200/80 bg-white/88 px-3 py-2 text-[11px] font-medium text-zinc-500 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/88 dark:text-zinc-400">
            {uiStyle === "gallery" ? `${activeUiStyle.label} · DEPTH ${Math.round(galleryDepth)}` : `${activeUiStyle.label} · ${Math.round(canvasScale * 100)}%`}
          </div>
        </section>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="toast-message fixed left-1/2 top-[86px] z-[70] -translate-x-1/2 rounded-lg border border-zinc-200/80 bg-white/94 px-4 py-3 text-sm font-medium text-zinc-700 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/94 dark:text-amber-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <ImagePreviewDialog
        card={activeCard}
        onClose={() => setActiveCard(null)}
        onDeleteKeyword={deleteKeyword}
        onCopy={notify}
        onImageLoadError={() => void loadWeek(weekKey).then((rows) => applySyncedRows(rows, weekKey))}
      />
    </main>
  );
}

function DayColumn({
  date,
  dayIndex,
  images,
  onFiles,
  onDeleteCard,
  onDeleteKeyword,
  onOpenPreview,
  onMoveCard,
  onCopy,
  onImageLoadError,
  cardPositions,
  canvasScale,
  pending,
  uiStyle,
  galleryDepth,
  depthOffset,
  totalCards
}: {
  date: Date;
  dayIndex: number;
  images: InspirationImage[];
  onFiles: (files: File[], dayIndex: number) => void;
  onDeleteCard: (card: InspirationImage) => void;
  onDeleteKeyword: (card: InspirationImage, keyword: string) => void;
  onOpenPreview: (card: InspirationImage) => void;
  onMoveCard: (id: string, position: CardPosition) => void;
  onCopy: (message: string) => void;
  onImageLoadError: () => void;
  cardPositions: Record<string, CardPosition>;
  canvasScale: number;
  pending: Record<string, boolean>;
  uiStyle: UiStyle;
  galleryDepth: number;
  depthOffset: number;
  totalCards: number;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  return (
    <article
      data-day-index={dayIndex}
      className={cn("group/day day-column relative px-7 pb-10 pt-10", dragging && "bg-amber-50/20 dark:bg-amber-300/5")}
      style={{ minHeight: `${boardHeight}px` }}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("[data-canvas-pan-ignore='true'], button, input, textarea, select, a")) return;
        inputRef.current?.click();
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles([...event.dataTransfer.files], dayIndex);
      }}
    >
      <div className="day-heading mb-8 text-center">
        <div className="font-journal text-[31px] leading-none text-zinc-700 dark:text-amber-50">{date.getDate()}</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500 dark:text-zinc-500">{dayShort[dayIndex]}</div>
        <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-600">{days[dayIndex]}</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => onFiles([...(event.target.files || [])], dayIndex)}
      />

      <div
        className={cn(
          "day-card-grid grid content-start items-start",
          uiStyle === "journal" && "grid-cols-[repeat(auto-fill,180px)] gap-x-9 gap-y-12",
          uiStyle === "gallery" && "grid-cols-[repeat(auto-fill,170px)] gap-x-2 gap-y-8",
          uiStyle === "archive" && "grid-cols-[repeat(auto-fill,210px)] gap-x-8 gap-y-12"
        )}
      >
        {images.map((image, index) => (
          <PolaroidCard
            key={image.clientId || image.id}
            card={image}
            index={index}
            loading={Boolean(pending[image.id])}
            onDeleteCard={onDeleteCard}
            onDeleteKeyword={onDeleteKeyword}
            onOpenPreview={onOpenPreview}
            onMoveCard={onMoveCard}
            onCopy={onCopy}
            onImageLoadError={onImageLoadError}
            position={cardPositions[image.id]}
            canvasScale={canvasScale}
            uiStyle={uiStyle}
            galleryDepth={galleryDepth}
            depthIndex={depthOffset + index}
            totalCards={totalCards}
          />
        ))}
        {!images.length && (
          <div className="mt-12 w-full rounded-sm border border-dashed border-zinc-200/70 bg-white/24 px-3 py-5 text-center text-[11px] leading-5 text-zinc-400 opacity-0 transition group-hover/day:opacity-100 dark:border-zinc-800 dark:bg-zinc-900/10 dark:text-zinc-600">
            <Wand2 className="mx-auto mb-2 h-3.5 w-3.5" />
            粘贴截图到这一天
          </div>
        )}
      </div>
    </article>
  );
}

function SearchResultsPage({
  query,
  results,
  suggestions,
  loading,
  onSuggestion,
  onSelect,
  onClose
}: {
  query: string;
  results: InspirationImage[];
  suggestions: SearchSuggestion[];
  loading: boolean;
  onSuggestion: (keyword: string) => void;
  onSelect: (card: InspirationImage) => void;
  onClose: () => void;
}) {
  return (
    <section className="search-results-page relative z-10 h-screen overflow-auto bg-white px-5 pb-16 pt-[96px] font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-[1680px]">
        <div className="search-results-header mb-5">
          <button
            className="search-back-button mb-5 grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            onClick={onClose}
            aria-label="返回周历"
            title="返回周历"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <p className="text-xs font-medium uppercase tracking-[.18em] text-zinc-400">Search Results</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">搜索 “{query.trim()}”</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{loading ? "正在匹配关键词和 prompt" : `${results.length} 张图片匹配`}</p>
          </div>
        </div>

      {suggestions.length > 0 && (
        <div className="search-suggestions-panel mb-5 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/45">
          <div className="search-suggestions-label mb-3 text-xs text-zinc-400">关键词联想</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.keyword}
                className="search-suggestion-button rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                onClick={() => onSuggestion(suggestion.keyword)}
              >
                {suggestion.keyword}
                {suggestion.count > 1 && <span className="ml-1 text-zinc-400">×{suggestion.count}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        {loading && <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-14 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/45">搜索中...</div>}
        {!loading && !results.length && <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-14 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/45">没有匹配图片</div>}
        {!loading &&
          results.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {results.map((card) => (
            <button
              key={card.id}
              className="search-result-card group overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              onClick={() => onSelect(card)}
            >
              <div className="search-result-image-shell aspect-[4/5] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {getCardImageSrc(card) ? <img className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" src={getCardImageSrc(card)} alt={card.title} loading="lazy" /> : null}
              </div>
              <div className="p-3">
                <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
                  <span>{card.weekStart}</span>
                  <span>{days[card.dayIndex]}</span>
                </div>
                <div className="truncate text-base font-semibold text-zinc-800 dark:text-zinc-100">{card.keywords[0] || card.title}</div>
                <div className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {[...(card.keywords || []), card.reversePrompt].filter(Boolean).join(" / ")}
                </div>
              </div>
            </button>
              ))}
            </div>
          )}
      </div>
      </div>
    </section>
  );
}

function PolaroidCard({
  card,
  index,
  loading,
  onDeleteCard,
  onDeleteKeyword,
  onOpenPreview,
  onMoveCard,
  onCopy,
  onImageLoadError,
  position,
  canvasScale,
  uiStyle,
  galleryDepth,
  depthIndex,
  totalCards
}: {
  card: InspirationImage;
  index: number;
  loading: boolean;
  onDeleteCard: (card: InspirationImage) => void;
  onDeleteKeyword: (card: InspirationImage, keyword: string) => void;
  onOpenPreview: (card: InspirationImage) => void;
  onMoveCard: (id: string, position: CardPosition) => void;
  onCopy: (message: string) => void;
  onImageLoadError: () => void;
  position?: CardPosition;
  canvasScale: number;
  uiStyle: UiStyle;
  galleryDepth: number;
  depthIndex: number;
  totalCards: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [displayImageSrc, setDisplayImageSrc] = React.useState("");
  const cardRef = React.useRef<HTMLElement | null>(null);
  const displayImageSrcRef = React.useRef("");
  const onImageLoadErrorRef = React.useRef(onImageLoadError);
  const closeTimerRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const latestPositionRef = React.useRef<CardPosition>({ x: 0, y: 0 });
  const suppressClickRef = React.useRef(false);
  const [draftPosition, setDraftPosition] = React.useState<CardPosition | null>(null);
  const first = card.keywords[0] || "未命名术语";
  const extra = Math.max(0, card.keywords.length - 1);
  const layout = cardLayout(index, uiStyle);
  const imageSrc = getCardImageSrc(card);
  const imageAspectRatio = card.imageAspectRatio && Number.isFinite(card.imageAspectRatio) ? card.imageAspectRatio : 1 / 1.28;
  const activePosition = draftPosition || position || { x: 0, y: 0 };
  const gallerySpacing = 240;
  const galleryRank = galleryDepthRank(depthIndex, totalCards);
  const galleryPhase = (galleryRank + 1) * gallerySpacing - galleryDepth;
  const galleryNearness = Math.exp(-Math.max(0, galleryPhase) / 840);
  const galleryScale = (0.38 + galleryNearness * 1.78) * 1.2;
  const galleryFinalLayer = galleryRank >= Math.max(0, totalCards - 6);
  const galleryOpacity = galleryPhase < 0
    ? clamp(1 + galleryPhase / 180, 0, 1)
    : galleryFinalLayer
      ? 0.28 + galleryNearness * 0.72
      : 1;
  latestPositionRef.current = activePosition;
  React.useEffect(() => {
    displayImageSrcRef.current = displayImageSrc;
  }, [displayImageSrc]);
  React.useEffect(() => {
    onImageLoadErrorRef.current = onImageLoadError;
  }, [onImageLoadError]);
  React.useEffect(() => {
    if (!imageSrc) {
      setDisplayImageSrc("");
      setImageLoaded(true);
      return;
    }
    if (!displayImageSrcRef.current) {
      setDisplayImageSrc(imageSrc);
      setImageLoaded(false);
      return;
    }
    if (imageSrc === displayImageSrcRef.current) return;

    let cancelled = false;
    const nextImage = new Image();
    nextImage.onload = () => {
      if (cancelled) return;
      setDisplayImageSrc(imageSrc);
      setImageLoaded(true);
    };
    nextImage.onerror = () => {
      if (cancelled) return;
      onImageLoadErrorRef.current();
    };
    nextImage.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);
  const showPanel = React.useCallback(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    setOpen(true);
  }, []);
  const scheduleClosePanel = React.useCallback(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 320);
  }, []);
  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("[data-drag-ignore='true']")) return;
    if (event.button !== 0 || event.pointerType === "touch") return;
    event.stopPropagation();
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: activePosition.x,
      originY: activePosition.y,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const dx = (event.clientX - drag.startX) / canvasScale;
    const dy = (event.clientY - drag.startY) / canvasScale;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const element = cardRef.current;
    const baseLeft = element?.offsetLeft || 0;
    const baseTop = element?.offsetTop || 0;
    const contentWidth = columnWidth - 56;
    const contentHeight = boardHeight - 80;
    const nextPosition = {
      x: Math.round(clamp(drag.originX + dx, -baseLeft, contentWidth - baseLeft - layout.width)),
      y: Math.round(clamp(drag.originY + dy, -baseTop + 8, contentHeight - baseTop - (element?.offsetHeight || 0)))
    };
    latestPositionRef.current = nextPosition;
    setDraftPosition(nextPosition);
  };
  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    const nextPosition = latestPositionRef.current;
    setDraftPosition(null);
    if (drag.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 160);
      onMoveCard(card.id, nextPosition);
    }
  };

  return (
    <article
      ref={cardRef}
      data-canvas-pan-ignore="true"
      className={cn(
        "polaroid-card group relative z-10 shrink-0 touch-pan-x touch-pan-y select-none bg-white text-zinc-950 shadow-polaroid ring-1 ring-black/[0.03] transition hover:z-30 dark:bg-zinc-100",
        uiStyle === "journal" && "rounded-[2px] p-[8px] pb-4",
        uiStyle === "gallery" && "rounded-lg p-2.5 pb-3",
        uiStyle === "archive" && "rounded-none p-0"
      )}
      style={{
        width: layout.width,
        rotate: `${uiStyle === "gallery" ? card.decoration.rotate * 0.18 : uiStyle === "archive" ? 0 : card.decoration.rotate}deg`,
        translate: `${activePosition.x}px ${activePosition.y}px`,
        ...(uiStyle === "gallery"
          ? ({
              "--gallery-scale": galleryScale,
              opacity: galleryOpacity,
              zIndex: Math.round(galleryNearness * 40) + 1
            } as React.CSSProperties)
          : {})
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      {uiStyle !== "gallery" && uiStyle !== "archive" && <DecorationIcon decoration={card.decoration} />}
      <button
        className="image-float-button absolute -right-3 -top-3 z-20 grid h-8 w-8 place-items-center rounded-full text-zinc-700 opacity-0 transition group-hover:opacity-100 dark:text-zinc-100"
        data-drag-ignore="true"
        onClick={() => onDeleteCard(card)}
        aria-label="删除图片"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <div className="artwork-frame relative">
        <button
          className="block w-full cursor-grab active:cursor-grabbing"
          draggable={false}
          onClick={() => {
            if (suppressClickRef.current) return;
            onOpenPreview(card);
          }}
          aria-label="拖拽移动图片，点击放大查看"
        >
          <span
            className="relative block w-full overflow-hidden rounded-[1px] bg-zinc-100 dark:bg-zinc-200"
            style={{ aspectRatio: uiStyle === "archive" ? "4 / 5" : imageAspectRatio }}
          >
            {!imageLoaded && (
              <span className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,rgba(244,244,245,.92),rgba(255,255,255,.98),rgba(244,244,245,.92))] dark:bg-[linear-gradient(110deg,rgba(228,228,231,.9),rgba(255,255,255,.98),rgba(228,228,231,.9))]" />
            )}
            {displayImageSrc ? (
              <img
                className={cn("block h-auto w-full rounded-[1px] transition-opacity duration-150", imageLoaded ? "opacity-100" : "opacity-0")}
                style={{ height: "100%", objectFit: uiStyle === "archive" ? "cover" : "contain" }}
                draggable={false}
                src={displayImageSrc}
                alt={card.title}
                loading="eager"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageLoaded(true);
                  onImageLoadError();
                }}
              />
            ) : null}
          </span>
        </button>
        <button
          className="image-float-button absolute left-1/2 top-1/2 z-20 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-zinc-700 opacity-0 transition group-hover:opacity-100 dark:text-zinc-100"
          data-drag-ignore="true"
          onClick={() => onOpenPreview(card)}
          aria-label="放大查看"
          title="放大查看"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <div className="relative mt-2">
        <div className={cn("relative flex items-start gap-2", uiStyle === "archive" && "block")} onMouseEnter={showPanel} onMouseLeave={scheduleClosePanel}>
          {uiStyle === "archive" ? (
            <button
              className="archive-card-details block w-full text-left"
              data-drag-ignore="true"
              onClick={() => copyText(card.keywords.join(", "), onCopy, "关键词已复制")}
              title="复制关键词"
            >
              <small>Collection owner: AI Journal</small>
              <strong>{first}</strong>
              <span>{card.keywords.slice(1, 3).join(" / ") || "Unclassified visual material"}</span>
              <em>{archiveYearRange(card)}</em>
            </button>
          ) : (
            <button
              className="content-copy-button inline-flex max-w-full items-center gap-1 rounded-md border border-zinc-200/80 bg-white/94 px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-[0_8px_18px_rgba(0,0,0,.13)] backdrop-blur transition hover:-translate-y-0.5 dark:border-zinc-700 dark:bg-zinc-950/90 dark:text-zinc-100"
              data-drag-ignore="true"
              onClick={() => copyText(card.keywords.join(", "), onCopy, "关键词已复制")}
            >
              <Copy className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{extra ? `${first} +${extra}` : first}</span>
            </button>
          )}
          {loading && <Sparkles className="h-4 w-4 animate-pulse text-amber-600" />}
          {open && (
            <AnalysisPanel
              card={card}
              onDeleteKeyword={onDeleteKeyword}
              onCopy={onCopy}
              className={cn("absolute left-0 z-40 max-h-[520px] w-[min(420px,calc(100vw-48px))]", uiStyle === "archive" ? "top-[calc(100%+10px)]" : "top-10")}
              compact
            />
          )}
        </div>
      </div>
      {uiStyle === "gallery" && (
        <div className="gallery-work-meta">
          <strong>{first}</strong>
          <span>{card.keywords.slice(1, 4).join(" / ") || "AI Journal visual study"}</span>
          <small>{new Date(card.createdAt || card.updatedAt || Date.now()).getFullYear()}</small>
        </div>
      )}
    </article>
  );
}

function AnalysisPanel({
  card,
  onDeleteKeyword,
  onCopy,
  className,
  compact = false
}: {
  card: InspirationImage;
  onDeleteKeyword: (card: InspirationImage, keyword: string) => void;
  onCopy: (message: string) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("analysis-panel overflow-hidden rounded-lg border border-zinc-200 bg-white/[0.885] backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-950/[0.92]", className)}>
      <div className={cn("overflow-y-auto p-4", compact ? "max-h-[520px]" : "max-h-[78vh]")}>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          <Wand2 className="h-3.5 w-3.5" />
          Terminology
        </div>
        {card.analysisNote && (
          <div className="mb-3 rounded-md bg-zinc-100 px-2 py-1 text-[11px] leading-4 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            {card.analysisNote}
          </div>
        )}
        <div className="mb-5 flex flex-wrap gap-2">
          {card.keywords.map((keyword) => (
            <Badge key={keyword} className="group/tag gap-1 text-sm">
              <button data-drag-ignore="true" title="复制关键词" onClick={() => copyText(keyword, onCopy, "关键词已复制")}>{keyword}</button>
              <button
                className="hidden rounded-sm bg-amber-900/10 px-1 group-hover/tag:inline-flex"
                data-drag-ignore="true"
                onClick={() => onDeleteKeyword(card, keyword)}
                aria-label={`删除 ${keyword}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <button className="text-left text-sm leading-7 text-zinc-600 dark:text-zinc-300" data-drag-ignore="true" title="复制 Prompt" onClick={() => copyText(card.reversePrompt, onCopy, "Prompt 已复制")}>
          <span className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            <Copy className="h-3 w-3" />
            Reverse Prompt
          </span>
          {card.reversePrompt}
        </button>
      </div>
    </div>
  );
}

function ImagePreviewDialog({
  card,
  onClose,
  onDeleteKeyword,
  onCopy,
  onImageLoadError
}: {
  card: InspirationImage | null;
  onClose: () => void;
  onDeleteKeyword: (card: InspirationImage, keyword: string) => void;
  onCopy: (message: string) => void;
  onImageLoadError: () => void;
}) {
  const [imageMenu, setImageMenu] = React.useState<{ x: number; y: number } | null>(null);
  React.useEffect(() => {
    if (!card) setImageMenu(null);
  }, [card?.id]);

  if (!card) return null;
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/58 p-6 backdrop-blur-sm" onClick={onClose} onContextMenu={() => setImageMenu(null)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="mx-auto grid h-full max-w-[1320px] grid-cols-[minmax(0,1fr)_420px] overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => {
          event.stopPropagation();
          setImageMenu(null);
        }}
      >
        <div className="relative grid min-h-0 place-items-center bg-zinc-100 p-6 dark:bg-zinc-900">
          <button className="image-float-button absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-zinc-800 dark:text-zinc-100" onClick={onClose} aria-label="关闭预览">
            <X className="h-4 w-4" />
          </button>
          <img
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            src={getCardImageSrc(card)}
            alt={card.title}
            onError={onImageLoadError}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setImageMenu({ x: event.clientX, y: event.clientY });
            }}
          />
          {imageMenu && (
            <div
              className="fixed z-[80] min-w-[148px] overflow-hidden rounded-xl border border-white/70 bg-white/86 p-1 text-sm font-medium text-zinc-800 shadow-[0_18px_48px_rgba(0,0,0,.18)] backdrop-blur-xl dark:border-zinc-700/70 dark:bg-zinc-950/86 dark:text-zinc-100"
              style={{ left: imageMenu.x, top: imageMenu.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
                onClick={() => {
                  setImageMenu(null);
                  void copyImageToClipboard(getCardImageSrc(card), onCopy);
                }}
              >
                复制图片
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <AnalysisPanel card={card} onDeleteKeyword={onDeleteKeyword} onCopy={onCopy} className="h-full rounded-none border-0 shadow-none" />
        </div>
      </motion.div>
    </div>
  );
}

function DecorationIcon({ decoration }: { decoration: Decoration }) {
  if (decoration.clip === "pin") {
    return <Pin className="pointer-events-none absolute -top-4 left-1/2 z-30 h-7 w-7 -translate-x-1/2 fill-current text-[color:var(--pin)]" style={{ "--pin": decoration.pin } as React.CSSProperties} />;
  }
  if (decoration.clip === "clip") {
    return <Paperclip className="pointer-events-none absolute -top-4 right-5 z-30 h-8 w-8 rotate-12 text-amber-700" />;
  }
  return (
    <span
      className="pointer-events-none absolute -top-3 left-1/2 z-30 h-6 w-20 -translate-x-1/2 rounded-[2px] opacity-80 shadow-sm"
      style={{ background: decoration.tape, rotate: `${decoration.rotate * 1.4}deg` }}
    />
  );
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function addDays(date: Date, count: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function formatKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function formatRange(start: Date, end: Date) {
  const startMonth = start.toLocaleString("en-US", { month: "long" });
  const endMonth = end.toLocaleString("en-US", { month: "long" });
  if (startMonth === endMonth) return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
}

function weekNumber(date: Date) {
  const first = startOfWeek(new Date(date.getFullYear(), 0, 1));
  return Math.floor((date.getTime() - first.getTime()) / 604800000) + 1;
}

function findTodayIndex(weekDates: Date[]) {
  const today = formatKey(new Date());
  const index = weekDates.findIndex((date) => formatKey(date) === today);
  return index >= 0 ? index : 0;
}

function randomDecoration(): Decoration {
  return {
    tape: tapes[Math.floor(Math.random() * tapes.length)],
    pin: pins[Math.floor(Math.random() * pins.length)],
    rotate: Math.round((Math.random() * 5 - 2.5) * 10) / 10,
    clip: clips[Math.floor(Math.random() * clips.length)]
  };
}

function cardLayout(index: number, uiStyle: UiStyle = "journal") {
  if (uiStyle === "gallery") {
    const layouts = [
      { width: 132 },
      { width: 168 },
      { width: 118 },
      { width: 214 },
      { width: 146 },
      { width: 188 },
      { width: 104 },
      { width: 238 }
    ];
    return layouts[index % layouts.length];
  }

  if (uiStyle === "archive") {
    const layouts = [
      { width: 178 },
      { width: 192 },
      { width: 184 },
      { width: 204 },
      { width: 176 },
      { width: 196 }
    ];
    return layouts[index % layouts.length];
  }

  const layouts = [
    { width: 124 },
    { width: 148 },
    { width: 136 },
    { width: 158 },
    { width: 128 },
    { width: 146 },
    { width: 132 }
  ];
  return layouts[index % layouts.length];
}

function galleryDepthRank(index: number, total: number) {
  if (total <= 1) return index;
  const preferredSteps = [7, 11, 5, 13, total - 1];
  const step = preferredSteps.find((value) => value > 0 && greatestCommonDivisor(value, total) === 1) || 1;
  return (index * step) % total;
}

function greatestCommonDivisor(a: number, b: number) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(first: React.Touch, second: React.Touch) {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function resolveLegacyCard(card: InspirationImage): InspirationImage {
  if (!isLegacyFallback(card.keywords, card.reversePrompt)) return card;
  return {
    ...card,
    keywords: ["AI 未连接"],
    reversePrompt: "这张卡片之前使用了无关的本地兜底术语。请配置 GPT/Gemini API Key 后重新上传，才能得到真实图片分析。",
    analysisNote: card.analysisNote || "旧的无关兜底结果已隐藏，AI 恢复后会自动重试"
  };
}

function needsAnalysisRetry(card: InspirationImage) {
  return card.keywords.includes("AI 未连接") || card.analysisNote?.includes("旧的无关兜底结果");
}

function isLegacyFallback(keywords: string[], reversePrompt: string) {
  const legacy = ["暖琥珀色调", "拍立得留白", "纸张肌理", "低饱和拼贴", "手账式网格", "柔和阴影"];
  return (
    legacy.every((keyword) => keywords.includes(keyword)) ||
    reversePrompt.includes("warm editorial scrapbook moodboard") ||
    reversePrompt.includes("Build a visual reference with clear design terminology")
  );
}

function isAnalyzingCard(card: InspirationImage) {
  return card.keywords.length === 1 && card.keywords[0] === "分析中";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function imageFilesFromClipboard(clipboardData: DataTransfer | null) {
  if (!clipboardData) return [];
  const files = [...clipboardData.items]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean) as File[];
  return files.sort((left, right) => right.size - left.size).slice(0, 1);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function imageAspectRatioFromFile(file: File) {
  try {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file);
      const ratio = bitmap.width / bitmap.height;
      bitmap.close();
      if (Number.isFinite(ratio) && ratio > 0) return ratio;
    }
  } catch {
    // Fall through to FileReader-based detection.
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    const image = await loadImageElement(dataUrl);
    const ratio = image.naturalWidth / image.naturalHeight;
    return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;
  } catch {
    return undefined;
  }
}

async function fingerprintDataUrl(dataUrl: string) {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(dataUrl));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${dataUrl.length}:${dataUrl.slice(0, 256)}:${dataUrl.slice(-256)}`;
  }
}

async function imageDataUrlToAnalysisPreview(imageDataUrl: string) {
  try {
    const image = await loadImageElement(imageDataUrl);
    const maxSide = 900;
    const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    if (ratio >= 1 && imageDataUrl.length < 900_000) return imageDataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) return imageDataUrl;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } catch {
    return imageDataUrl;
  }
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function copyText(text: string, notify?: (message: string) => void, message = "已复制") {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopyText(text);
    }
    notify?.(message);
  } catch {
    try {
      fallbackCopyText(text);
      notify?.(message);
    } catch {
      notify?.("复制失败，请手动复制");
    }
  }
}

async function copyImageToClipboard(imageSrc: string, notify?: (message: string) => void) {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("image clipboard unavailable");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": imageSrcToPngBlob(imageSrc) })]);
    notify?.("图片已复制");
  } catch {
    notify?.("图片复制失败，请重试");
  }
}

async function imageSrcToPngBlob(imageSrc: string) {
  if (!imageSrc.startsWith("data:")) {
    const response = await fetch(imageSrc);
    if (!response.ok) throw new Error("image download failed");
    const blob = await response.blob();
    if (blob.type === "image/png") return blob;
    imageSrc = URL.createObjectURL(blob);
  }

  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(image, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("image conversion failed"))), "image/png");
  });
}

function getCardImageSrc(card: InspirationImage) {
  return card.imageUrl || card.imageDataUrl || "";
}

let supabaseClient: SupabaseClient | null = null;
let authConfigPromise: Promise<AuthConfig> | null = null;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const config = await getAuthConfig();
  if (!config.enabled || !config.supabaseUrl || !config.supabaseAnonKey) return {};

  supabaseClient ||= createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "journal-supabase-auth"
    }
  });

  const currentSession = await supabaseClient.auth.getSession();
  let session = currentSession.data.session;
  if (!session) {
    const { data, error } = await supabaseClient.auth.signInAnonymously();
    if (error) throw new Error(`匿名登录失败：${error.message}`);
    session = data.session;
  }

  const accessToken = session?.access_token;
  if (!accessToken) throw new Error("匿名登录没有返回有效 token");
  localStorage.setItem(authTokenStorageKey, accessToken);
  return { Authorization: `Bearer ${accessToken}` };
}

function getAuthConfig(): Promise<AuthConfig> {
  authConfigPromise ||= fetch("/api/auth/config").then((response) => response.json()).catch(() => ({ enabled: false }));
  return authConfigPromise;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

function readPositions(storageKey = positionStorageKey): Record<string, CardPosition> {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}") as Record<string, CardPosition>;
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, CardPosition>, storageKey = positionStorageKey) {
  localStorage.setItem(storageKey, JSON.stringify(positions));
}

function readLocal(weekKey: string): InspirationImage[] {
  try {
    const all = JSON.parse(localStorage.getItem(localStorageKey) || "{}") as Record<string, InspirationImage[]>;
    return all[weekKey] || [];
  } catch {
    return [];
  }
}

function saveLocal(weekKey: string, rows: InspirationImage[]) {
  try {
    const all = JSON.parse(localStorage.getItem(localStorageKey) || "{}") as Record<string, InspirationImage[]>;
    all[weekKey] = rows;
    localStorage.setItem(localStorageKey, JSON.stringify(all));
  } catch {
    // Large image collections can exceed browser storage quota; the API remains the source of truth.
  }
}

function persistLocal(weekKey: string, rows: InspirationImage[]) {
  saveLocal(weekKey, rows);
  return rows;
}

function readDeletedCards() {
  try {
    return new Set(JSON.parse(localStorage.getItem(deletedCardsStorageKey) || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function currentDeletedCards(ref: React.MutableRefObject<Set<string>>) {
  return new Set([...readDeletedCards(), ...ref.current]);
}

function rememberDeletedCard(id: string) {
  const deleted = readDeletedCards();
  deleted.add(id);
  try {
    localStorage.setItem(deletedCardsStorageKey, JSON.stringify([...deleted].slice(-1000)));
  } catch {
    // If storage is full, keep the in-memory optimistic deletion; backend remains authoritative.
  }
}

function readDefaultPromptTemplate() {
  const savedDefault = localStorage.getItem("journal-default-prompt-template");
  if (savedDefault) return savedDefault;

  const current = localStorage.getItem("journal-prompt-template");
  if (current) {
    localStorage.setItem("journal-default-prompt-template", current);
    return current;
  }

  return defaultPromptTemplate;
}

function mergeCards(localRows: InspirationImage[], serverRows: InspirationImage[]) {
  const rows = new Map<string, InspirationImage>();
  const order: string[] = [];
  for (const row of localRows) rows.set(row.id, row);
  for (const row of localRows) order.push(row.id);
  for (const row of serverRows) {
    const local = rows.get(row.id);
    if (!local) order.push(row.id);
    rows.set(row.id, {
      ...local,
      ...row,
      clientId: local?.clientId,
      sourceFingerprint: local?.sourceFingerprint,
      imageAspectRatio: local?.imageAspectRatio
    });
  }
  return order.map((id) => rows.get(id)).filter(Boolean) as InspirationImage[];
}

function timestampOf(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function sortCardsForDay(cards: InspirationImage[]) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((left, right) => {
      const leftTime = timestampOf(left.card.createdAt || left.card.updatedAt);
      const rightTime = timestampOf(right.card.createdAt || right.card.updatedAt);
      if (leftTime !== rightTime) return leftTime - rightTime;
      return left.index - right.index;
    })
    .map(({ card }) => card);
}

function sameCards(left: InspirationImage[], right: InspirationImage[]) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const next = right[index];
    return (
      next &&
      item.id === next.id &&
      item.updatedAt === next.updatedAt &&
      item.keywords.join("\u0000") === next.keywords.join("\u0000") &&
      item.reversePrompt === next.reversePrompt
    );
  });
}

function readUiStyle(): UiStyle {
  const stored = localStorage.getItem(uiStyleStorageKey);
  if (stored === "journal" || stored === "gallery" || stored === "archive") return stored;
  if (stored === "darkroom" || localStorage.getItem("journal-theme") === "dark") return "archive";
  return "journal";
}

function archiveYearRange(card: InspirationImage) {
  const timestamp = timestampOf(card.createdAt || card.updatedAt);
  const year = Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).getFullYear() : new Date().getFullYear();
  return `${year}-${String(year + 1).slice(2)}`;
}

function MigrationExport() {
  const [status, setStatus] = React.useState("");
  const payload = React.useMemo(
    () =>
      JSON.stringify({
        [localStorageKey]: localStorage.getItem(localStorageKey),
        [positionStorageKey]: localStorage.getItem(positionStorageKey),
        [galleryPositionStorageKey]: localStorage.getItem(galleryPositionStorageKey),
        [uiStyleStorageKey]: localStorage.getItem(uiStyleStorageKey),
        "journal-theme": localStorage.getItem("journal-theme"),
        "journal-prompt-template": localStorage.getItem("journal-prompt-template")
      }),
    []
  );
  const hasData = payload.includes(localStorageKey) && payload.length > 80;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] p-6 text-zinc-800">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">迁移旧手帐数据</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-500">点击复制后，打开新地址，在画布空白处直接粘贴即可恢复图片和拖拽位置。</p>
        <button
          className="mt-5 rounded-lg bg-zinc-950 px-4 py-3 text-sm font-semibold text-white"
          onClick={() => copyText(payload, setStatus, "迁移数据已复制")}
        >
          复制迁移数据
        </button>
        <textarea
          className="mt-4 h-24 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] leading-5 text-zinc-500"
          readOnly
          value={payload}
          onFocus={(event) => event.currentTarget.select()}
        />
        <p className="mt-3 text-sm text-zinc-500">{status || (hasData ? "已找到旧手帐数据" : "没有检测到旧手帐数据")}</p>
      </section>
    </main>
  );
}

function tryImportMigrationData(text: string, notify: (message: string) => void) {
  const trimmed = text.trim();
  if (!trimmed) return false;

  try {
    const value = JSON.parse(trimmed.startsWith("%7B") ? decodeURIComponent(trimmed) : trimmed) as Record<string, unknown>;
    if (!value || typeof value !== "object" || !(localStorageKey in value)) return false;

    const journal = value[localStorageKey];
    const positions = value[positionStorageKey];
    const galleryPositions = value[galleryPositionStorageKey];
    const uiStyle = value[uiStyleStorageKey];
    const theme = value["journal-theme"];
    const template = value["journal-prompt-template"];

    if (typeof journal === "string") localStorage.setItem(localStorageKey, journal);
    if (typeof positions === "string") localStorage.setItem(positionStorageKey, positions);
    if (typeof galleryPositions === "string") localStorage.setItem(galleryPositionStorageKey, galleryPositions);
    if (typeof uiStyle === "string") localStorage.setItem(uiStyleStorageKey, uiStyle);
    if (typeof theme === "string") localStorage.setItem("journal-theme", theme);
    if (typeof template === "string") localStorage.setItem("journal-prompt-template", template);

    notify("旧手帐数据已导入");
    return true;
  } catch {
    return false;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
