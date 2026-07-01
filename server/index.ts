import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { createDb } from "./db/client";
import type { InspirationImage } from "./db/schema";
import { analyzeDesignImage, getAiStatus } from "./openai";
import { createStore } from "./store";
import { createSignedImageUrl, getUserIdFromAuthHeader, uploadImageToStorage } from "./supabase";

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
    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    res.json(await withSignedImageUrls(await store.listByWeek(weekStart, userId)));
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/config", (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    enabled: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  });
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
    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    const input = createImageSchema.parse(req.body);
    const imageId = randomUUID();
    const storageImage = await uploadImageToStorage({ userId, imageId, imageDataUrl: input.imageDataUrl });
    const storedImageDataUrl = storageImage ? null : input.imageDataUrl;

    if (input.asyncAnalysis) {
      const row = await store.create({
        id: imageId,
        userId,
        weekStart: input.weekStart,
        dayIndex: input.dayIndex,
        title: input.title,
        imageDataUrl: storedImageDataUrl,
        imageUrl: storageImage?.imageUrl || null,
        storagePath: storageImage?.storagePath || null,
        decoration: input.decoration,
        keywords: ["分析中"],
        reversePrompt: "AI 正在分析视觉风格并生成反推 prompt..."
      });

      void analyzeDesignImage(input.imageDataUrl, input.promptTemplate)
        .then((analysis) => store.updateAnalysis(row.id, userId, { keywords: analysis.keywords, reversePrompt: analysis.reversePrompt }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : "AI 接口调用失败";
          return store.updateAnalysis(row.id, userId, {
            keywords: ["AI 未连接"],
            reversePrompt: `AI 接口未完成：${message}`
          });
        });

      res.status(202).json({
        ...(await withSignedImageUrl(row)),
        analysisNote: "已保存，AI 正在分析"
      });
      return;
    }

    const analysis = await analyzeDesignImage(input.imageDataUrl, input.promptTemplate);
    const row = await store.create({
      id: imageId,
      userId,
      weekStart: input.weekStart,
      dayIndex: input.dayIndex,
      title: input.title,
      imageDataUrl: storedImageDataUrl,
      imageUrl: storageImage?.imageUrl || null,
      storagePath: storageImage?.storagePath || null,
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
      ...(await withSignedImageUrl(row)),
      analysisNote: `${providerLabel} 已生成`
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/images/:id/keywords", async (req, res, next) => {
  try {
    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    const keywords = z.array(z.string()).parse(req.body.keywords);
    const row = await store.updateKeywords(req.params.id, userId, keywords);
    if (!row) return res.status(404).json({ error: "图片不存在" });
    res.json(await withSignedImageUrl(row));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/images/:id", async (req, res, next) => {
  try {
    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    await store.remove(req.params.id, userId);
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

async function withSignedImageUrls(rows: InspirationImage[]) {
  return Promise.all(rows.map((row) => withSignedImageUrl(row)));
}

async function withSignedImageUrl(row: InspirationImage) {
  if (!row.storagePath) return row;
  return {
    ...row,
    imageUrl: await createSignedImageUrl(row.storagePath)
  };
}
