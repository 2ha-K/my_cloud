import type { MediaRepository } from "./MediaRepository";
import type { MediaItem, MediaList } from "../types/media";

export function mapMedia(value: unknown, base: string): MediaItem {
  const row = value as Record<string, unknown>;
  if (
    !row ||
    !["photo", "video"].includes(String(row.kind)) ||
    typeof row.id !== "string" ||
    typeof row.filename !== "string" ||
    typeof row.version !== "string" ||
    typeof row.width !== "number" ||
    typeof row.height !== "number" ||
    typeof row.size !== "number" ||
    typeof row.format !== "string" ||
    typeof row.modifiedAt !== "string"
  )
    throw new Error("媒體資料格式不正確");
  const source = (input: unknown) => {
    if (
      typeof input !== "string" ||
      !input.startsWith("/media/") ||
      input.startsWith("//")
    )
      throw new Error("媒體來源格式不正確");
    const url = new URL(input, base);
    if (url.origin !== new URL(base).origin) throw new Error("媒體來源不正確");
    return url.toString();
  };
  return {
    id: row.id,
    kind: row.kind as MediaItem["kind"],
    filename: row.filename,
    version: row.version,
    width: row.width,
    height: row.height,
    size: row.size,
    format: row.format,
    modifiedAt: row.modifiedAt,
    capturedAt: typeof row.capturedAt === "string" ? row.capturedAt : null,
    originalUri: source(row.originalPath),
    thumbnailUri: source(row.thumbnailPath),
    duration: typeof row.duration === "number" ? row.duration : undefined,
    codec: typeof row.codec === "string" ? row.codec : undefined,
    audioCodec: typeof row.audioCodec === "string" ? row.audioCodec : null,
  };
}
export class DemoMediaRepository implements MediaRepository {
  constructor(private readonly baseUrl: string) {}
  private async request(route: string, signal?: AbortSignal) {
    if (!this.baseUrl)
      throw new Error(
        "請在 frontend/.env 設定 EXPO_PUBLIC_MEDIA_BASE_URL，然後重新啟動 Expo。",
      );
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 60000);
    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}${route}`,
        { signal: controller.signal, headers: { Accept: "application/json" } },
      );
      if (!response.ok)
        throw new Error(
          response.status === 404
            ? "媒體已移除，請重新整理圖庫"
            : `伺服器回應 ${response.status}，請重試`,
        );
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof Error && error.message.startsWith("伺服器"))
        throw error;
      if (error instanceof Error && error.message.startsWith("媒體已"))
        throw error;
      throw new Error(
        "無法連線到媒體伺服器。請確認伺服器已啟動、IP 正確，且手機與電腦在同一個區域網路。",
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  async listMedia(options?: { signal?: AbortSignal }): Promise<MediaList> {
    const data = await this.request("/media", options?.signal);
    if (!Array.isArray(data.items)) throw new Error("媒體清單格式不正確");
    return {
      items: data.items.map((item: unknown) => mapMedia(item, this.baseUrl)),
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
    };
  }
  async getMedia(id: string, options?: { signal?: AbortSignal }) {
    return mapMedia(
      await this.request(`/media/${encodeURIComponent(id)}`, options?.signal),
      this.baseUrl,
    );
  }
}
