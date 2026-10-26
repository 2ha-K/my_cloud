import { useRef, useState, useCallback } from "react";
import {
  FlatList,
  Text,
  View,
  RefreshControl,
  useWindowDimensions,
  LayoutAnimation,
  AccessibilityInfo,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMedia } from "../services/MediaRepositoryProvider";
import { useTheme } from "../hooks/useTheme";
import {
  nextColumns,
  useGridColumns,
  type Columns,
} from "../hooks/useGridColumns";
import { MediaTile } from "./MediaTile";
import { GalleryState } from "./GalleryState";
import { IconButton } from "./IconButton";
import type { MediaItem } from "../types/media";

export function MediaGrid() {
  const { items, loading, refreshing, error, refresh, warnings } = useMedia();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { columns, setColumns } = useGridColumns();
  const [onlyVideo, setOnlyVideo] = useState(false);
  const [compact, setCompact] = useState(false);
  const list = useRef<FlatList<MediaItem>>(null);
  const first = useRef(0);
  const anchor = useRef(0);
  const restoring = useRef(false);
  const headerHeight = useRef(0);
  const scrollOffset = useRef(0);
  const restoreOffset = useRef(0);
  const data = onlyVideo ? items.filter((i) => i.kind === "video") : items;
  const size = (width - 4 - (columns - 1) * 2) / columns;
  const changeColumns = useCallback(
    async (next: Columns) => {
      if (next === columns) return;
      anchor.current = first.current;
      restoring.current = true;
      const nextSize = (width - 4 - (next - 1) * 2) / next;
      restoreOffset.current =
        scrollOffset.current < insets.top + 52 + headerHeight.current
          ? scrollOffset.current
          : insets.top +
            52 +
            headerHeight.current +
            Math.floor(anchor.current / next) * (nextSize + 2);
      if (!(await AccessibilityInfo.isReduceMotionEnabled()))
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setColumns(next);
    },
    [columns, setColumns, width, insets.top],
  );
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onEnd((e) => {
      void changeColumns(nextColumns(columns, e.scale));
    });
  const native = Gesture.Native();
  const photos = items.filter((i) => i.kind === "photo").length;
  const titleDate = data[0]
    ? new Date(data[0].capturedAt ?? data[0].modifiedAt).toLocaleDateString(
        "zh-TW",
        { year: "numeric", month: "long" },
      )
    : "你的每一刻，都在這裡";
  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <GestureDetector gesture={Gesture.Simultaneous(pinch, native)}>
        <FlatList
          key={columns}
          ref={list}
          data={data}
          numColumns={columns}
          keyExtractor={(i) => `${i.id}-${i.version}`}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 52,
            paddingBottom: insets.bottom + 114,
            paddingHorizontal: 2,
            flexGrow: 1,
          }}
          columnWrapperStyle={{ gap: 2 }}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          renderItem={({ item }) => (
            <MediaTile
              item={item}
              size={size}
              onPress={() =>
                router.push({
                  pathname: "/media/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          initialNumToRender={24}
          maxToRenderPerBatch={18}
          windowSize={7}
          onViewableItemsChanged={
            useRef(
              ({
                viewableItems,
              }: {
                viewableItems: { index?: number | null }[];
              }) => {
                const index = viewableItems.find(
                  (v) => v.index != null,
                )?.index;
                if (index != null) first.current = index;
              },
            ).current
          }
          onContentSizeChange={() => {
            if (restoring.current) {
              restoring.current = false;
              list.current?.scrollToOffset({
                offset: restoreOffset.current,
                animated: false,
              });
            }
          }}
          onScroll={(e) => {
            scrollOffset.current = e.nativeEvent.contentOffset.y;
            setCompact(e.nativeEvent.contentOffset.y > 74);
          }}
          scrollEventThrottle={64}
          refreshControl={
            <RefreshControl
              refreshing={refreshing && !loading}
              onRefresh={() => void refresh()}
              tintColor={t.secondary}
              progressViewOffset={insets.top + 52}
            />
          }
          ListHeaderComponent={
            <View
              onLayout={(e) => {
                headerHeight.current = e.nativeEvent.layout.height;
              }}
              style={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 25,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: 34,
                  lineHeight: 41,
                  fontWeight: "700",
                  letterSpacing: 0.2,
                  color: t.text,
                }}
              >
                圖庫
              </Text>
              <Text
                style={{
                  fontSize: 17,
                  lineHeight: 24,
                  color: t.secondary,
                  marginTop: 7,
                }}
              >
                {titleDate}
              </Text>
              {items.length > 0 && error && (
                <Text
                  onPress={() => void refresh()}
                  style={{ color: t.blue, marginTop: 14, fontSize: 14 }}
                >
                  連線中斷 · 點一下重試，仍可瀏覽已載入項目
                </Text>
              )}
              {warnings.length > 0 && (
                <Text
                  style={{ color: t.secondary, marginTop: 12, fontSize: 13 }}
                >
                  有 {warnings.length} 個檔案無法讀取，請檢查格式或影片工具。
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <GalleryState
              loading={loading}
              error={error}
              onRetry={() => void refresh()}
              filtered={onlyVideo}
            />
          }
          ListFooterComponent={
            data.length > 0 ? (
              <View style={{ alignItems: "center", padding: 28, gap: 7 }}>
                <Text style={{ fontSize: 14, color: t.secondary }}>
                  {photos.toLocaleString()} 張照片 ·{" "}
                  {(items.length - photos).toLocaleString()} 部影片
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: "#73A88A",
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: t.secondary,
                      letterSpacing: 1,
                    }}
                  >
                    本機測試圖庫
                  </Text>
                </View>
              </View>
            ) : undefined
          }
        />
      </GestureDetector>
      <BlurView
        intensity={75}
        tint={t.dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top,
          backgroundColor: t.glass,
          borderBottomWidth: compact ? 0.5 : 0,
          borderBottomColor: t.line,
        }}
      >
        <View
          style={{
            height: 52,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: t.secondary,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2.5,
            }}
          >
            MY CLOUD
          </Text>
          <Text
            style={{
              color: t.text,
              fontWeight: "600",
              fontSize: 17,
              opacity: compact ? 1 : 0,
            }}
          >
            圖庫
          </Text>
          <IconButton
            name="refresh-outline"
            label="重新整理圖庫"
            color={t.blue}
            onPress={() => void refresh()}
          />
        </View>
      </BlurView>
      <BlurView
        intensity={85}
        tint={t.dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: Math.max(insets.bottom, 14),
          paddingTop: 12,
          paddingHorizontal: 22,
          backgroundColor: t.glass,
          borderTopWidth: 0.5,
          borderTopColor: t.line,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <IconButton
              name={onlyVideo ? "videocam" : "images"}
              label={onlyVideo ? "顯示全部媒體" : "只顯示影片"}
              color={t.blue}
              selected={onlyVideo}
              onPress={() => {
                setOnlyVideo((v) => !v);
                first.current = 0;
                list.current?.scrollToOffset({ offset: 0, animated: false });
              }}
            />
            <View>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                {onlyVideo ? "影片" : "所有照片"}
              </Text>
              <Text style={{ color: t.secondary, fontSize: 11, marginTop: 3 }}>
                {data.length} 個項目
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: t.surface,
              borderRadius: 24,
            }}
          >
            <IconButton
              name="remove"
              label="縮小照片，增加欄數"
              color={columns === 5 ? t.secondary : t.blue}
              onPress={() => void changeColumns(nextColumns(columns, 0.7))}
            />
            <Text
              style={{
                fontSize: 12,
                color: t.secondary,
                width: 26,
                textAlign: "center",
              }}
            >
              {columns} 欄
            </Text>
            <IconButton
              name="add"
              label="放大照片，減少欄數"
              color={columns === 2 ? t.secondary : t.blue}
              onPress={() => void changeColumns(nextColumns(columns, 1.3))}
            />
          </View>
        </View>
      </BlurView>
    </View>
  );
}
