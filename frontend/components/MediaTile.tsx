import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import type { MediaItem } from "../types/media";
import { useTheme } from "../hooks/useTheme";
export function durationLabel(seconds = 0) {
  const n = Math.floor(seconds);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
export function MediaTile({
  item,
  size,
  onPress,
}: {
  item: MediaItem;
  size: number;
  onPress: () => void;
}) {
  const t = useTheme();
  const [failed, setFailed] = useState(false);
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.kind === "video" ? "影片" : "照片"}，${item.filename}`}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(reduced ? 1 : 0.95, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: 4,
            overflow: "hidden",
            backgroundColor: t.surface,
          },
          style,
        ]}
      >
        <Image
          source={item.thumbnailUri}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={`${item.id}-${item.version}`}
          transition={reduced ? 0 : 160}
          onError={() => setFailed(true)}
        />
        {failed && (
          <View
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="image-outline" size={24} color={t.secondary} />
          </View>
        )}
        {item.kind === "video" && (
          <View
            style={{
              position: "absolute",
              bottom: 5,
              left: 5,
              right: 5,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="videocam"
              color="#fff"
              size={13}
              style={{ textShadowColor: "#000", textShadowRadius: 3 }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#fff",
                textShadowColor: "#000",
                textShadowRadius: 4,
              }}
            >
              {durationLabel(item.duration)}
            </Text>
          </View>
        )}
        {item.format === "gif" && (
          <Text
            style={{
              position: "absolute",
              bottom: 5,
              left: 6,
              color: "#fff",
              fontSize: 10,
              fontWeight: "700",
              textShadowColor: "#000",
              textShadowRadius: 3,
            }}
          >
            GIF
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
