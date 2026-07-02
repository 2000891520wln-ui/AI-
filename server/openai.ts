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
            : process.env.OPENAI_MODEL || "gpt-4.1-mini"
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
      max_output_tokens: options.fast ? 520 : 1200,
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

  return normalizeAnalysis(JSON.parse(extractText(body)), "openai");
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
          maxOutputTokens: options.fast ? 520 : 1200,
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
  return normalizeAnalysis(JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()), "gemini");
}

async function analyzeWithVolcengine(imageDataUrl: string, promptTemplate?: string, options: AnalysisOptions = {}): Promise<GptAnalysis> {
  const apiKey = process.env.VOLCENGINE_API_KEY || process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("未配置 VOLCENGINE_API_KEY 或 ARK_API_KEY，无法调用火山引擎生成真实关键词和 prompt");

  const model = process.env.VOLCENGINE_MODEL || process.env.ARK_MODEL;
  if (!model) throw new Error("未配置 VOLCENGINE_MODEL 或 ARK_MODEL，请填写火山方舟模型/推理接入点 ID");

  return analyzeWithChatCompletions({
    apiKey,
    model,
    endpoint: process.env.VOLCENGINE_BASE_URL || process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
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
      max_tokens: options?.fast ? 520 : 1200,
      ...(source === "openai-compatible" ? { response_format: { type: "json_object" } } : {})
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || body.message || `${source} 图像分析接口调用失败`);
  }

  const text = body.choices?.[0]?.message?.content || body.output_text || "";
  return normalizeAnalysis(parseJsonText(text), source);
}

function buildAnalysisPrompt(promptTemplate?: string, options: AnalysisOptions = {}) {
  const template = promptTemplate?.trim() || ORIGINAL_PRODUCT_PROMPT;
  if (options.fast) {
    return `${template.slice(0, 1800)}

快速分析这张参考图，输出可直接用于设计灵感板的结果。
只返回严格 JSON，不要 Markdown，不要解释：
{
  "keywords": ["5-10 个具体中文设计术语"],
  "reversePrompt": "一段英文 AI 生图 prompt，概括画面类型、构图、字体、色彩、材质、印刷/颗粒、元素关系与禁忌"
}

要求：关键词必须具体，避免“高级、简约、复古、可爱”等泛词；reversePrompt 控制在 90-150 个英文词。`;
  }

  return `${template}

你现在运行在这个应用的上传分析流程中。
请基于用户上传的参考图，以及上方 prompt 模板，反推出该图片可复用的视觉生成 prompt，并生成该图片对应的设计术语关键词。
${options.fast ? "当前是快速生成模式：请优先提取最关键的视觉风格，不要过度展开细枝末节。" : ""}
不要输出应用开发方案，不要描述技术栈，不要复述需求文档。

请只返回严格 JSON，不要 Markdown，不要解释。JSON 结构必须完全如下：
{
  "keywords": ["5-10 个中文或中英混合设计术语，适合直接显示为图片右侧标签"],
  "reversePrompt": "基于参考图和用户 prompt 模板反推得到的一段英文视觉风格 prompt，方便用户复制到 AI 生图工具"
}

输出规则：
1. keywords 必须有 5-10 个，不能少于 5 个。
2. keywords 必须针对这张图片变化，禁止每张图都输出同一组词。
3. keywords 不能只写“高级、简约、复古、可爱”，必须是具体设计术语，例如字体、构图、材质、色彩、插画、排版、信息密度、视觉风格相关术语。
4. reversePrompt 不能为空，必须把图片风格总结成可复制复用的英文视觉 prompt。
5. 如果图片信息较少，也要基于可见风格关系推断术语。`;
}

function normalizeAnalysis(parsed: unknown, source: GptAnalysis["source"]): GptAnalysis {
  const value = parsed as Partial<GptAnalysis>;
  const keywords = normalizeKeywords(value?.keywords);
  const reversePrompt = String(value?.reversePrompt || "").trim();
  return {
    keywords,
    reversePrompt: reversePrompt || "",
    source
  };
}

function extractText(response: any) {
  if (response.output_text) return response.output_text;
  const chunks: string[] = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("").replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

function parseJsonText(text: string) {
  const clean = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型没有返回可解析的 JSON");
    return JSON.parse(match[0]);
  }
}

function toChatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function normalizeKeywords(keywords: unknown) {
  if (!Array.isArray(keywords)) return [];
  const clean = keywords.map(String).map((item) => item.trim()).filter(Boolean);
  return clean.slice(0, 10);
}
