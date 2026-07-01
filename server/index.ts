import cors from "cors";
import express from "express";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { createDb } from "./db/client";
import { analyzeDesignImage, getAiStatus } from "./openai";
import { createStore } from "./store";

loadEnvFile();

const app = express();
const port = Number(process.env.API_PORT || 8787);
const host = process.env.API_HOST || "0.0.0.0";
const store = createStore(createDb());

app.use(cors());
app.use(express.json({ limit: "14mb" }));

const createImageSchema = z.object({
  weekStart: z.string(),
  dayIndex: z.number().int().min(0).max(6),
  title: z.string().default("pasted screenshot"),
  imageDataUrl: z.string(),
  promptTemplate: z.string().optional(),
  asyncAnalysis: z.boolean().optional(),
  decoration: z.object({
    tape: z.string(),
    pin: z.string(),
    rotate: z.number(),
    clip: z.enum(["tape", "pin", "clip", "washi"])
  })
});

const analyzeImageSchema = z.object({
  imageDataUrl: z.string(),
  promptTemplate: z.string().optional(),
  fast: z.boolean().optional()
});

app.get("/api/images", async (req, res, next) => {
  try {
    const weekStart = String(req.query.weekStart || "");
    res.json(await store.listByWeek(weekStart));
  } catch (error) {
    next(error);
  }
});

app.get("/api/ai/status", (_req, res) => {
  res.json(getAiStatus());
});

app.post("/api/analyze-image", async (req, res, next) => {
  try {
    const input = analyzeImageSchema.parse(req.body);
    const analysis = await analyzeDesignImage(input.imageDataUrl, input.promptTemplate, { fast: input.fast });
    res.json({
      keywords: analysis.keywords,
      reversePrompt: analysis.reversePrompt,
      source: analysis.source
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/images", async (req, res, next) => {
  try {
    const input = createImageSchema.parse(req.body);
    if (input.asyncAnalysis) {
      const row = await store.create({
        weekStart: input.weekStart,
        dayIndex: input.dayIndex,
        title: input.title,
        imageDataUrl: input.imageDataUrl,
        decoration: input.decoration,
        keywords: ["分析中"],
        reversePrompt: "AI 正在分析视觉风格并生成反推 prompt..."
      });

      void analyzeDesignImage(input.imageDataUrl, input.promptTemplate)
        .then((analysis) => store.updateAnalysis(row.id, { keywords: analysis.keywords, reversePrompt: analysis.reversePrompt }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : "AI 接口调用失败";
          return store.updateAnalysis(row.id, {
            keywords: ["AI 未连接"],
            reversePrompt: `AI 接口未完成：${message}`
          });
        });

      res.status(202).json({
        ...row,
        analysisNote: "已保存，AI 正在分析"
      });
      return;
    }

    const analysis = await analyzeDesignImage(input.imageDataUrl, input.promptTemplate);
    const row = await store.create({
      weekStart: input.weekStart,
      dayIndex: input.dayIndex,
      title: input.title,
      imageDataUrl: input.imageDataUrl,
      decoration: input.decoration,
      keywords: analysis.keywords,
      reversePrompt: analysis.reversePrompt
    });
    const providerLabel = {
      openai: "GPT",
      gemini: "Gemini",
      volcengine: "火山引擎",
      "openai-compatible": "兼容模型"
    }[analysis.source];
    res.status(201).json({
      ...row,
      analysisNote: `${providerLabel} 已生成`
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/images/:id/keywords", async (req, res, next) => {
  try {
    const keywords = z.array(z.string()).parse(req.body.keywords);
    const row = await store.updateKeywords(req.params.id, keywords);
    if (!row) return res.status(404).json({ error: "图片不存在" });
    res.json(row);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/images/:id", async (req, res, next) => {
  try {
    await store.remove(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "服务暂时不可用";
  res.status(400).json({ error: message });
});

app.listen(port, host, () => {
  console.log(`Design terminology API running at http://localhost:${port}`);
});

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index < 0) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
