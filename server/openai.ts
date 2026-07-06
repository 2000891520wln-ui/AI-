const ORIGINAL_PRODUCT_PROMPT = `构建一个自动生成设计术语的灵感剪切板应用，这个应用界面应是一个按周组织
的手账式界面：用户粘贴截图 AI 自动生成5-10个设计术语 图片对应术语
标签排列，所有内容按周历排列和储存。
技术栈
• 前端：React 18 + TypeScript + Vite + Tailwind Css + shgden/ui +
Framer Motion
•后端：Node.js + Express
• 数据库：PostgreSQL + Drizzle ORM
• Al: GPT API（图片 设计术语）
核心功能
1. 周视图布局
• 固定结构：
◎ 第1行：周一/周二/周三周四/周五/周六/周日
• 顶部导航：
◎ 切换上一周/下一周
◎ 显示当前周数与日期范围
2. 图片卡片
• 图片放置在对应日期格内
• 展示样式：
◎ 宝丽来/ 拍立得风格
◎ 随机装饰（胶带/ 图钉/ 回形针/ 和纸胶带）
◎ 无限画布
• 上传完成后：
◎ 自动调用GPT API
◎ 生成该图片对应的设计术语关键词


3. 术语（Terminology）
• 每张图片右侧显示关键词标签
• 默认展示：
◎ 第一个关键词+「N」
• 悬停：
◎ 展开完整关键词列表
• 交互：
◎ 点击标签 -复制到剪贴板
。单个标签悬停显示删除按钮（X），可删除该关键词
4. 设计约束
• 整体色调：温暖琥珀色系，支持深色模式`;

export type GptAnalysis = {
  keywords: string[];
  reversePrompt: string;
  source: "openai" | "gemini" | "volcengine" | "openai-compatible";
};

type AnalysisOptions = {
  fast?: boolean;
};

export async function analyzeDesignImage(imageDataUrl: string, promptTemplate?: string, options: AnalysisOptions = {}): Promise<GptAnalysis> {
  if (/^https?:\/\//i.test(imageDataUrl)) {
    imageDataUrl = await remoteImageToDataUrl(imageDataUrl);
  }

  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageDataUrl)) {
    throw new Error("图片格式不正确，请上传截图或图片文件");
  }

  const provider = resolveProvider();
  if (provider === "gemini") return analyzeWithGemini(imageDataUrl, promptTemplate, options);
  if (provider === "volcengine" || provider === "ark" || provider === "doubao") return analyzeWithVolcengine(imageDataUrl, promptTemplate, options);
  if (provider === "openai-compatible" || provider === "compatible") return analyzeWithOpenAICompatible(imageDataUrl, promptTemplate, options);
  return analyzeWithOpenAI(imageDataUrl, promptTemplate, options);
}

async function remoteImageToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("图片下载失败，无法重新分析");

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error("图片链接格式不正确，无法重新分析");

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 14 * 1024 * 1024) throw new Error("图片过大，无法重新分析");

  return `data:${contentType.split(";")[0]};base64,${bytes.toString("base64")}`;
}

export function getAiStatus() {
  const provider = resolveProvider();
  return {
    provider,
    configured:
      provider === "volcengine" || provider === "ark" || provider === "doubao"
        ? Boolean((process.env.VOLCENGINE_API_KEY || process.env.ARK_API_KEY) && (process.env.VOLCENGINE_MODEL || process.env.ARK_MODEL))
        : provider === "gemini"
          ? Boolean(process.env.GEMINI_API_KEY)
          : provider === "openai-compatible" || provider === "compatible"
            ? Boolean(process.env.OPENAI_COMPATIBLE_API_KEY && process.env.OPENAI_COMPATIBLE_MODEL)
            : Boolean(process.env.OPENAI_API_KEY),
    model:
      provider === "volcengine" || provider === "ark" || provider === "doubao"
        ? process.env.VOLCENGINE_MODEL || process.env.ARK_MODEL || ""
        : provider === "gemini"
          ? process.env.GEMINI_MODEL || "gemini-1.5-flash"
          : provider === "openai-compatible" || provider === "compatible"
            ? process.env.OPENAI_COMPATIBLE_MODEL || ""
            : process.env.OPENAI_MODEL || "gpt-4.1-mini",
    fastModel:
      provider === "volcengine" || provider === "ark" || provider === "doubao"
        ? process.env.VOLCENGINE_FAST_MODEL || process.env.ARK_FAST_MODEL || ""
        : ""
  };
}

function resolveProvider() {
  return (
    process.env.AI_PROVIDER ||
    (process.env.VOLCENGINE_API_KEY || process.env.ARK_API_KEY ? "volcengine" : "") ||
    (process.env.OPENAI_COMPATIBLE_API_KEY ? "openai-compatible" : "") ||
    (process.env.GEMINI_API_KEY ? "gemini" : "openai")
  ).toLowerCase();
}

async function analyzeWithOpenAI(imageDataUrl: string, promptTemplate?: string, options: AnalysisOptions = {}): Promise<GptAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("未配置 OPENAI_API_KEY，无法根据图片生成真实关键词和 prompt");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildAnalysisPrompt(promptTemplate, options) },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: options.fast ? "low" : "high"
            }
          ]
        }
      ],
      max_output_tokens: options.fast ? 900 : 1800,
      text: {
        format: {
          type: "json_schema",
          name: "design_style_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              keywords: {
                type: "array",
                minItems: 5,
                maxItems: 10,
                items: { type: "string" }
              },
              reversePrompt: { type: "string" }
            },
            required: ["keywords", "reversePrompt"]
          }
        }
      }
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || "GPT 图像分析接口调用失败");
  }

  return normalizeAnalysis(JSON.parse(extractText(body)), "openai", promptTemplate);
}

async function analyzeWithGemini(imageDataUrl: string, promptTemplate?: string, options: AnalysisOptions = {}): Promise<GptAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("未配置 GEMINI_API_KEY，无法根据图片生成真实关键词和 prompt");

  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("图片格式不正确，请上传截图或图片文件");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-1.5-flash"}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          maxOutputTokens: options.fast ? 900 : 1800,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              keywords: {
                type: "ARRAY",
                minItems: 5,
                maxItems: 10,
                items: { type: "STRING" }
              },
              reversePrompt: { type: "STRING" }
            },
            required: ["keywords", "reversePrompt"]
          }
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: buildAnalysisPrompt(promptTemplate, options) },
              {
                inlineData: {
                  mimeType: match[1],
                  data: match[2]
                }
              }
            ]
          }
        ]
      })
    }
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || "Gemini 图像分析接口调用失败");
  }

  const text = body.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
  return normalizeAnalysis(JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()), "gemini", promptTemplate);
}

async function analyzeWithVolcengine(imageDataUrl: string, promptTemplate?: string, options: AnalysisOptions = {}): Promise<GptAnalysis> {
  const apiKey = process.env.VOLCENGINE_API_KEY || process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("未配置 VOLCENGINE_API_KEY 或 ARK_API_KEY，无法调用火山引擎生成真实关键词和 prompt");

  const model =
    options.fast && (process.env.VOLCENGINE_FAST_MODEL || process.env.ARK_FAST_MODEL)
      ? process.env.VOLCENGINE_FAST_MODEL || process.env.ARK_FAST_MODEL
      : process.env.VOLCENGINE_MODEL || process.env.ARK_MODEL;
  if (!model) throw new Error("未配置 VOLCENGINE_MODEL 或 ARK_MODEL，请填写火山方舟模型/推理接入点 ID");

  const endpoint = process.env.VOLCENGINE_BASE_URL || process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  if (endpoint.replace(/\/+$/, "").endsWith("/responses")) {
    return analyzeWithVolcengineResponses({
      apiKey,
      model,
      endpoint,
      imageDataUrl,
      promptTemplate,
      options
    });
  }

  return analyzeWithChatCompletions({
    apiKey,
    model,
    endpoint,
    source: "volcengine",
    imageDataUrl,
    promptTemplate,
    options
  });
}

async function analyzeWithOpenAICompatible(imageDataUrl: string, promptTemplate?: string, options: AnalysisOptions = {}): Promise<GptAnalysis> {
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  if (!apiKey) throw new Error("未配置 OPENAI_COMPATIBLE_API_KEY，无法调用兼容模型生成真实关键词和 prompt");

  const model = process.env.OPENAI_COMPATIBLE_MODEL;
  if (!model) throw new Error("未配置 OPENAI_COMPATIBLE_MODEL，请填写兼容服务的视觉模型名称");

  return analyzeWithChatCompletions({
    apiKey,
    model,
    endpoint: toChatCompletionsUrl(process.env.OPENAI_COMPATIBLE_BASE_URL || "https://api.openai.com/v1"),
    source: "openai-compatible",
    imageDataUrl,
    promptTemplate,
    options
  });
}

async function analyzeWithChatCompletions({
  apiKey,
  model,
  endpoint,
  source,
  imageDataUrl,
  promptTemplate,
  options
}: {
  apiKey: string;
  model: string;
  endpoint: string;
  source: "volcengine" | "openai-compatible";
  imageDataUrl: string;
  promptTemplate?: string;
  options?: AnalysisOptions;
}): Promise<GptAnalysis> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildAnalysisPrompt(promptTemplate, options) },
            { type: "image_url", image_url: { url: imageDataUrl, detail: options?.fast ? "low" : "high" } }
          ]
        }
      ],
      max_tokens: options?.fast ? 900 : 1800,
      ...(source === "openai-compatible" ? { response_format: { type: "json_object" } } : {})
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || body.message || `${source} 图像分析接口调用失败`);
  }

  const text = body.choices?.[0]?.message?.content || body.output_text || "";
  return normalizeAnalysis(parseAnalysisText(text), source, promptTemplate);
}

async function analyzeWithVolcengineResponses({
  apiKey,
  model,
  endpoint,
  imageDataUrl,
  promptTemplate,
  options
}: {
  apiKey: string;
  model: string;
  endpoint: string;
  imageDataUrl: string;
  promptTemplate?: string;
  options?: AnalysisOptions;
}): Promise<GptAnalysis> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildAnalysisPrompt(promptTemplate, options) },
            { type: "input_image", image_url: imageDataUrl, detail: options?.fast ? "low" : "high" }
          ]
        }
      ],
      thinking: { type: "disabled" },
      text: { format: { type: "json_object" } },
      max_output_tokens: options?.fast ? 900 : 1800
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || body.message || "volcengine 图像分析接口调用失败");
  }

  return normalizeAnalysis(parseAnalysisText(extractText(body)), "volcengine", promptTemplate);
}

function buildAnalysisPrompt(promptTemplate?: string, options: AnalysisOptions = {}) {
  const template = promptTemplate?.trim() || ORIGINAL_PRODUCT_PROMPT;
  if (options.fast) {
    return `${compactPromptTemplate(template)}

快速分析这张参考图，输出可直接用于插件浮层的最终 Prompt。
上方用户 prompt 模板是最高优先级。即使是快速模式，也必须完成完整视觉观察，不能用关键词机械拼接、通用模板或摘要替代。
不要输出“快速 Prompt”“AI 完成后会自动替换”这类临时文案；reversePrompt 必须就是最终可复制使用的高质量生图 prompt。
禁止输出思考过程、步骤推理、解释文本、JSON 外文本。
只返回严格 JSON，不要 Markdown，不要解释：
	{
	  "keywords": ["5-10 个具体中文设计术语"],
	  "reversePrompt": "必须包含：中文版本：...\\n\\nEnglish version: ...；严格按上方用户 prompt 模板组织；如果模板要求结构化，就保留结构化"
	}
	
要求：
1. keywords 必须具体，避免“高级、简约、复古、可爱”等泛词，也不要输出单字颜色或完整句子。
2. reversePrompt 的语言、结构和关键分析维度必须优先遵守上方用户 prompt 模板，不要强制改成纯英文。
3. 如果模板要求中英文，reversePrompt 必须同时包含“中文版本：”和“English version:”两个明确标题。
4. 中文版本不能只是英文版摘要，必须覆盖画面类型、构图、核心元素、字体、色彩、材质肌理、信息层级、图片比例和禁忌。
5. reversePrompt 的格式只能是两个连续段落：第一段以“中文版本：”开头，第二段以“English version:”开头；段内不要再添加小标题、编号或分析说明。
6. 中文段必须是具体、完整、可直接生图的中文描述；英文段必须是自然、专业、纯英文的最终 Prompt，严禁夹杂中文关键词。
7. 两个语言版本都要基于图片本身具体描述主体、空间位置、比例、色彩、字体和材质，禁止“保留参考图关系”“围绕这些关键词”等空泛套话。`;
  }

  return `${template}

你现在运行在这个应用的上传分析流程中。
请基于用户上传的参考图，以及上方 prompt 模板，反推出该图片可复用的视觉生成 prompt，并生成该图片对应的设计术语关键词。
${options.fast ? "当前是快速生成模式：请优先提取最关键的视觉风格，不要过度展开细枝末节。" : ""}
上方用户 prompt 模板是最高优先级。模板里新增的每个分析维度都必须被执行并体现在 reversePrompt 中，包括但不限于图片比例、画面尺寸、构图比例、留白比例、主体占比、字体比例、图文比例、材质、色彩、字体、元素关系和禁忌。
先在内部完成视觉观察，再把全部维度融合成两个可直接用于生图的完整段落。禁止用关键词机械拼接，禁止复用通用模板，禁止写“保留参考图关系”“围绕这些关键词”“适合生成类似图片”等无法独立生图的空话。
不要输出应用开发方案，不要描述技术栈，不要复述需求文档。
不要输出“快速 Prompt”“AI 完成后会自动替换”“适合生成类似图片”这类临时说明；reversePrompt 必须是最终可直接复制到生图工具的高质量 prompt。
禁止输出思考过程、步骤推理、解释文本、JSON 外文本。

请只返回严格 JSON，不要 Markdown，不要解释。JSON 结构必须完全如下：
	{
	  "keywords": ["5-10 个中文或中英混合设计术语，适合直接显示为图片右侧标签"],
	  "reversePrompt": "必须包含：中文版本：...\\n\\nEnglish version: ...；严格按用户 prompt 模板反推得到的视觉分析与生图 prompt，语言和结构必须遵守用户 prompt 模板；如果模板要求结构化，就保留结构化"
	}

输出规则：
1. keywords 必须有 5-10 个，不能少于 5 个。
2. keywords 必须针对这张图片变化，禁止每张图都输出同一组词。
3. keywords 不能只写“高级、简约、复古、可爱”，不能输出单字颜色或完整句子，必须是具体设计术语，例如字体、构图、材质、色彩、插画、排版、信息密度、视觉风格相关术语。
4. reversePrompt 不能为空；不要强制英文，必须优先遵守用户 prompt 模板中的语言、结构和分析维度要求。
5. 最终展示格式固定为两个连续段落：第一段以“中文版本：”开头，第二段以“English version:”开头；每种语言各一个完整段落，段内不要再添加小标题、编号、分析过程或 Markdown。
6. 如果用户模板要求中英文，reversePrompt 必须同时包含“中文版本：”和“English version:”两个明确标题。
7. 中文版本和 English version 都必须是最终生图 prompt：具体覆盖视觉类型、设计语言、构图系统、视觉重心、核心/必要/禁止元素、字体气质、图文关系、色彩系统、材质肌理、信息层级、图片比例和 Anti-AI 规则。
8. 中文段必须使用自然、准确的中文；英文段必须使用自然、专业、纯英文表达，严禁夹杂中文词语或把中文关键词直接塞进英文句子。
9. 中文段不少于 180 个汉字，英文段不少于 320 个英文字符。每个版本都必须写出图片中实际可见的元素、位置、数量或相对比例，不能只罗列抽象风格词。
10. 如果图片信息较少，也要基于可见风格关系推断术语，但不得虚构与画面冲突的主体。`;
}

function compactPromptTemplate(template: string) {
  const trimmed = template.trim();
  if (trimmed.length <= 1400) return trimmed;
  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const important = lines.filter((line) =>
    /中文|English|英文|比例|尺寸|构图|留白|主体|字体|图文|色彩|材质|肌理|元素|禁忌|prompt|Prompt/i.test(line)
  );
  const compact = important.join("\n");
  return (compact || trimmed).slice(0, 1800);
}

function normalizeAnalysis(parsed: unknown, source: GptAnalysis["source"], promptTemplate?: string): GptAnalysis {
  const value = parsed as Partial<GptAnalysis>;
  const keywords = normalizeKeywords(value?.keywords);
  const reversePrompt = ensurePromptTemplateRequirements(String(value?.reversePrompt || "").trim(), keywords, promptTemplate);
  return {
    keywords: keywords.length >= 5 ? keywords : inferKeywordsFromText(reversePrompt),
    reversePrompt: reversePrompt || "",
    source
  };
}

function parseAnalysisText(text: string) {
  try {
    return parseJsonText(text);
  } catch {
    return plainTextToAnalysis(text);
  }
}

function plainTextToAnalysis(text: string) {
  const clean = stripMarkdownFence(text).trim();
  if (!clean) throw new Error("模型没有返回可用内容");

  const keywordLine =
    clean
      .split(/\n+/)
      .map((line) => line.trim())
      .find((line) => /关键词|keywords?|terminology|术语/i.test(line)) || "";
  const keywordSource = extractAfterLabel(keywordLine, /(关键词|keywords?|terminology|术语)/i);
  const keywords = normalizeKeywords(
    keywordSource
      .split(/[、,，/|;；\n]+/)
      .map((item) => item.replace(/^[-*\d.\s]+/, "").trim())
      .filter(isUsefulKeyword)
  );

  return {
    keywords: keywords.length >= 5 ? keywords : inferKeywordsFromText(clean),
    reversePrompt: extractPromptFromPlainText(clean)
  };
}

function extractAfterLabel(line: string, labelPattern: RegExp) {
  const match = line.match(new RegExp(`${labelPattern.source}[^:：]*[:：]\\s*(.+)$`, labelPattern.flags));
  return match?.[2] || line.replace(/^(关键词|keywords?|terminology|术语)\s*[:：-]?\s*/i, "");
}

function isUsefulKeyword(item: string) {
  if (!item || item.length > 24) return false;
  if (item.length < 2) return false;
  if (/^[红橙黄绿青蓝紫黑白灰粉]+$/.test(item) && item.length <= 2) return false;
  if (/[。.!！?？]/.test(item)) return false;
  if (/^(中文版本|English version|英文版本|prompt|reversePrompt)$/i.test(item)) return false;
  if (/用户|需要|首先|然后|现在|所以|检查|整理|输出|部分|结构|确保|比如|可能|调整|左右/i.test(item)) return false;
  return true;
}

function extractPromptFromPlainText(text: string) {
  const promptMatch = text.match(/(?:reversePrompt|生图\s*prompt|prompt)[^:：]*[:：]\s*([\s\S]+)/i);
  const source = promptMatch?.[1] || text;
  const paragraphs = source
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !/^(首先|然后|现在|所以|检查|需要|用户现在|最后|因此|接下来)/.test(paragraph));
  const prompt = paragraphs[0] || source.trim();
  return prompt.replace(/^(生成)?一段\s*/i, "").trim();
}

function inferKeywordsFromText(text: string) {
  const candidates = [
    ["黑白色调", /黑白|灰度|monochrome|black[-\s]?and[-\s]?white/i],
    ["仰拍构图", /仰拍|向上|树冠|upward|worm/i],
    ["放射构图", /放射|中心|径向|radial|center/i],
    ["彩色点缀", /彩色|荧光|红|绿|紫|粉|colorful|neon/i],
    ["文字排版", /文字|字体|排版|typography|text/i],
    ["颗粒肌理", /颗粒|噪点|印刷|grain|noise|print/i],
    ["高对比", /对比|contrast/i],
    ["低饱和背景", /低饱和|desaturated|muted/i],
    ["图文层级", /层级|信息|hierarchy/i],
    ["Anti-AI 禁忌", /禁忌|避免|no |avoid/i]
  ] as const;
  const matched = candidates.filter(([, pattern]) => pattern.test(text)).map(([keyword]) => keyword);
  return [...matched, ...candidates.map(([keyword]) => keyword).filter((keyword) => !matched.includes(keyword))].slice(0, 8);
}

function ensurePromptTemplateRequirements(reversePrompt: string, keywords: string[], promptTemplate?: string) {
  if (!reversePrompt) return reversePrompt;
  if (!requiresBilingualPrompt(promptTemplate)) return reversePrompt;
  return ensureBilingualReversePrompt(reversePrompt, keywords);
}

function ensureBilingualReversePrompt(reversePrompt: string, keywords: string[]) {
  const sections = splitBilingualPrompt(reversePrompt);
  if (!sections.chinese || !sections.english) {
    throw new Error("模型输出缺少完整的中文版本或 English version");
  }

  const chinese = sections.chinese.replace(/\s+/g, " ").trim();
  const english = sections.english.replace(/\s+/g, " ").trim();
  const chineseCharacterCount = (chinese.match(/[\u3400-\u9fff]/g) || []).length;
  const englishCjkCount = (english.match(/[\u3400-\u9fff]/g) || []).length;
  const englishLatinCount = (english.match(/[a-z]/gi) || []).length;
  const combined = `${chinese} ${english}`;
  const requiredSignals = [
    /构图|composition/i,
    /比例|ratio|portrait|landscape|square|vertical|horizontal/i,
    /字体|文字|typography|lettering|text/i,
    /色彩|饱和|明度|对比|palette|color|saturation|brightness|contrast/i,
    /材质|肌理|颗粒|印刷|手绘|texture|grain|print|paper|hand[- ]?drawn/i,
    /层级|密度|hierarchy|density/i,
    /避免|禁止|avoid|without|no\s/i
  ];

  if (chineseCharacterCount < 180 || english.length < 320 || englishLatinCount < 220) {
    throw new Error("模型输出的中英文 Prompt 细节不足");
  }
  if (englishCjkCount > 0) {
    throw new Error("模型输出的 English version 混入了中文");
  }
  if (requiredSignals.filter((pattern) => pattern.test(combined)).length < 7) {
    throw new Error("模型输出没有覆盖完整的视觉分析维度");
  }
  if (/画面以.+为核心视觉特征|保留参考图的构图关系|围绕.+建立风格/.test(chinese)) {
    throw new Error("模型输出使用了泛化 Prompt 模板");
  }

  return `中文版本：${chinese}\n\nEnglish version: ${english}`;
}

function splitBilingualPrompt(text: string) {
  const clean = text
    .trim()
    .replace(/\*\*(中文(?:版本|版|\s*Prompt)?|English\s*(?:version|Prompt)|英文(?:版本|版|\s*Prompt)?)\s*[:：]\*\*/gi, "$1：");
  const chineseLabel = /中文(?:版本|版|\s*Prompt)?\s*[:：]/i;
  const englishLabel = /(?:English\s*(?:version|Prompt)|英文(?:版本|版|\s*Prompt)?)\s*[:：]/i;
  const chineseMatch = clean.match(
    new RegExp(`${chineseLabel.source}\\s*([\\s\\S]*?)(?=${englishLabel.source}|$)`, "i")
  );
  const englishMatch = clean.match(new RegExp(`${englishLabel.source}\\s*([\\s\\S]*)`, "i"));
  return {
    chinese: chineseMatch?.[1]?.trim() || "",
    english: englishMatch?.[1]?.trim() || ""
  };
}

function stripBilingualLabels(text: string) {
  return text
    .replace(/^\s*中文版本[:：]\s*/i, "")
    .replace(/^\s*(English version|英文版本)[:：]\s*/i, "")
    .trim();
}

function isMostlyEnglish(text: string) {
  const latin = (text.match(/[a-z]/gi) || []).length;
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  return latin > cjk * 1.5;
}

function isLowDetailPrompt(text: string) {
  const clean = text.trim();
  if (clean.length < 240) return true;
  if (/画面以.+为核心视觉特征/.test(clean)) return true;
  if (/Create a reusable visual generation prompt based on the reference image/i.test(clean)) return true;
  const requiredSignals = [
    /视觉类型|画面类型|poster|visual reference/i,
    /构图|composition/i,
    /字体|typography/i,
    /色彩|palette|saturation|contrast/i,
    /材质|肌理|grain|texture/i,
    /层级|hierarchy/i,
    /禁忌|Anti-AI|Avoid/i
  ];
  if (requiredSignals.filter((pattern) => pattern.test(clean)).length < 5) return true;
  return false;
}

function chinesePromptFromSource(sourceText: string, keywords: string[]) {
  const terms = keywords.length ? keywords.join("、") : "参考图的视觉类型、构图、色彩、材质肌理与字体气质";
  const source = sourceText.trim();
  const sourceSentence = `参考图可见特征：${chineseSourceHints(source, terms)}。`;

  return [
    `${sourceSentence}`,
    `画面类型与设计语言：生成一张可复用的平面视觉/海报参考图，围绕${terms}建立风格，不做照片写实复刻。`,
    "构图系统与视觉重心：保留参考图的主次关系、留白比例、主体占比、图文比例和画面重心；明确竖版或近似参考图比例，元素不要随意放大、压扁或漂移。",
    "核心元素与必要元素：保留主要图形、装饰元素、文字区域、边框/底纹/肌理之间的相对关系；如果原图有海报标题、辅助文字、图形插画或装饰边缘，应保持同类层级。",
    "字体与图文关系：字体气质贴近参考图，保持标题、辅助信息与图形之间的节奏和距离；文字只作为设计排版元素，不生成乱码长段落。",
    "色彩与材质：沿用参考图的主色、辅色、饱和度、明度、对比度、柔焦/颗粒/印刷/手绘/纸感等材质特征，避免廉价高饱和和过度锐化。",
    "信息密度与层级：保持参考图的信息密度、视觉层级和装饰密度，不要把画面变成模板化空白封面，也不要塞入无关元素。",
    "Anti-AI 规则：避免厚重 3D 渲染、真实摄影质感、强阴影、错误透视、错误比例、随机乱码、无关图标、过多装饰、偏离原图色彩和不符合参考图气质的字体。"
  ].join(" ");
}

function englishPromptFromSource(sourceText: string, keywords: string[]): string {
  const terms = keywords.length ? keywords.join(", ") : "the reference image type, composition, color palette, material texture, and typography mood";
  const source = sourceText.trim().replace(/\s+/g, " ");
  if (isMostlyEnglish(source) && source.length > 120) return polishEnglishPrompt(source, keywords);
  const reference = `Reference traits focus on ${englishKeywordHints(keywords) || terms}.`;

  return [
    reference,
    `Create a polished reusable image-generation prompt for a flat graphic poster / visual reference built around ${terms}.`,
    "Preserve the reference image type, design language, composition system, visual center of gravity, whitespace ratio, subject-to-canvas ratio, typography scale, and relationship between text and graphics.",
    "Keep the core elements, necessary decorative details, background system, border or pattern logic, and hierarchy close to the reference instead of inventing unrelated objects.",
    "Use typography with the same mood and hierarchy as the reference; text should behave as designed layout material, not as long readable paragraphs or random garbled copy.",
    "Match the palette, saturation, brightness, contrast, soft focus, grain, print texture, paper feel, hand-drawn or matte surface qualities visible in the reference.",
    "Maintain a comparable information density and visual hierarchy. Avoid generic blank templates, excessive decoration, unrelated icons, realistic photography, heavy 3D rendering, hard shadows, wrong aspect ratio, distorted perspective, over-sharpening, over-saturated colors, and typography that drifts away from the reference."
  ].join(" ");
}

function polishEnglishPrompt(prompt: string, keywords: string[]): string {
  const clean = stripBilingualLabels(prompt).replace(/\s+/g, " ").trim();
  if (!clean) return englishPromptFromSource("", keywords);
  const hasAvoid = /avoid|no |without|Anti-AI/i.test(clean);
  const hasAspect = /aspect ratio|vertical|horizontal|portrait|landscape|square|ratio/i.test(clean);
  const additions: string[] = [];
  if (!hasAspect) additions.push("Use the same approximate aspect ratio and subject-to-canvas proportions as the reference.");
  if (!hasAvoid) {
    additions.push(
      "Avoid unrelated objects, realistic photographic rendering, heavy 3D depth, harsh shadows, wrong typography hierarchy, garbled long text, distorted proportions, over-sharpening, and over-saturated colors."
    );
  }
  return [clean, ...additions].join(" ");
}

function chineseSourceHints(source: string, fallbackTerms: string) {
  const text = source.toLowerCase();
  const hints: string[] = [];
  if (/fashion|promotional|poster/.test(text)) hints.push("时尚活动宣传海报");
  if (/cream|yellow|vertical|strip/.test(text)) hints.push("浅奶油黄色细竖纹背景");
  if (/center[-\s]?aligned|typography|title/.test(text)) hints.push("居中标题排版与高对比衬线字体");
  if (/accessor|perfume|sunglasses|clutch|headphone|beret|chocolate/.test(text)) {
    hints.push("上下区域分布香水瓶、墨镜、手包、耳机、贝雷帽、巧克力条等时尚配饰插画");
  }
  if (/zigzag|stitched|outline|fuzzy|soft gradient/.test(text)) hints.push("柔焦渐变填充、白色锯齿缝线边缘和软雾化轮廓");
  if (/macaron|pale yellow|coral|mint|low saturation|low contrast/.test(text)) hints.push("暖马卡龙色系、低饱和、低对比、柔和明度");
  if (/matte|paper|grain|print|texture/.test(text)) hints.push("哑光纸感、轻颗粒和平涂肌理");
  return hints.length ? hints.join("，") : `集中在${fallbackTerms}`;
}

function englishKeywordHints(keywords: string[]) {
  const dictionary: Record<string, string> = {
    暖马卡龙配色: "warm macaron color palette",
    平涂肌理插画: "flat textured illustration",
    竖纹肌理背景: "thin vertical striped background",
    锯齿白边装饰: "white zigzag stitched outline decoration",
    居中文字排版: "center-aligned typography layout",
    居中排版: "center-aligned layout",
    低饱和柔焦质感: "low-saturation soft-focus texture",
    时尚配饰扁平插画: "flat fashion accessory illustrations",
    时尚配饰插画: "fashion accessory illustrations",
    衬线艺术字体: "elegant high-contrast serif typography",
    信息层级清晰: "clear information hierarchy",
    简约时尚海报: "minimal fashion poster"
  };
  return keywords.map((keyword) => dictionary[keyword] || "").filter(Boolean).join(", ");
}

function requiresBilingualPrompt(promptTemplate?: string) {
  const template = promptTemplate || "";
  return template.includes("中文版本") && /English version|英文版本/i.test(template);
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function extractText(response: any) {
  if (response.output_text) return response.output_text;
  if (response.choices?.[0]?.message?.content) return normalizeContentText(response.choices[0].message.content);
  if (response.message?.content) return normalizeContentText(response.message.content);
  if (response.content) return normalizeContentText(response.content);
  const chunks: string[] = [];
  for (const item of response.output || []) {
    if (item.text) chunks.push(String(item.text));
    if (item.content) chunks.push(normalizeContentText(item.content));
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  if (!chunks.length) chunks.push(...collectLikelyText(response));
  return stripMarkdownFence([...new Set(chunks)].join("\n")).trim();
}

function normalizeContentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) return String((item as { text?: unknown }).text || "");
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text?: unknown }).text || "");
  }
  return "";
}

function collectLikelyText(value: unknown, path: string[] = []): string[] {
  if (!value || typeof value !== "object") return [];
  const output: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key];
    const lowerKey = key.toLowerCase();
    if (
      typeof child === "string" &&
      child.trim() &&
      /(text|content|message|output|answer|result)/i.test(lowerKey) &&
      !/(id|model|status|type|role|finish|reason)/i.test(lowerKey)
    ) {
      output.push(child);
      continue;
    }
    if (child && typeof child === "object" && nextPath.length < 6) output.push(...collectLikelyText(child, nextPath));
  }
  return output;
}

function parseJsonText(text: string) {
  const clean = stripMarkdownFence(text).trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型没有返回可解析的 JSON");
    return JSON.parse(match[0]);
  }
}

function stripMarkdownFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
}

function toChatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function normalizeKeywords(keywords: unknown) {
  if (!Array.isArray(keywords)) return [];
  const seen = new Set<string>();
  const clean = keywords
    .map(String)
    .flatMap((item) => item.split(/[,\n;；|]/))
    .map((item) =>
      item
        .replace(/^[-*\d.\s、，:：\[\]"'“”‘’]+/, "")
        .replace(/[。.!！?？；;，,\]\["'“”‘’]+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(isUsefulKeyword)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return clean.slice(0, 10);
}
