import { useState, useRef, useEffect } from "react";
import {
  FlatList,
  Text,
  View,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMedia } from "../services/MediaRepositoryProvider";
import { ZoomablePhoto } from "./ZoomablePhoto";
import { VideoPlayer } from "./VideoPlayer";
import { IconButton } from "./IconButton";
import { MediaDetails } from "./MediaDetails";
import type { MediaItem } from "../types/media";
export function MediaViewer({ id }: { id: string }) {
  const { items, loading } = useMedia();
  const router = useRouter(),
    insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Snapshot the order for a stable viewing session while the library refreshes.
  const [session, setSession] = useState(() => items);
  useEffect(() => {
    if (!session.length && items.length) setSession(items);
  }, [items, session.length]);
  const initial = Math.max(
    0,
    session.findIndex((i) => i.id === id),
  );
  const [index, setIndex] = useState(initial);
  const [controls, setControls] = useState(true),
    [details, setDetails] = useState(false),
    [zoomed, setZoomed] = useState(false),
    [scrubbing, setScrubbing] = useState(false),
    [paging, setPaging] = useState(false);
  const list = useRef<FlatList<MediaItem>>(null);
  const item = session[index];
  useEffect(() => {
    if (session.length) {
      const next = Math.max(
        0,
        session.findIndex((i) => i.id === id),
      );
      setIndex(next);
    }
  }, [id, session.length]);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: index * width, animated: false });
  }, [width]);
  const change = (next: number) => {
    if (next === index) return;
    setIndex(next);
    setZoomed(false);
    setScrubbing(false);
    setControls(true);
    setDetails(false);
  };
  const move = (step: number) => {
    const next = Math.max(0, Math.min(session.length - 1, index + step));
    change(next);
    list.current?.scrollToOffset({ offset: next * width, animated: true });
  };
  if (!item || !session.some((i) => i.id === id))
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff" }}>
            找不到這個媒體，請返回圖庫重新整理。
          </Text>
        )}
        <IconButton
          name="chevron-back"
          label="返回圖庫"
          onPress={() => router.back()}
        />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" hidden={!controls} />
      <FlatList
        key={session.length}
        ref={list}
        horizontal
        pagingEnabled
        data={session}
        keyExtractor={(i) => i.id}
        initialScrollIndex={initial}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!zoomed && !scrubbing && !details}
        extraData={{ index, controls, details, paging }}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        onScrollBeginDrag={() => setPaging(true)}
        onScrollEndDrag={() => setPaging(false)}
        onMomentumScrollEnd={(e) => {
          change(Math.round(e.nativeEvent.contentOffset.x / width));
          setPaging(false);
        }}
        renderItem={({ item: media, index: i }) =>
          media.kind === "photo" ? (
            <ZoomablePhoto
              item={media}
              width={width}
              height={height}
              active={i === index}
              onToggle={() => setControls((v) => !v)}
              onZoom={(value) => {
                if (i === index) setZoomed(value);
              }}
            />
          ) : i === index ? (
            <VideoPlayer
              key={`${media.id}-${media.version}`}
              item={media}
              width={width}
              height={height}
              controls={controls}
              onToggle={() => setControls((v) => !v)}
              onScrub={setScrubbing}
              paused={details || paging}
            />
          ) : (
            <Image
              source={media.thumbnailUri}
              style={{ width, height }}
              contentFit="contain"
            />
          )
        }
      />
      {controls && (
        <>
          <BlurView
            tint="systemChromeMaterialDark"
            intensity={55}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              paddingTop: insets.top,
              backgroundColor: "rgba(0,0,0,0.22)",
            }}
          >
            <View
              style={{
                height: 60,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
              }}
            >
              <IconButton
                name="chevron-back"
                label="返回圖庫"
                onPress={() => router.back()}
              />
              <View
                style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
                >
                  {item.capturedAt
                    ? new Date(item.capturedAt).toLocaleDateString("zh-TW", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : item.filename}
                </Text>
                <Text style={{ color: "#bbb", fontSize: 11, marginTop: 5 }}>
                  {item.kind === "video" ? "影片" : "照片"} · {index + 1} /{" "}
                  {session.length}
                </Text>
              </View>
              <IconButton
                name="information-circle-outline"
                label="查看詳細資料"
                onPress={() => setDetails(true)}
              />
            </View>
          </BlurView>
          <BlurView
            tint="systemChromeMaterialDark"
            intensity={55}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: Math.max(insets.bottom, 12),
              paddingTop: 10,
              backgroundColor: "rgba(0,0,0,0.22)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 26,
              }}
            >
              <IconButton
                name="chevron-back"
                label="上一個媒體"
                onPress={() => move(-1)}
              />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: "#ddd", fontSize: 12, maxWidth: "90%" }}
                >
                  {item.filename}
                </Text>
                <Text style={{ color: "#888", fontSize: 10, marginTop: 4 }}>
                  {item.width} × {item.height} · {item.format.toUpperCase()}
                </Text>
              </View>
              <IconButton
                name="chevron-forward"
                label="下一個媒體"
                onPress={() => move(1)}
              />
            </View>
          </BlurView>
        </>
      )}
      <MediaDetails
        item={item}
        visible={details}
        onClose={() => setDetails(false)}
      />
    </View>
  );
}
