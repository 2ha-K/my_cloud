import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
export function GalleryState({
  loading,
  error,
  onRetry,
  filtered = false,
}: {
  loading?: boolean;
  error?: string | null;
  onRetry: () => void;
  filtered?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        minHeight: 360,
        padding: 36,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      {loading ? (
        <ActivityIndicator size="large" color={t.secondary} />
      ) : (
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 22,
            backgroundColor: t.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={
              error
                ? "cloud-offline-outline"
                : filtered
                  ? "videocam-outline"
                  : "images-outline"
            }
            size={34}
            color={t.secondary}
          />
        </View>
      )}
      <Text
        style={{
          fontSize: 22,
          fontWeight: "600",
          color: t.text,
          textAlign: "center",
        }}
      >
        {loading
          ? "正在整理圖庫"
          : error
            ? "暫時無法連線"
            : filtered
              ? "還沒有影片"
              : "讓回憶住進來"}
      </Text>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 23,
          color: t.secondary,
          textAlign: "center",
        }}
      >
        {loading
          ? "第一次讀取大型媒體可能需要一些時間。"
          : (error ??
            (filtered
              ? "加入 MP4 或 MOV 影片後重新整理。"
              : "將照片或影片放進 demo-server/test，\n再下拉重新整理。"))}
      </Text>
      {!loading && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={{
            paddingHorizontal: 24,
            paddingVertical: 13,
            borderRadius: 22,
            backgroundColor: t.surface,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: t.blue }}>
            {error ? "重新連線" : "重新整理"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
