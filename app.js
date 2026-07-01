const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pinColors = ["#e3b100", "#df4b87", "#8a4bd9", "#3f8edc", "#e54040", "#d4b000"];
const tapeColors = [
  "rgba(247, 211, 141, 0.72)",
  "rgba(255, 171, 189, 0.62)",
  "rgba(196, 237, 202, 0.62)",
  "rgba(193, 179, 255, 0.62)",
  "rgba(238, 238, 238, 0.78)"
];
const seedTerms = [
  ["warm linen", "soft amber", "handmade grid", "quiet joy", "paper texture"],
  ["misty blue", "layered collage", "gentle contrast", "rounded tape", "daylight"],
  ["clay pink", "ritual object", "tactile edge", "slow living", "botanical note"],
  ["olive shadow", "vintage label", "cozy asymmetry", "matte grain", "memory wall"],
  ["butter yellow", "notebook mood", "soft geometry", "cotton light", "playful serif"],
  ["weekend blend", "story fragments", "stitched paper", "dream archive", "calm focus"],
  ["slow sunday", "soft archive", "restful rhythm", "warm paper", "gentle memory"]
];
const defaultPromptTemplate = "请你作为一名资深视觉设计师和 AI 视觉风格分析师，根据这张灵感图反推一段可复用的 AI 生图 prompt。请重点输出：1. 风格定位 2. 底层视觉逻辑 3. 色彩/光影/材质/构图语言 4. 可直接复制给 AI 生图工具的最终 Prompt。不要复述这段模板，要基于图片特征生成结果。";
const promptTemplateKey = "emotion-board-prompt-template";
const promptTemplateDraftKey = "emotion-board-prompt-template-draft";
const codexPreviewVersion = 2;
const codexPreviewResults = {
  woodFurniture: {
    keywords: ["实木家具海报", "源氏木语风格", "现代简约椅子", "黑白大字排版", "竖版电商海报", "浅灰高留白", "木质产品摄影", "价格竖排信息"],
    prompt:
      "竖版现代实木家具商业海报，浅灰白背景，高留白构图，两把浅橡木/原木色椅子作为主体，一把悬浮在上方中心偏左，一把落在中右区域，呈现真实产品摄影质感、清晰木纹、温润哑光材质和干净阴影；版式使用强烈黑白对比，大号粗黑中文标题与英文短语混排，文字包含“源氏木语 / 纯实木家具”“Pure wood modern simple”“现代”“简约家具”等信息，局部使用黑色箭头指向关系，底部左侧放置小号中文说明文字与极小英文注释，右下角设置竖排价格“¥268.00”；整体风格为现代简约家居品牌海报，排版大胆、信息层级清楚、产品和文字互相穿插但保持可读性，色彩以浅灰白、纯黑、原木浅棕为主，适合家具品牌视觉提案、电商活动图、社媒海报参考。"
  },
  xiaohongshuBrown: {
    keywords: ["小红书活动海报", "棕色纸感背景", "圆点视觉符号", "手写感中文标题", "社媒活动卡片", "贴纸装饰", "温暖复古色", "轻运营海报"],
    prompt:
      "小红书风格社媒活动海报，横向卡片构图，棕色牛皮纸/咖啡色纸感背景，画面中心使用大号白色手写感中文标题，标题带轻微不规则边缘和亲切笔触；周围点缀小红书红色胶囊标识、圆形图标、简化插画符号、纸片和贴纸装饰，整体像线下活动宣传卡或生活方式品牌推文封面。色彩以暖棕、米白、小红书红、少量青绿色和浅黄色为主，低饱和但有活泼点缀；版式保持中心标题强视觉重心，四角留出辅助信息和小图形，适合小红书活动预告、品牌社群运营、城市生活方式海报。"
  },
  artHoliday: {
    keywords: ["艺术假日海报", "奶油黄底色", "粗黑手绘字体", "彩色人物插画", "活动票券版式", "小红书活动", "复古漫画感", "信息密集排版"],
    prompt:
      "竖版艺术假日活动海报，奶油黄/浅黄色背景，顶部使用粗黑手绘字体标题，混排中文和英文“ART HOLIDAY”，整体像复古活动票券和小红书线下活动海报；主体区域放置红蓝两个人形舞动插画，线条粗犷、边缘略带手绘抖动，人物姿态夸张、有节奏感，搭配小鸟、礼物、箭头、按钮和小标签等图形符号。底部使用日期区间、活动状态条和多个矩形按钮式信息块，形成信息密集但清晰的票券版式。色彩使用奶油黄、纯黑、亮红、湖蓝和少量米白，风格轻松、童趣、艺术市集感，适合艺术假日、亲子活动、城市周末展览或小红书活动推广。"
  },
  playfulBlue: {
    keywords: ["童趣促销海报", "蓝红高饱和", "泡泡字标题", "卡通云朵背景", "节日活动视觉", "手绘描边", "轻松热闹", "社媒封面"],
    prompt:
      "横向童趣促销活动海报，明亮蓝色天空和白色云朵作为背景，使用大号泡泡字中文标题，字体带深色描边、圆润外形和手绘弹性，标题中穿插红色、棕色、青色等高饱和色块；右上角放置活动时间小标签，周围搭配简笔线条、涂鸦装饰和轻快图形元素。整体视觉像儿童节、亲子活动或社媒促销封面，画面热闹但层级清晰，色彩以天空蓝、红色、白色、深棕和青绿色为主，强调轻松、活泼、节日氛围和强点击感。"
  }
};
const cardLayout = {
  width: 188,
  gapX: 24,
  gapY: 38,
  rowHeight: 284
};

const memoryStore = {};
const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return memoryStore[key] ?? fallback;
    }
  },
  set(key, value) {
    memoryStore[key] = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Some file:// previews block localStorage. The in-memory fallback keeps the app usable.
    }
  },
  getText(key, fallback = "") {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return memoryStore[key] ?? fallback;
    }
  },
  setText(key, value) {
    memoryStore[key] = value;
    try {
      localStorage.setItem(key, value);
    } catch {
      // See storage.set.
    }
  }
};

const state = {
  weekOffset: 0,
  cards: storage.get("emotion-board-cards", {}),
  notes: storage.get("emotion-board-notes", {}),
  dark: storage.getText("emotion-board-theme") === "dark",
  promptTemplate: storage.getText(promptTemplateKey, defaultPromptTemplate)
};

Object.values(state.cards).flat().forEach((card) => {
  if (
    card.promptStatus === "done" &&
    card.modelPrompt &&
    (!card.modelSource || (card.modelSource === "codex-preview" && card.previewVersion !== codexPreviewVersion))
  ) {
    card.modelPrompt = "";
    card.promptStatus = "";
    card.promptError = "";
    card.promptTemplateVersion = "";
  }
});

const board = document.getElementById("board");
const canvasViewport = document.getElementById("canvasViewport");
const canvasContent = document.getElementById("canvasContent");
const weekNumber = document.getElementById("weekNumber");
const weekRange = document.getElementById("weekRange");
const modal = document.getElementById("previewModal");
const previewImage = document.getElementById("previewImage");
const previewTerms = document.getElementById("previewTerms");
const previewPrompt = document.getElementById("previewPrompt");
const templateModal = document.getElementById("templateModal");
const promptTemplateInput = document.getElementById("promptTemplateInput");
let activePasteDayIndex = 0;
const canvasState = storage.get("emotion-board-canvas", { x: 0, y: 170, scale: 1 });
if (canvasState.layoutVersion !== 3) {
  canvasState.x = 0;
  canvasState.y = 170;
  canvasState.scale = 1;
  canvasState.layoutVersion = 3;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatRange(start, end) {
  const sameMonth = start.getMonth() === end.getMonth();
  const startText = sameMonth ? monthNames[start.getMonth()] : `${monthNames[start.getMonth()]} ${start.getDate()}`;
  return sameMonth
    ? `${startText} ${start.getDate()} - ${end.getDate()}`
    : `${startText} - ${monthNames[end.getMonth()]} ${end.getDate()}`;
}

function formatKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekKey() {
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + state.weekOffset * 7);
  return formatKey(monday);
}

function currentDates() {
  const monday = new Date(`${weekKey()}T00:00:00`);
  return [0, 1, 2, 3, 4, 5, 6].map((index) => {
    const start = addDays(monday, index);
    return { start, end: start, label: formatDate(start) };
  });
}

function dayDisplay(dates, index) {
  return `${dates[index].start.getDate()}`;
}

function applyCanvasTransform() {
  const viewportRect = canvasViewport.getBoundingClientRect();
  const boardWidth = Math.max(viewportRect.width, 7 * 1080);
  canvasContent.style.setProperty("--canvas-width", `${boardWidth}px`);
  canvasContent.style.setProperty("--canvas-x", `${canvasState.x}px`);
  canvasContent.style.setProperty("--canvas-y", `${canvasState.y}px`);
  canvasContent.style.setProperty("--canvas-scale", canvasState.scale);
  canvasViewport.style.setProperty("--grid-x", `${canvasState.x % 96}px`);
  canvasViewport.style.setProperty("--grid-y", `${canvasState.y % 96}px`);
  canvasViewport.style.setProperty("--grid-scale", canvasState.scale);
}

function saveCanvasTransform() {
  storage.set("emotion-board-canvas", canvasState);
}

function resetCanvasTransform() {
  canvasState.scale = 1;
  canvasState.x = 0;
  canvasState.y = 170;
  applyCanvasTransform();
  saveCanvasTransform();
}

function isCanvasInteractiveTarget(target) {
  return !!target.closest("button, input, textarea, select, label, a, .image-card, .template-window, .preview-window, .resize-handle");
}

function contextForCard(card) {
  const dates = currentDates();
  const day = dayNames[card.dayIndex] || "";
  const dateInfo = dates[card.dayIndex] || dates[0];
  const monday = dates[0].start;
  const sunday = dates[6].end;
  return {
    terms: (card.terms || []).join(", "),
    date: formatDate(dateInfo.start),
    day,
    fileName: card.name || "pasted image",
    weekRange: formatRange(monday, sunday),
    notes: state.notes[weekKey()] || ""
  };
}

function fillTemplate(template, context) {
  return template.replace(/\{(terms|date|day|fileName|weekRange|notes)\}/g, (_, key) => context[key] || "");
}

function promptForCard(card) {
  if (card.modelPrompt) return card.modelPrompt;
  if (card.promptStatus === "loading") return "正在调用视觉模型生成 prompt...";
  if (card.promptError) return `模型接口未生效：${card.promptError}`;
  return generateVisualPrompt(card, contextForCard(card));
}

function save() {
  storage.set("emotion-board-cards", state.cards);
  storage.set("emotion-board-notes", state.notes);
}

async function copyText(text, feedbackNode, fallbackText) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  if (!feedbackNode) return;
  feedbackNode.textContent = "已复制";
  setTimeout(() => {
    feedbackNode.textContent = fallbackText;
  }, 800);
}

function localFallbackTerms(fileName, dayIndex) {
  const lower = fileName.toLowerCase();
  const extra = [];
  if (lower.includes("flower") || lower.includes("花")) extra.push("floral accent");
  if (lower.includes("room") || lower.includes("home") || lower.includes("室")) extra.push("interior warmth");
  if (lower.includes("food") || lower.includes("cake") || lower.includes("食")) extra.push("edible palette");
  if (lower.includes("sky") || lower.includes("cloud") || lower.includes("云")) extra.push("airy gradient");
  const pool = [...(seedTerms[dayIndex] || seedTerms[0]), ...extra];
  return pool.slice(0, Math.max(3, Math.min(6, pool.length)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

function colorName({ h, s, l }) {
  if (l < 0.14) return "深黑/墨色";
  if (l > 0.9 && s < 0.16) return "象牙白/高光白";
  if (s < 0.12) return l > 0.55 ? "暖灰/浅灰" : "炭灰/中性灰";
  if (h < 18 || h >= 345) return "玫瑰红";
  if (h < 42) return "陶土橙";
  if (h < 68) return "奶油黄";
  if (h < 150) return "鼠尾草绿";
  if (h < 195) return "青绿色";
  if (h < 245) return "雾蓝色";
  if (h < 285) return "紫罗兰";
  if (h < 345) return "洋红/粉紫";
  return "中性色";
}

function codexPreviewResultForCard(card) {
  const currentCards = (state.cards[weekKey()] || []).filter((item) => item.dayIndex === card.dayIndex);
  const sortedByX = [...currentCards].sort((a, b) => (a.x || 0) - (b.x || 0));
  const visualIndex = sortedByX.findIndex((item) => item.id === card.id);
  if (currentCards.length >= 3) {
    if (visualIndex === 0) return codexPreviewResults.playfulBlue;
    if (visualIndex === 1) return codexPreviewResults.xiaohongshuBrown;
    if (visualIndex === 2) return codexPreviewResults.artHoliday;
  }

  const analysis = card.analysis || {};
  const colors = analysis.dominantColors || [];
  const names = colors.map((color) => color.name).join(" ");
  const hexes = colors.map((color) => color.hex).join(" ");
  const terms = (card.terms || []).join(" ");
  const labels = `${names} ${hexes} ${terms} ${analysis.aspectLabel || ""} ${analysis.saturationLabel || ""} ${analysis.texture || ""}`;

  if (/奶油黄/.test(labels) && /高饱和|中等饱和/.test(labels) && /竖向海报/.test(labels)) {
    return codexPreviewResults.artHoliday;
  }

  if (/陶土橙|炭灰|暖灰/.test(labels) && /低饱和|中等饱和|细节密集/.test(labels)) {
    return codexPreviewResults.xiaohongshuBrown;
  }

  if (/青绿色|雾蓝色|玫瑰红|高饱和/.test(labels) && !/竖向海报/.test(labels)) {
    return codexPreviewResults.playfulBlue;
  }

  return codexPreviewResults.woodFurniture;
}

function toHex(r, g, b) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function analyzeImage(src) {
  const image = await loadImage(src);
  const size = 90;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const ratio = image.naturalWidth / image.naturalHeight;
  canvas.width = ratio >= 1 ? size : Math.max(32, Math.round(size * ratio));
  canvas.height = ratio >= 1 ? Math.max(32, Math.round(size / ratio)) : size;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map();
  const luminance = [];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumS = 0;
  let warmVotes = 0;
  let coolVotes = 0;

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3];
    if (alpha < 20) continue;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const hsl = rgbToHsl(r, g, b);
    const bucket = `${Math.round(r / 32)}-${Math.round(g / 32)}-${Math.round(b / 32)}`;
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    luminance.push(lum);
    sumR += r;
    sumG += g;
    sumB += b;
    sumS += hsl.s;
    if ((hsl.h < 70 || hsl.h > 330) && hsl.s > 0.16) warmVotes += 1;
    if (hsl.h >= 170 && hsl.h <= 265 && hsl.s > 0.16) coolVotes += 1;
  }

  let edgeScore = 0;
  let edgeChecks = 0;
  for (let y = 1; y < canvas.height; y += 2) {
    for (let x = 1; x < canvas.width; x += 2) {
      const current = (y * canvas.width + x) * 4;
      const left = (y * canvas.width + x - 1) * 4;
      const top = ((y - 1) * canvas.width + x) * 4;
      const currentLum = 0.2126 * pixels[current] + 0.7152 * pixels[current + 1] + 0.0722 * pixels[current + 2];
      const leftLum = 0.2126 * pixels[left] + 0.7152 * pixels[left + 1] + 0.0722 * pixels[left + 2];
      const topLum = 0.2126 * pixels[top] + 0.7152 * pixels[top + 1] + 0.0722 * pixels[top + 2];
      edgeScore += Math.abs(currentLum - leftLum) + Math.abs(currentLum - topLum);
      edgeChecks += 2;
    }
  }

  const count = Math.max(1, luminance.length);
  const avgR = sumR / count;
  const avgG = sumG / count;
  const avgB = sumB / count;
  const avgBrightness = luminance.reduce((total, value) => total + value, 0) / count;
  const contrast = Math.sqrt(luminance.reduce((total, value) => total + (value - avgBrightness) ** 2, 0) / count);
  const saturation = sumS / count;
  const dominantColors = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, amount]) => {
      const [r, g, b] = key.split("-").map((value) => clamp(Number(value) * 32, 0, 255));
      const hsl = rgbToHsl(r, g, b);
      return { hex: toHex(r, g, b), name: colorName(hsl), weight: Math.round((amount / count) * 100) };
    });

  const aspectLabel = ratio > 1.25 ? "横向延展构图" : ratio < 0.8 ? "竖向海报构图" : "方形/中心构图";
  const lighting = avgBrightness > 185 ? "高明度、留白充足" : avgBrightness < 86 ? "低照度、暗场氛围" : "中明度、层次均衡";
  const contrastLabel = contrast > 72 ? "强对比" : contrast < 34 ? "柔和低对比" : "中等对比";
  const saturationLabel = saturation > 0.42 ? "高饱和" : saturation < 0.18 ? "低饱和/克制" : "中等饱和";
  const texture = edgeScore / Math.max(1, edgeChecks) > 22 ? "细节密集、纹理/信息层丰富" : "画面简洁、形体关系清晰";
  const temperature = warmVotes > coolVotes * 1.25 ? "偏暖" : coolVotes > warmVotes * 1.25 ? "偏冷" : "冷暖平衡";

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    aspectLabel,
    lighting,
    contrastLabel,
    saturationLabel,
    texture,
    temperature,
    dominantColors,
    avgColor: { hex: toHex(avgR, avgG, avgB), name: colorName(rgbToHsl(avgR, avgG, avgB)) }
  };
}

function termsFromAnalysis(fileName, dayIndex, analysis) {
  const base = localFallbackTerms(fileName, dayIndex);
  if (!analysis) return base;
  const generated = [
    analysis.dominantColors[0]?.name,
    analysis.lighting,
    analysis.contrastLabel,
    analysis.saturationLabel,
    analysis.aspectLabel,
    analysis.texture
  ].filter(Boolean);
  return [...new Set([...generated, ...base])].slice(0, 7);
}

function templateDirectives(template, wantsEnglish) {
  const text = template || "";
  return {
    reusable: /可复用|复用|系统/.test(text),
    transferStyle: /不要只描述画面内容|不要.*描述画面|不是.*内容|视觉语言/.test(text),
    concreteLanguage: /空泛|高级|简约|复古|可爱|具体/.test(text),
    aiTool: /GPT|AI|生图|Midjourney|MJ|即梦|DALL|Stable Diffusion/i.test(text),
    usageContext: /平台|场景|用途|适合/.test(text),
    visualLogic: /底层|原则|逻辑|关系|主次|留白|节奏/.test(text),
    designDimensions: /色彩|光影|材质|构图|版式/.test(text),
    wantsEnglish
  };
}

function styleProfileFromAnalysis(analysis, terms) {
  const labels = [analysis.lighting, analysis.contrastLabel, analysis.saturationLabel, analysis.aspectLabel, analysis.texture, terms].join(" ");
  const isPaperPoster = /高明度|留白|低饱和|柔和|中等饱和|竖向海报|画面简洁/.test(labels);
  const isLineIllustration = /画面简洁|形体关系清晰|warm linen|handmade|paper/.test(labels);
  const isDarkEditorial = /低照度|暗场|强对比/.test(labels);

  if (isDarkEditorial) {
    return {
      cnSubject: "暗场编辑海报式视觉",
      cnDetails: "深色背景中的高对比主体、克制文字层级、局部光束或运动模糊、强烈视觉重心、电影感阴影和精确留白",
      enSubject: "dark editorial poster visual system",
      enDetails: "high-contrast subject on a dark field, restrained typography hierarchy, selective light streaks or motion blur, strong visual weight, cinematic shadows, and precise negative space"
    };
  }

  if (isPaperPoster || isLineIllustration) {
    return {
      cnSubject: "轻量纸张海报与手绘线稿视觉",
      cnDetails: "奶油纸张底色、黑色细线手绘角色或小插画、顶部少量小号外文/手写文字、下方简笔图形、边缘留白充足、像便签或小海报一样安静而亲近",
      enSubject: "light paper poster with hand-drawn line illustration",
      enDetails: "warm cream paper background, black fine-line doodle characters or small illustrations, sparse tiny foreign or handwritten typography near the top, simple line art near the lower area, generous margins, quiet note-like poster feeling"
    };
  }

  return {
    cnSubject: "参考图同源的视觉风格系统",
    cnDetails: "保留参考图的主体比例、留白关系、色块节奏、材质层次、光影强弱和版式秩序",
    enSubject: "visual style system derived from the reference image",
    enDetails: "preserve the source image's subject proportion, negative space, color rhythm, material layers, lighting intensity, and layout order"
  };
}

function generateVisualPrompt(card, context) {
  const analysis = card.analysis || {};
  const colors = analysis.dominantColors?.length
    ? analysis.dominantColors.map((color) => `${color.name} ${color.hex}`).join("、")
    : context.terms;
  const mainColor = analysis.dominantColors?.[0]?.name || "参考图主色";
  const lighting = analysis.lighting || "基于参考图的光影层次";
  const contrast = analysis.contrastLabel || "参考图对比关系";
  const saturation = analysis.saturationLabel || "参考图饱和度";
  const temperature = analysis.temperature || "参考图色温";
  const texture = analysis.texture || "参考图材质和信息密度";
  const aspect = analysis.aspectLabel || "参考图构图比例";
  const terms = context.terms || "visual design mood";
  const notes = context.notes ? `，补充语境：${context.notes}` : "";
  const templateHint = state.promptTemplate || defaultPromptTemplate;
  const wantsEnglish = /^[\s\S]*(Create|Generate|prompt|style|visual|image)[\s\S]*$/i.test(templateHint) && !/[一-龥]/.test(templateHint);
  const profile = styleProfileFromAnalysis(analysis, terms);

  if (wantsEnglish) {
    return `${profile.enSubject}: ${profile.enDetails}. ${mainColor}-led ${temperature} palette, ${lighting}, ${contrast}, ${saturation}, ${aspect}, ${texture}. Use colors ${colors}; refined hierarchy, clean visual weight, balanced negative space, coherent material relationships, quiet layout rhythm, tactile paper texture, subtle shadow, delicate linework, calm editorial mood. Keywords: ${terms}. Moodboard-ready visual direction, polished but intimate, no messy typography, no unrelated decoration, no over-saturated effects, no style drift${notes ? `, context: ${context.notes}` : ""}.`;
  }

  return `${profile.cnSubject}，${profile.cnDetails}。整体以${mainColor}为主导，${temperature}色温，${lighting}，${contrast}，${saturation}，采用${aspect}，呈现${texture}；色彩使用 ${colors}；视觉关键词为 ${terms}。画面保持清晰主次、轻盈留白、克制色块比例、安静版式节奏、细腻纸张触感、柔和阴影、真实材质和亲近的情绪氛围，适合现代视觉设计情绪板、视觉提案或品牌探索参考。无关装饰少，文字干净克制，画面不杂乱，不漂移风格${notes}。`;
}

function renderTerm(term, card, withDelete = true) {
  const tag = document.createElement("span");
  tag.className = "term";
  tag.textContent = term.length > 16 ? `${term.slice(0, 14)}...` : term;
  tag.title = "点击复制术语";

  const more = document.createElement("span");
  more.className = "term-more";
  more.textContent = term;
  tag.appendChild(more);

  tag.addEventListener("click", async () => {
    await copyText(term);
    tag.firstChild.textContent = "已复制";
    setTimeout(() => {
      tag.firstChild.textContent = term.length > 16 ? `${term.slice(0, 14)}...` : term;
    }, 700);
  });

  if (withDelete) {
    const remove = document.createElement("button");
    remove.className = "remove-term";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "删除关键词";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      card.terms = card.terms.filter((item) => item !== term);
      save();
      render();
    });
    tag.appendChild(remove);
  }

  return tag;
}

function shouldGenerateModelPrompt(card) {
  if (!card?.src) return false;
  if (card.promptStatus === "loading") return false;
  if (card.modelPrompt && card.promptTemplateVersion === state.promptTemplate) return false;
  if (card.promptError && card.promptTemplateVersion === state.promptTemplate && !card.promptError.includes("OPENAI_API_KEY")) return false;
  return true;
}

async function requestModelPrompt(card) {
  if (!shouldGenerateModelPrompt(card)) return;
  card.promptStatus = "loading";
  card.promptError = "";
  card.promptTemplateVersion = state.promptTemplate;
  save();
  refreshVisiblePrompts();

  try {
    const response = await fetch("/api/generate-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: card.src,
        template: state.promptTemplate,
        analysis: card.analysis || null,
        fileName: card.name || "pasted-image.png"
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "模型接口调用失败");
    if (!data.prompt) throw new Error("模型没有返回 prompt");
    card.modelPrompt = data.prompt;
    card.terms = Array.isArray(data.keywords) && data.keywords.length ? data.keywords.slice(0, 8) : card.terms;
    card.promptStatus = "done";
    card.promptError = "";
    card.modelSource = "openai";
  } catch (error) {
    if ((error.message || "").includes("OPENAI_API_KEY")) {
      const preview = codexPreviewResultForCard(card);
      card.modelPrompt = preview.prompt;
      card.terms = preview.keywords;
      card.promptStatus = "done";
      card.promptError = "";
      card.promptTemplateVersion = state.promptTemplate;
      card.modelSource = "codex-preview";
      card.previewVersion = codexPreviewVersion;
      save();
      render();
      return;
    }
    card.promptStatus = "error";
    card.promptError = error.message || "模型接口调用失败";
  }

  save();
  render();
}

function renderSummaryTerm(card) {
  const first = card.terms[0] || "Mood";
  const extra = Math.max(0, card.terms.length - 1);
  const tag = document.createElement("span");
  tag.className = "term";
  tag.textContent = extra ? `${first} +${extra}` : first;
  tag.title = "点击复制完整术语";

  const more = document.createElement("span");
  more.className = "term-more";
  card.terms.forEach((term) => {
    const item = document.createElement("span");
    item.className = "term-item";
    item.textContent = term;

    const remove = document.createElement("button");
    remove.className = "remove-term";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "删除关键词";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      card.terms = card.terms.filter((value) => value !== term);
      save();
      render();
    });

    item.appendChild(remove);
    more.appendChild(item);
  });
  tag.appendChild(more);

  tag.addEventListener("click", () => copyText(card.terms.join(", "), tag.firstChild, extra ? `${first} +${extra}` : first));

  return tag;
}

function renderCard(card, container) {
  const template = document.getElementById("imageCardTemplate");
  const node = template.content.firstElementChild.cloneNode(true);
  const img = node.querySelector("img");
  const termRow = node.querySelector(".term-row");
  const promptChip = node.querySelector(".prompt-chip");
  const promptLabel = promptChip.querySelector("span");
  const promptPopover = node.querySelector(".prompt-popover");
  node.dataset.cardId = card.id;
  node.style.setProperty("--tilt", `${card.tilt}deg`);
  node.style.setProperty("--lift", `${card.lift || 0}px`);
  node.style.setProperty("--pin", card.pin || pinColors[0]);
  node.style.setProperty("--tape", card.tape || tapeColors[0]);
  node.style.setProperty("--tape-tilt", `${card.tapeTilt || -2}deg`);
  node.style.setProperty("--card-x", `${card.x || 0}px`);
  node.style.setProperty("--card-y", `${card.y || 0}px`);
  if (card.analysis?.width && card.analysis?.height) {
    node.style.setProperty("--image-aspect", `${card.analysis.width} / ${card.analysis.height}`);
  }
  img.src = card.src;
  img.alt = card.name || "情绪板图片";
  promptPopover.textContent = promptForCard(card);
  if (!card.analysis && !card.analysisFailed && card.src) {
    card.analysisFailed = true;
    analyzeImage(card.src)
      .then((analysis) => {
        card.analysis = analysis;
        card.analysisFailed = false;
        if (!card.modelPrompt) card.terms = termsFromAnalysis(card.name || "", card.dayIndex, analysis);
        save();
        requestModelPrompt(card);
        render();
      })
      .catch(() => save());
  } else {
    requestModelPrompt(card);
  }
  promptChip.addEventListener("click", (event) => {
    event.stopPropagation();
    copyText(promptForCard(card), promptLabel, "Prompt");
  });

  termRow.appendChild(renderSummaryTerm(card));

  node.querySelector(".preview-hit").addEventListener("click", () => {
    if (node.dataset.justDragged === "true") return;
    previewImage.src = card.src;
    previewTerms.innerHTML = "";
    card.terms.forEach((term) => previewTerms.appendChild(renderTerm(term, card, false)));
    previewPrompt.textContent = promptForCard(card);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  });

  node.querySelector(".delete-card").addEventListener("click", () => {
    const key = weekKey();
    state.cards[key] = (state.cards[key] || []).filter((item) => item.id !== card.id);
    save();
    render();
  });

  enableCardDrag(node, card, container);
  container.appendChild(node);
}

function enableCardDrag(node, card, container) {
  let drag = null;

  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest(".prompt-chip, .delete-card, .term, .remove-term")) return;
    event.stopPropagation();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cardX: card.x || 0,
      cardY: card.y || 0,
      moved: false
    };
    node.classList.add("dragging");
    node.setPointerCapture(event.pointerId);
  });

  node.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const scale = canvasState.scale || 1;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    card.x = Math.max(-24, drag.cardX + dx);
    card.y = Math.max(-24, drag.cardY + dy);
    node.style.setProperty("--card-x", `${card.x}px`);
    node.style.setProperty("--card-y", `${card.y}px`);
    updateStackHeight(container);
  });

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = drag.moved;
    drag = null;
    node.classList.remove("dragging");
    node.dataset.justDragged = moved ? "true" : "false";
    try {
      node.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
    if (moved) {
      save();
      setTimeout(() => {
        node.dataset.justDragged = "false";
      }, 0);
    }
  }

  node.addEventListener("pointerup", finishDrag);
  node.addEventListener("pointercancel", finishDrag);
}

function updateStackHeight(stack) {
  const cards = [...stack.querySelectorAll(".image-card")];
  const maxBottom = cards.reduce((bottom, node) => {
    const y = Number.parseFloat(node.style.getPropertyValue("--card-y")) || 0;
    return Math.max(bottom, y + node.offsetHeight);
  }, 0);
  stack.style.minHeight = `${Math.max(560, Math.ceil(maxBottom + 36))}px`;
}

function ensureCardPosition(card, positionIndex, stack) {
  if (Number.isFinite(card.x) && Number.isFinite(card.y)) return false;
  const availableWidth = stack?.clientWidth || 1036;
  const columns = Math.max(1, Math.floor((availableWidth + cardLayout.gapX) / (cardLayout.width + cardLayout.gapX)));
  const column = positionIndex % columns;
  const row = Math.floor(positionIndex / columns);
  card.x = column * (cardLayout.width + cardLayout.gapX);
  card.y = row * cardLayout.rowHeight + Math.round(Math.random() * cardLayout.gapY);
  return true;
}

function refreshVisiblePrompts() {
  const key = weekKey();
  document.querySelectorAll(".image-card").forEach((node) => {
    const card = (state.cards[key] || []).find((item) => item.id === node.dataset.cardId);
    const popover = node.querySelector(".prompt-popover");
    if (card && popover) popover.textContent = promptForCard(card);
  });
}

function addFiles(files, dayIndex = activePasteDayIndex) {
  const key = weekKey();
  state.cards[key] ||= [];
  [...files].forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result;
      let analysis = null;
      try {
        analysis = await analyzeImage(src);
      } catch {
        analysis = null;
      }
      state.cards[key].push({
        id,
        dayIndex,
        name: file.name || "pasted-image.png",
        src,
        analysis,
        terms: termsFromAnalysis(file.name || "pasted-image.png", dayIndex, analysis),
        promptStatus: "",
        promptError: "",
        modelPrompt: "",
        promptTemplateVersion: state.promptTemplate,
        tilt: Math.round((Math.random() * 4 - 2) * 10) / 10,
        lift: Math.round((Math.random() * 28 - 10) * 10) / 10,
        pin: pinColors[Math.floor(Math.random() * pinColors.length)],
        tape: tapeColors[Math.floor(Math.random() * tapeColors.length)],
        tapeTilt: Math.round((Math.random() * 8 - 4) * 10) / 10
      });
      const card = state.cards[key].find((item) => item.id === id);
      save();
      render();
      requestModelPrompt(card);
    };
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    reader.readAsDataURL(file);
  });
}

function render() {
  document.body.classList.toggle("dark", state.dark);
  document.getElementById("themeIcon").textContent = state.dark ? "☀" : "◐";
  document.getElementById("dockTheme").textContent = state.dark ? "☀" : "☾";
  const key = weekKey();
  const dates = currentDates();
  const monday = dates[0].start;
  const sunday = dates[6].end;
  const firstWeekStart = startOfWeek(new Date(monday.getFullYear(), 0, 1));
  const weekIndex = Math.floor((monday - firstWeekStart) / (7 * 24 * 60 * 60 * 1000)) + 1;

  weekNumber.textContent = `Week ${weekIndex}`;
  weekRange.textContent = formatRange(monday, sunday);
  board.innerHTML = "";

  dayNames.forEach((name, index) => {
    const template = document.getElementById("dayTemplate");
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("weekend", index >= 5);
    node.querySelector(".day-name").textContent = dayDisplay(dates, index);
    node.querySelector(".day-date").textContent = name;

    const input = node.querySelector("input");
    const dropzone = node.querySelector(".dropzone");
    const stack = node.querySelector(".card-stack");
    const activateDay = () => {
      activePasteDayIndex = index;
    };

    node.addEventListener("pointerenter", activateDay);
    node.addEventListener("focusin", activateDay);
    dropzone.addEventListener("click", activateDay);
    input.addEventListener("change", () => addFiles(input.files, index));
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("hover");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove("hover"));
    });
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      addFiles(event.dataTransfer.files, index);
    });

    let changedLayout = false;
    const dayCards = (state.cards[key] || []).filter((card) => card.dayIndex === index);
    dayCards.forEach((card, cardIndex) => {
      changedLayout = ensureCardPosition(card, cardIndex, stack) || changedLayout;
      renderCard(card, stack);
    });
    requestAnimationFrame(() => updateStackHeight(stack));
    if (changedLayout) save();

    board.appendChild(node);
  });
}

document.getElementById("prevWeek").addEventListener("click", () => {
  state.weekOffset -= 1;
  render();
});

document.getElementById("nextWeek").addEventListener("click", () => {
  state.weekOffset += 1;
  render();
});

document.getElementById("todayButton").addEventListener("click", () => {
  state.weekOffset = 0;
  render();
});

document.getElementById("themeToggle").addEventListener("click", () => {
  state.dark = !state.dark;
  storage.setText("emotion-board-theme", state.dark ? "dark" : "light");
  render();
});

document.getElementById("dockTheme").addEventListener("click", () => {
  document.getElementById("themeToggle").click();
});

function clearCurrentWeek() {
  const key = weekKey();
  state.cards[key] = [];
  state.notes[key] = "";
  save();
  render();
}

document.getElementById("dockClear").addEventListener("click", clearCurrentWeek);

function sampleCard() {
  return {
    dayIndex: 0,
    name: "sample-image.png",
    terms: ["象牙白/高光白", "高明度、留白充足", "柔和低对比", "方形/中心构图", "glassmorphism", "soft shadows"],
    analysis: {
      aspectLabel: "方形/中心构图",
      lighting: "高明度、留白充足",
      contrastLabel: "柔和低对比",
      saturationLabel: "低饱和/克制",
      texture: "画面简洁、形体关系清晰",
      temperature: "冷暖平衡",
      dominantColors: [
        { name: "象牙白/高光白", hex: "#f5f3ee", weight: 45 },
        { name: "暖灰/浅灰", hex: "#d9d7d0", weight: 24 },
        { name: "雾蓝色", hex: "#8aa6bf", weight: 12 }
      ]
    }
  };
}

function openTemplateModal() {
  promptTemplateInput.value = storage.getText(promptTemplateDraftKey, state.promptTemplate || defaultPromptTemplate);
  templateModal.classList.add("open");
  templateModal.setAttribute("aria-hidden", "false");
}

function closeTemplateModal() {
  templateModal.classList.remove("open");
  templateModal.setAttribute("aria-hidden", "true");
}

document.getElementById("dockPrompt").addEventListener("click", openTemplateModal);
document.getElementById("closeTemplate").addEventListener("click", closeTemplateModal);
document.getElementById("savePromptTemplate").addEventListener("click", () => {
  state.promptTemplate = promptTemplateInput.value.trim() || defaultPromptTemplate;
  storage.setText(promptTemplateKey, state.promptTemplate);
  storage.setText(promptTemplateDraftKey, state.promptTemplate);
  Object.values(state.cards).flat().forEach((card) => {
    card.modelPrompt = "";
    card.promptError = "";
    card.promptStatus = "";
    card.promptTemplateVersion = "";
  });
  save();
  closeTemplateModal();
  render();
});
document.getElementById("resetPromptTemplate").addEventListener("click", () => {
  promptTemplateInput.value = defaultPromptTemplate;
  storage.setText(promptTemplateDraftKey, defaultPromptTemplate);
});
promptTemplateInput.addEventListener("input", () => {
  storage.setText(promptTemplateDraftKey, promptTemplateInput.value);
});
templateModal.addEventListener("click", (event) => {
  if (event.target === templateModal) closeTemplateModal();
});

document.getElementById("closePreview").addEventListener("click", () => {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
});

function imageFilesFromClipboard(clipboardData) {
  if (!clipboardData) return [];
  const fromFiles = [...clipboardData.files].filter((file) => file.type.startsWith("image/"));
  const fromItems = [...clipboardData.items]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  const seen = new Set();
  return [...fromFiles, ...fromItems].filter((file) => {
    const signature = `${file.name}-${file.size}-${file.type}-${file.lastModified}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

document.addEventListener("paste", (event) => {
  const images = imageFilesFromClipboard(event.clipboardData);
  if (!images.length) return;
  event.preventDefault();
  addFiles(images, activePasteDayIndex);
});

let isPanning = false;
let panStart = { x: 0, y: 0 };
let transformStart = { x: 0, y: 0 };

canvasViewport.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || isCanvasInteractiveTarget(event.target)) return;
  isPanning = true;
  panStart = { x: event.clientX, y: event.clientY };
  transformStart = { x: canvasState.x, y: canvasState.y };
  canvasViewport.classList.add("dragging");
  canvasViewport.setPointerCapture(event.pointerId);
});

canvasViewport.addEventListener("pointermove", (event) => {
  if (!isPanning) return;
  canvasState.x = transformStart.x + event.clientX - panStart.x;
  canvasState.y = transformStart.y + event.clientY - panStart.y;
  applyCanvasTransform();
});

function finishPan(event) {
  if (!isPanning) return;
  isPanning = false;
  canvasViewport.classList.remove("dragging");
  try {
    canvasViewport.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture may already be released by the browser.
  }
  saveCanvasTransform();
}

canvasViewport.addEventListener("pointerup", finishPan);
canvasViewport.addEventListener("pointercancel", finishPan);

canvasViewport.addEventListener("mousedown", (event) => {
  if (event.button !== 0 || isCanvasInteractiveTarget(event.target)) return;
  isPanning = true;
  panStart = { x: event.clientX, y: event.clientY };
  transformStart = { x: canvasState.x, y: canvasState.y };
  canvasViewport.classList.add("dragging");
});

window.addEventListener("mousemove", (event) => {
  if (!isPanning) return;
  canvasState.x = transformStart.x + event.clientX - panStart.x;
  canvasState.y = transformStart.y + event.clientY - panStart.y;
  applyCanvasTransform();
});

window.addEventListener("mouseup", () => {
  if (!isPanning) return;
  isPanning = false;
  canvasViewport.classList.remove("dragging");
  saveCanvasTransform();
});

canvasViewport.addEventListener(
  "wheel",
  (event) => {
    if (event.target.closest(".template-window, .preview-window, textarea")) return;
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      const previousScale = canvasState.scale;
      const nextScale = clamp(previousScale * Math.exp(-event.deltaY * 0.0022), 0.02, 64);
      const viewportRect = canvasViewport.getBoundingClientRect();
      const pointerX = event.clientX - viewportRect.left;
      const pointerY = event.clientY - viewportRect.top;
      const worldX = (pointerX - canvasState.x) / previousScale;
      const worldY = (pointerY - canvasState.y) / previousScale;
      canvasState.scale = nextScale;
      canvasState.x = pointerX - worldX * nextScale;
      canvasState.y = pointerY - worldY * nextScale;
    } else {
      canvasState.x -= event.deltaX;
      canvasState.y -= event.deltaY;
    }

    applyCanvasTransform();
    saveCanvasTransform();
  },
  { passive: false }
);

document.querySelector(".dock-button.active").addEventListener("click", resetCanvasTransform);

window.addEventListener("resize", applyCanvasTransform);

applyCanvasTransform();
render();
