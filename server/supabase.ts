import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const signedUrlExpiresInSeconds = 60 * 60;

let adminClient: SupabaseClient | null | undefined;

export type StorageUploadResult = {
  storagePath: string;
  imageUrl: string;
};

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin() {
  if (adminClient !== undefined) return adminClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    adminClient = null;
    return adminClient;
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return adminClient;
}

export async function getUserIdFromAuthHeader(authHeader: string | undefined) {
  if (!isSupabaseConfigured()) return "local-dev-user";

  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("请先完成匿名登录");

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase 服务端配置不完整");

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("登录状态已失效，请刷新页面后重试");
  return data.user.id;
}

export async function uploadImageToStorage(params: { userId: string; imageId: string; imageDataUrl: string }): Promise<StorageUploadResult | null> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const supabase = getSupabaseAdmin();
  if (!bucket || !supabase) return null;

  const parsed = parseImageDataUrl(params.imageDataUrl);
  const extension = extensionForMimeType(parsed.contentType);
  const storagePath = `${params.userId}/${params.imageId}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(storagePath, parsed.buffer, {
    contentType: parsed.contentType,
    upsert: false
  });
  if (error) throw new Error(`图片上传到 Supabase Storage 失败：${error.message}`);

  const imageUrl = await createSignedImageUrl(storagePath);
  return { storagePath, imageUrl };
}

export async function createSignedImageUrl(storagePath: string | null | undefined) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const supabase = getSupabaseAdmin();
  if (!bucket || !supabase || !storagePath) return "";

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, signedUrlExpiresInSeconds);
  if (error) throw new Error(`图片签名链接生成失败：${error.message}`);
  return data.signedUrl;
}

export async function createSignedImageUrls(storagePaths: string[]) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const supabase = getSupabaseAdmin();
  if (!bucket || !supabase || !storagePaths.length) return {};

  const uniquePaths = [...new Set(storagePaths)];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(uniquePaths, signedUrlExpiresInSeconds);
  if (error) throw new Error(`图片签名链接批量生成失败：${error.message}`);
  return Object.fromEntries(
    (data || []).flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl]] : []))
  ) as Record<string, string>;
}

function parseImageDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("图片格式不是有效的 data URL");
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function extensionForMimeType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/svg+xml") return "svg";
  return "jpg";
}
