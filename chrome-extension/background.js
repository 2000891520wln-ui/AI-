const MENU_ROOT = "ai-journal-root";
const MENU_GENERATE_PROMPT = "ai-journal-generate-prompt";
const MENU_SAVE = "ai-journal-save";

const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:8792",
  appUrl: "http://localhost:5174",
  promptTemplate: `请你作为一名资深视觉设计师和 AI 视觉风格分析师，基于用户上传的参考图反推出一段可复用的 AI 生图 prompt。

请重点分析：
1. 视觉类型与设计语言
2. 构图系统与视觉重心
3. 核心元素、必要元素、禁止元素
4. 字体气质与图文关系
5. 色彩系统、饱和度、明度、对比度
6. 材质、肌理、颗粒、印刷或手绘特征
7. 信息密度与层级
8. 最容易翻车的 Anti-AI 规则

最终输出要能直接用于 AI 生图工具。`
};

const tapes = ["#f8d891", "#f0b8a4", "#d7c3ff", "#b8d8bd", "#f5eee2"];
const pins = ["#d6a316", "#b15b3d", "#6f8d63", "#7b61ff"];
const clips = ["tape", "pin", "clip", "washi"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ROOT,
      title: "AI 灵感手帐",
      contexts: ["image"]
    });
    chrome.contextMenus.create({
      id: MENU_GENERATE_PROMPT,
      parentId: MENU_ROOT,
      title: "生成 Prompt",
      contexts: ["image"]
    });
    chrome.contextMenus.create({
      id: MENU_SAVE,
      parentId: MENU_ROOT,
      title: "保存至手帐",
      contexts: ["image"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.srcUrl) return;
  if (info.menuItemId === MENU_GENERATE_PROMPT) {
    void generatePrompt(info.srcUrl, tab.id);
  }
  if (info.menuItemId === MENU_SAVE) {
    void saveToJournal(info.srcUrl, tab.id);
  }
});

async function generatePrompt(srcUrl, tabId) {
  try {
    await showPromptOverlayInTab(tabId, "正在读取图片并生成 Prompt...", "loading");
    const { settings, imageDataUrl } = await prepareImage(srcUrl);
    const promptImageDataUrl = await optimizePromptImage(imageDataUrl);
    const analysis = await analyzePrompt(settings, promptImageDataUrl, srcUrl);

    await showPromptOverlayInTab(tabId, analysis.reversePrompt || "", "ready");
  } catch (error) {
    await showPromptOverlayInTab(tabId, `生成失败：${errorMessage(error)}`, "error");
  }
}

async function saveToJournal(srcUrl, tabId) {
  try {
    await showToastInTab(tabId, "正在保存至手帐...");
    const { settings, imageDataUrl } = await prepareImage(srcUrl);
    const today = new Date();
    const weekStart = formatKey(startOfWeek(today));
    const dayIndex = findDayIndex(today);

    await postApi(settings, "/api/images", {
      weekStart,
      dayIndex,
      title: titleFromUrl(srcUrl),
      imageDataUrl,
      promptTemplate: settings.promptTemplate,
      asyncAnalysis: true,
      decoration: randomDecoration()
    });

    await pingJournalTabs(settings);
    await showToastInTab(tabId, "已保存至手帐");
  } catch (error) {
    await showToastInTab(tabId, `保存失败：${errorMessage(error)}`);
  }
}

async function prepareImage(srcUrl) {
  const settings = await getSettings();
  const imageDataUrl = await imageUrlToDataUrl(srcUrl);
  return { settings, imageDataUrl };
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    apiBaseUrl: String(stored.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl).replace(/\/+$/, ""),
    appUrl: String(stored.appUrl || DEFAULT_SETTINGS.appUrl).replace(/\/+$/, ""),
    promptTemplate: String(stored.promptTemplate || DEFAULT_SETTINGS.promptTemplate)
  };
}

async function imageUrlToDataUrl(srcUrl) {
  if (srcUrl.startsWith("data:image/")) return srcUrl;

  const response = await fetch(srcUrl, {
    credentials: "include",
    cache: "force-cache"
  });
  if (!response.ok) throw new Error(`图片读取失败：${response.status}`);

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("右键目标不是可读取的图片");
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob) {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return `data:${blob.type};base64,${btoa(binary)}`;
  });
}

async function optimizePromptImage(imageDataUrl) {
  try {
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const maxSide = 1280;
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (ratio >= 1 && blob.size < 900_000) return imageDataUrl;

    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * ratio)), Math.max(1, Math.round(bitmap.height * ratio)));
    const context = canvas.getContext("2d");
    if (!context) return imageDataUrl;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const optimized = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
    return blobToDataUrl(optimized);
  } catch {
    return imageDataUrl;
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `接口调用失败：${response.status}`);
  }
  return body;
}

async function postApi(settings, path, payload) {
  const bases = getApiBases(settings);
  const errors = [];

  for (const base of bases) {
    try {
      return await postJson(`${base}${path}`, payload);
    } catch (error) {
      errors.push(`${base}: ${errorMessage(error)}`);
    }
  }

  throw new Error(`所有接口都调用失败：${errors.join("；") || "没有可用地址"}`);
}

async function analyzePrompt(settings, imageDataUrl, srcUrl) {
  try {
    return await postApi(settings, "/api/analyze-image", {
      imageDataUrl,
      promptTemplate: settings.promptTemplate,
      fast: true
    });
  } catch (primaryError) {
    try {
      return await legacyAnalyzePrompt(settings, imageDataUrl, srcUrl);
    } catch (legacyError) {
      throw new Error(`${errorMessage(primaryError)}；旧接口兜底也失败：${errorMessage(legacyError)}`);
    }
  }
}

async function legacyAnalyzePrompt(settings, imageDataUrl, srcUrl) {
  const today = new Date();
  const payload = {
    weekStart: formatKey(startOfWeek(today)),
    dayIndex: findDayIndex(today),
    title: `prompt-${titleFromUrl(srcUrl)}`,
    imageDataUrl,
    promptTemplate: settings.promptTemplate,
    decoration: randomDecoration()
  };
  const errors = [];

  for (const base of getApiBases(settings)) {
    let row;
    try {
      row = await postJson(`${base}/api/images`, payload);
      if (!row?.reversePrompt) throw new Error("旧接口没有返回 Prompt");
      if (row.id) void deleteJson(`${base}/api/images/${row.id}`);
      return row;
    } catch (error) {
      if (row?.id) void deleteJson(`${base}/api/images/${row.id}`);
      errors.push(`${base}: ${errorMessage(error)}`);
    }
  }

  throw new Error(errors.join("；") || "没有可用旧接口");
}

function getApiBases(settings) {
  return unique([
    "http://localhost:8792",
    "http://127.0.0.1:8792",
    settings.apiBaseUrl,
    settings.appUrl,
    DEFAULT_SETTINGS.apiBaseUrl,
    "http://localhost:8787",
    "http://localhost:8791",
    "http://127.0.0.1:8787",
    "http://127.0.0.1:8791"
  ]);
}

function unique(items) {
  return [...new Set(items.filter(Boolean).map((item) => String(item).replace(/\/+$/, "")))];
}

async function deleteJson(url) {
  await fetch(url, { method: "DELETE" }).catch(() => undefined);
}

async function showPromptOverlayInTab(tabId, text, state = "ready") {
  if (state === "ready" && !text.trim()) throw new Error("模型没有返回可复制的 Prompt");
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (value, status) => {
      const rootId = "ai-journal-prompt-overlay-root";
      const toastId = "ai-journal-toast-root";
      document.getElementById(rootId)?.remove();
      const isReady = status === "ready";
      const isLoading = status === "loading";
      const isError = status === "error";

      const style = document.createElement("style");
      style.textContent = `
        #${rootId} {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          display: grid;
          place-items: center;
          background: rgba(18, 18, 20, .18);
          backdrop-filter: blur(2px);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #27231d;
        }
        #${rootId} .ai-journal-panel {
          width: min(720px, calc(100vw - 40px));
          max-height: min(680px, calc(100vh - 40px));
          display: grid;
          grid-template-rows: auto minmax(180px, 1fr) auto;
          gap: 14px;
          border: 1px solid rgba(32, 28, 24, .14);
          border-radius: 16px;
          background: rgba(255, 255, 255, .92);
          box-shadow: 0 24px 80px rgba(0, 0, 0, .18);
          backdrop-filter: blur(18px) saturate(1.1);
          padding: 18px;
        }
        #${rootId} .ai-journal-head,
        #${rootId} .ai-journal-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        #${rootId} h2 {
          margin: 0;
          font-size: 16px;
          line-height: 1.35;
          font-weight: 760;
        }
        #${rootId} .ai-journal-close,
        #${rootId} .ai-journal-copy {
          border: 1px solid rgba(32, 28, 24, .14);
          border-radius: 10px;
          background: rgba(255,255,255,.86);
          color: #27231d;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
        }
        #${rootId} .ai-journal-close {
          width: 34px;
          height: 34px;
          font-size: 22px;
          line-height: 1;
        }
        #${rootId} .ai-journal-copy {
          padding: 9px 14px;
          background: #24211d;
          color: white;
        }
        #${rootId} .ai-journal-prompt {
          margin: 0;
          overflow: auto;
          white-space: pre-wrap;
          border: 1px solid rgba(32, 28, 24, .12);
          border-radius: 12px;
          background: rgba(255,255,255,.76);
          padding: 14px;
          font-size: 14px;
          line-height: 1.72;
          color: #4b4650;
        }
        #${rootId} .ai-journal-prompt.is-loading {
          display: grid;
          place-items: center;
          min-height: 220px;
          text-align: center;
          color: #77716b;
        }
        #${rootId} .ai-journal-prompt.is-error {
          color: #8a2f22;
          background: rgba(255, 246, 243, .86);
        }
        #${rootId} .ai-journal-loading {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
        }
        #${rootId} .ai-journal-spinner {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid rgba(39, 35, 29, .18);
          border-top-color: rgba(39, 35, 29, .72);
          animation: ai-journal-spin .8s linear infinite;
        }
        @keyframes ai-journal-spin {
          to { transform: rotate(360deg); }
        }
        #${rootId} .ai-journal-copy:disabled {
          cursor: default;
          opacity: .45;
        }
        #${toastId} {
          position: fixed;
          left: 50%;
          top: 28px;
          z-index: 2147483647;
          transform: translateX(-50%);
          border: 1px solid rgba(32, 28, 24, .14);
          border-radius: 12px;
          background: rgba(255,255,255,.94);
          box-shadow: 0 16px 48px rgba(0,0,0,.16);
          backdrop-filter: blur(16px);
          padding: 10px 14px;
          font: 700 14px/1.4 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #27231d;
        }
      `;

      const root = document.createElement("div");
      root.id = rootId;
      root.innerHTML = `
        <section class="ai-journal-panel" role="dialog" aria-modal="true" aria-label="生成 Prompt">
          <div class="ai-journal-head">
            <h2>生成 Prompt</h2>
            <button class="ai-journal-close" type="button" aria-label="关闭">×</button>
          </div>
          <pre class="ai-journal-prompt ${isLoading ? "is-loading" : ""} ${isError ? "is-error" : ""}"></pre>
          <div class="ai-journal-actions">
            <span></span>
            <button class="ai-journal-copy" type="button" ${isReady ? "" : "disabled"}>复制 Prompt</button>
          </div>
        </section>
      `;
      root.prepend(style);
      const prompt = root.querySelector(".ai-journal-prompt");
      if (isLoading) {
        prompt.innerHTML = `<span class="ai-journal-loading"><span class="ai-journal-spinner"></span><span></span></span>`;
        prompt.querySelector(".ai-journal-loading span:last-child").textContent = value;
      } else {
        prompt.textContent = value;
      }
      document.documentElement.appendChild(root);

      const showToast = (message) => {
        document.getElementById(toastId)?.remove();
        const toast = document.createElement("div");
        toast.id = toastId;
        toast.textContent = message;
        document.documentElement.appendChild(toast);
        window.setTimeout(() => toast.remove(), 1500);
      };

      const copyText = async () => {
        if (!isReady || !value.trim()) return;
        try {
          await navigator.clipboard.writeText(value);
          showToast("Prompt 已复制");
        } catch {
          const textarea = document.createElement("textarea");
          textarea.value = value;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          const copied = document.execCommand("copy");
          textarea.remove();
          showToast(copied ? "Prompt 已复制" : "复制失败，请手动复制");
        }
      };

      root.querySelector(".ai-journal-close").addEventListener("click", () => root.remove());
      root.querySelector(".ai-journal-copy").addEventListener("click", copyText);
      root.addEventListener("click", (event) => {
        if (event.target === root) root.remove();
      });
      window.addEventListener("keydown", function onKeydown(event) {
        if (event.key !== "Escape") return;
        root.remove();
        window.removeEventListener("keydown", onKeydown);
      });
    },
    args: [text, state]
  });
}

async function showToastInTab(tabId, message) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (value) => {
        const toastId = "ai-journal-toast-root";
        document.getElementById(toastId)?.remove();
        const toast = document.createElement("div");
        toast.id = toastId;
        toast.textContent = value;
        toast.style.cssText = `
          position: fixed;
          left: 50%;
          top: 28px;
          z-index: 2147483647;
          transform: translateX(-50%);
          border: 1px solid rgba(32, 28, 24, .14);
          border-radius: 12px;
          background: rgba(255,255,255,.94);
          box-shadow: 0 16px 48px rgba(0,0,0,.16);
          backdrop-filter: blur(16px);
          padding: 10px 14px;
          font: 700 14px/1.4 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #27231d;
        `;
        document.documentElement.appendChild(toast);
        window.setTimeout(() => toast.remove(), 1800);
      },
      args: [message]
    });
  } catch {
    notify("AI 灵感手帐", message);
  }
}

async function pingJournalTabs(settings) {
  const urls = unique([settings.appUrl, "http://localhost:5176", "http://localhost:5174", "http://localhost:5173"]);
  for (const url of urls) {
    try {
      const tabs = await chrome.tabs.query({ url: `${url}/*` });
      for (const tab of tabs) {
        if (!tab.id) continue;
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.dispatchEvent(new CustomEvent("ai-journal-sync"))
        });
      }
    } catch {
      // Some pages may not allow scripts; polling in the app is the fallback.
    }
  }
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.svg",
    title,
    message
  });
}

function randomDecoration() {
  return {
    tape: pick(tapes),
    pin: pick(pins),
    rotate: Math.round((Math.random() * 5 - 2.5) * 10) / 10,
    clip: pick(clips)
  };
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function findDayIndex(date) {
  return (date.getDay() || 7) - 1;
}

function formatKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function titleFromUrl(srcUrl) {
  try {
    const pathname = new URL(srcUrl).pathname;
    return decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "context image");
  } catch {
    return "context image";
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "操作失败";
}
