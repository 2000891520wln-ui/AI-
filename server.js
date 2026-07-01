import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 5173;
const host = process.env.HOST || "127.0.0.1";
const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.split("?")[0] === "/api/generate-prompt") {
    readJson(req)
      .then((payload) => generatePrompt(payload))
      .then((result) => sendJson(res, 200, result))
      .catch((error) => {
        const status = error.status || 500;
        sendJson(res, status, { error: error.message || "Prompt generation failed" });
      });
    return;
  }

  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const safePath = path.normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`AI emotion board running at http://${host}:${port}`);
});

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        const error = new Error("图片太大了，请换一张小一点的图");
        error.status = 413;
        reject(error);
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        const error = new Error("请求格式不正确");
        error.status = 400;
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function parseDataUrl(src) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(src || "");
  if (!match) {
    const error = new Error("图片格式不正确");
    error.status = 400;
    throw error;
  }
  return { mimeType: match[1], data: match[2] };
}

function cleanJsonText(text) {
  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function generatePrompt(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("模型接口未配置：请先设置 OPENAI_API_KEY，再重启服务");
    error.status = 501;
    throw error;
  }

  const template = payload.template || "";
  const localAnalysis = payload.analysis || {};
  const requestText = [
    "你是一名资深视觉设计师和 AI 生图 prompt 反推专家。",
    "请根据用户提供的 prompt 模板要求和这张参考图，反推出最终可直接复制使用的 AI 生图 prompt。",
    "必须真正观察图片内容、主体、文字、材质、构图、色彩和版式，不要复述模板，不要输出推导过程。",
    "输出必须是严格 JSON，不要 Markdown。",
    "JSON 结构：{\"keywords\":[\"关键词1\",\"关键词2\"],\"prompt\":\"最终 prompt\"}",
    "keywords 需要 5-8 个，必须来自图片视觉特征。",
    "prompt 只写最终提示词，必须包含具体主体、风格、构图、色彩、材质、字体/版式关系、光影和适用场景。",
    "不要写“依据用户模板”“作为一套可复用”“不要照搬”等模板元话术。",
    `用户 prompt 模板：${template}`,
    `本地粗分析补充：${JSON.stringify(localAnalysis)}`
  ].join("\n");

  parseDataUrl(payload.image);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: openaiModel,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: requestText },
            { type: "input_image", image_url: payload.image, detail: "high" }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "visual_prompt_result",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              keywords: {
                type: "array",
                minItems: 5,
                maxItems: 8,
                items: { type: "string" }
              },
              prompt: { type: "string" }
            },
            required: ["keywords", "prompt"]
          }
        }
      }
    })
  });

  const dataJson = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(dataJson.error?.message || "模型接口调用失败");
    error.status = response.status;
    throw error;
  }

  const text = extractOpenAIText(dataJson);
  const parsed = JSON.parse(cleanJsonText(text));
  return {
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8).map(String) : [],
    prompt: String(parsed.prompt || "").trim()
  };
}

function extractOpenAIText(response) {
  if (response.output_text) return response.output_text;
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("");
}
