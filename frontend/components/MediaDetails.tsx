import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/useTheme";
import { IconButton } from "./IconButton";
import { durationLabel } from "./MediaTile";
import type { MediaItem } from "../types/media";
export function MediaDetails({
  item,
  visible,
  onClose,
}: {
  item: MediaItem;
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme(),
    insets = useSafeAreaInsets();
  const rows = [
    ["檔案名稱", item.filename],
    [
      "尺寸",
      `${item.width.toLocaleString()} × ${item.height.toLocaleString()}`,
    ],
    ["檔案大小", `${(item.size / 1024 / 1024).toFixed(2)} MB`],
    ["格式", item.format.toUpperCase()],
    [
      "拍攝日期",
      item.capturedAt
        ? new Date(item.capturedAt).toLocaleString("zh-TW")
        : "無拍攝日期",
    ],
    ["檔案修改時間", new Date(item.modifiedAt).toLocaleString("zh-TW")],
    ...(item.kind === "video"
      ? [
          ["片長", durationLabel(item.duration)],
          ["影片編碼", item.codec ?? "未知"],
          ["音訊編碼", item.audioCodec ?? "無音軌"],
        ]
      : []),
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
      >
        <Pressable
          accessibilityLabel="關閉詳細資料"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            maxHeight: "80%",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: t.surface,
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 10 }}>
            <View
              style={{
                width: 36,
                height: 5,
                borderRadius: 3,
                backgroundColor: t.secondary,
                opacity: 0.4,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "700", color: t.text }}>
              詳細資料
            </Text>
            <IconButton
              name="close"
              label="關閉詳細資料"
              color={t.secondary}
              onPress={onClose}
            />
          </View>
          <ScrollView>
            {rows.map(([label, value]) => (
              <View
                key={label}
                style={{
                  paddingVertical: 13,
                  borderTopWidth: 0.5,
                  borderColor: t.line,
                  flexDirection: "row",
                  gap: 16,
                }}
              >
                <Text style={{ fontSize: 14, color: t.secondary, width: 90 }}>
                  {label}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    color: t.text,
                    flex: 1,
                    lineHeight: 21,
                  }}
                >
                  {value}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
