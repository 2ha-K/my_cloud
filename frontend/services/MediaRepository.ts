import type { MediaItem, MediaList } from "../types/media";
export interface MediaRepository {
  listMedia(options?: { signal?: AbortSignal }): Promise<MediaList>;
  getMedia(id: string, options?: { signal?: AbortSignal }): Promise<MediaItem>;
}
