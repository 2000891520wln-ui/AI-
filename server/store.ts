import { asc, eq } from "drizzle-orm";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Database } from "./db/client";
import { inspirationImages, type InspirationImage, type NewInspirationImage } from "./db/schema";

const fallbackStorePath = resolve(process.cwd(), "data", "inspiration-images.json");
const memory = loadFallbackStore();
let persistQueue = Promise.resolve();

export function createStore(db: Database | null) {
  return {
    async listByWeek(weekStart: string) {
      if (db) {
        return db.query.inspirationImages.findMany({
          where: eq(inspirationImages.weekStart, weekStart),
          orderBy: [asc(inspirationImages.dayIndex), asc(inspirationImages.createdAt)]
        });
      }
      return [...memory.values()].filter((item) => item.weekStart === weekStart);
    },

    async create(input: NewInspirationImage) {
      if (db) {
        const [row] = await db.insert(inspirationImages).values(input).returning();
        return row;
      }
      const now = new Date();
      const row: InspirationImage = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...input,
        keywords: input.keywords || [],
        reversePrompt: input.reversePrompt || ""
      } as InspirationImage;
      memory.set(row.id, row);
      await persistFallbackStore();
      return row;
    },

    async updateKeywords(id: string, keywords: string[]) {
      if (db) {
        const [row] = await db
          .update(inspirationImages)
          .set({ keywords, updatedAt: new Date() })
          .where(eq(inspirationImages.id, id))
          .returning();
        return row;
      }
      const row = memory.get(id);
      if (!row) return null;
      const next = { ...row, keywords, updatedAt: new Date() };
      memory.set(id, next);
      await persistFallbackStore();
      return next;
    },

    async updateAnalysis(id: string, analysis: { keywords: string[]; reversePrompt: string }) {
      if (db) {
        const [row] = await db
          .update(inspirationImages)
          .set({ ...analysis, updatedAt: new Date() })
          .where(eq(inspirationImages.id, id))
          .returning();
        return row;
      }
      const row = memory.get(id);
      if (!row) return null;
      const next = { ...row, ...analysis, updatedAt: new Date() };
      memory.set(id, next);
      await persistFallbackStore();
      return next;
    },

    async remove(id: string) {
      if (db) {
        await db.delete(inspirationImages).where(eq(inspirationImages.id, id));
        return;
      }
      memory.delete(id);
      await persistFallbackStore();
    }
  };
}

function loadFallbackStore() {
  const rows = new Map<string, InspirationImage>();
  if (!existsSync(fallbackStorePath)) return rows;

  try {
    const parsed = JSON.parse(readFileSync(fallbackStorePath, "utf8")) as InspirationImage[];
    for (const row of parsed) {
      rows.set(row.id, {
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      });
    }
  } catch (error) {
    console.error("Failed to load local inspiration image store:", error);
  }

  return rows;
}

function persistFallbackStore() {
  const payload = JSON.stringify([...memory.values()]);
  const temporaryPath = `${fallbackStorePath}.tmp`;

  persistQueue = persistQueue.then(async () => {
    await mkdir(dirname(fallbackStorePath), { recursive: true });
    await writeFile(temporaryPath, payload);
    await rename(temporaryPath, fallbackStorePath);
  });

  return persistQueue;
}

mkdirSync(dirname(fallbackStorePath), { recursive: true });
