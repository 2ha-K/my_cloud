import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { MediaItem } from "../types/media";
export function ZoomablePhoto({
  item,
  width,
  height,
  active,
  onToggle,
  onZoom,
}: {
  item: MediaItem;
  width: number;
  height: number;
  active: boolean;
  onToggle: () => void;
  onZoom: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1),
    startScale = useSharedValue(1),
    x = useSharedValue(0),
    y = useSharedValue(0),
    startX = useSharedValue(0),
    startY = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false),
    [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const ratio = Math.min(width / item.width, height / item.height);
  const imageWidth = item.width * ratio,
    imageHeight = item.height * ratio;
  const updateZoom = (value: boolean) => {
    setZoomed(value);
    onZoom(value);
  };
  const reset = () => {
    scale.value = withTiming(1);
    x.value = withTiming(0);
    y.value = withTiming(0);
    updateZoom(false);
  };
  useEffect(() => {
    if (!active) {
      scale.value = 1;
      x.value = 0;
      y.value = 0;
      setZoomed(false);
    }
  }, [active]);
  useEffect(() => {
    reset();
  }, [width, height]);
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      startScale.value = scale.value;
      onZoom(true);
    })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(5, startScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < 1.04) reset();
      else {
        const maxX = Math.max(0, (imageWidth * scale.value - width) / 2),
          maxY = Math.max(0, (imageHeight * scale.value - height) / 2);
        x.value = withTiming(Math.max(-maxX, Math.min(maxX, x.value)));
        y.value = withTiming(Math.max(-maxY, Math.min(maxY, y.value)));
        updateZoom(true);
      }
    });
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .runOnJS(true)
    .maxPointers(1)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      const maxX = Math.max(0, (imageWidth * scale.value - width) / 2),
        maxY = Math.max(0, (imageHeight * scale.value - height) / 2);
      x.value = Math.max(-maxX, Math.min(maxX, startX.value + e.translationX));
      y.value = Math.max(-maxY, Math.min(maxY, startY.value + e.translationY));
    });
  const double = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => {
      if (zoomed) reset();
      else {
        scale.value = withTiming(2.5);
        updateZoom(true);
      }
    });
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => onToggle());
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));
  return (
    <View
      style={{
        width,
        height,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GestureDetector
        gesture={Gesture.Simultaneous(
          pinch,
          pan,
          Gesture.Exclusive(double, tap),
        )}
      >
        <Animated.View
          style={[
            { width, height, alignItems: "center", justifyContent: "center" },
            style,
          ]}
        >
          <Image
            key={attempt}
            source={item.originalUri}
            placeholder={{ uri: item.thumbnailUri }}
            placeholderContentFit="contain"
            contentFit="contain"
            style={{ width: imageWidth, height: imageHeight }}
            cachePolicy="memory-disk"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            accessibilityLabel={item.filename}
          />
        </Animated.View>
      </GestureDetector>
      {!loaded && !failed && (
        <ActivityIndicator color="#fff" style={{ position: "absolute" }} />
      )}
      {failed && (
        <View
          style={{
            position: "absolute",
            padding: 24,
            backgroundColor: "rgba(0,0,0,0.8)",
            borderRadius: 18,
            alignItems: "center",
            gap: 14,
          }}
        >
          <Text style={{ color: "#fff" }}>照片載入失敗</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFailed(false);
              setAttempt((v) => v + 1);
            }}
          >
            <Text style={{ color: "#64A9FF", padding: 12 }}>重試</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
