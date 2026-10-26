import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import type { MediaRepository } from "./MediaRepository";
import { DemoMediaRepository } from "./DemoMediaRepository";
import type { MediaItem, MediaList } from "../types/media";

const repository = new DemoMediaRepository(
  process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? "",
);
type State = {
  items: MediaItem[];
  warnings: MediaList["warnings"];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  repository: MediaRepository;
};
const Context = createContext<State | null>(null);
export function MediaRepositoryProvider({
  children,
  mediaRepository = repository,
}: {
  children: React.ReactNode;
  mediaRepository?: MediaRepository;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [warnings, setWarnings] = useState<MediaList["warnings"]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    setError(null);
    try {
      const result = await mediaRepository.listMedia({
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setItems(result.items);
        setWarnings(result.warnings);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "讀取失敗");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [mediaRepository]);
  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        items,
        warnings,
        loading,
        refreshing,
        error,
        refresh,
        repository: mediaRepository,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMedia() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing media provider");
  return value;
}
