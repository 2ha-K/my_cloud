export interface MediaItem {
  id: string;
  kind: "photo" | "video";
  filename: string;
  format: string;
  width: number;
  height: number;
  size: number;
  capturedAt: string | null;
  modifiedAt: string;
  version: string;
  originalUri: string;
  thumbnailUri: string;
  duration?: number;
  codec?: string;
  audioCodec?: string | null;
}
export interface MediaList {
  items: MediaItem[];
  warnings: { filename: string; message: string }[];
}
