import { useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./IconButton";
import { durationLabel } from "./MediaTile";
import type { MediaItem } from "../types/media";
export function VideoPlayer({
  item,
  width,
  height,
  controls,
  onToggle,
  onScrub,
  paused,
}: {
  item: MediaItem;
  width: number;
  height: number;
  controls: boolean;
  onToggle: () => void;
  onScrub: (value: boolean) => void;
  paused: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [retry, setRetry] = useState(0);
  const player = useVideoPlayer(
    { uri: item.originalUri, contentType: "progressive" },
    (p) => {
      p.muted = true;
      p.loop = false;
      p.timeUpdateEventInterval = 0.25;
    },
  );
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
    error: undefined,
  });
  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: 0,
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
  });
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (s) => {
      if (s !== "active") player.pause();
    });
    return () => subscription.remove();
  }, [player]);
  useEffect(() => () => onScrub(false), []);
  const duration = player.duration || item.duration || 0;
  return (
    <View style={{ width, height, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={{ width, height }}
        nativeControls={false}
        contentFit="contain"
        allowsPictureInPicture={false}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="顯示或隱藏影片控制列"
        onPress={onToggle}
        style={{ position: "absolute", inset: 0 }}
      />
      {status === "loading" && (
        <ActivityIndicator
          color="#fff"
          size="large"
          style={{
            position: "absolute",
            top: height / 2,
            left: width / 2 - 12,
          }}
        />
      )}
      {status === "error" && (
        <View
          style={{
            position: "absolute",
            top: height * 0.35,
            left: 28,
            right: 28,
            padding: 24,
            borderRadius: 20,
            backgroundColor: "#1C1C1E",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
            無法播放這部影片
          </Text>
          <Text
            style={{
              color: "#aaa",
              fontSize: 14,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            請確認網路連線與影片編碼。建議使用 H.264／AAC 的 MP4 或 MOV。
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRetry(retry + 1);
              void player
                .replaceAsync({
                  uri: item.originalUri,
                  contentType: "progressive",
                })
                .then(() => player.play())
                .catch(() => {});
            }}
          >
            <Text style={{ color: "#64A9FF", padding: 12 }}>重新載入</Text>
          </Pressable>
        </View>
      )}
      {controls && (
        <BlurView
          intensity={55}
          tint="systemChromeMaterialDark"
          style={{
            position: "absolute",
            bottom: insets.bottom + 77,
            left: 16,
            right: 16,
            borderRadius: 22,
            overflow: "hidden",
            padding: 12,
            backgroundColor: "rgba(25,25,28,0.55)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <IconButton
              name={isPlaying ? "pause" : "play"}
              label={isPlaying ? "暫停" : "播放"}
              onPress={() => {
                if (isPlaying) player.pause();
                else {
                  if (duration && player.currentTime >= duration - 0.2)
                    player.currentTime = 0;
                  player.play();
                }
              }}
            />
            <Text
              style={{
                color: "#ddd",
                fontSize: 12,
                fontVariant: ["tabular-nums"],
              }}
            >
              {durationLabel(seeking ? seekTime : currentTime)} /{" "}
              {durationLabel(duration)}
            </Text>
            <IconButton
              name={muted ? "volume-mute" : "volume-high"}
              label={muted ? "開啟聲音" : "靜音"}
              onPress={() => {
                player.muted = !muted;
                setMuted(!muted);
              }}
            />
          </View>
          <Slider
            accessibilityLabel="影片播放進度"
            style={{ height: 38 }}
            minimumValue={0}
            maximumValue={Math.max(duration, 0.01)}
            value={seeking ? seekTime : currentTime}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="#68686d"
            thumbTintColor="#fff"
            onSlidingStart={(v) => {
              setSeekTime(v);
              setSeeking(true);
              onScrub(true);
              player.pause();
            }}
            onValueChange={setSeekTime}
            onSlidingComplete={(v) => {
              player.currentTime = v;
              setSeeking(false);
              onScrub(false);
              if (!paused) player.play();
            }}
          />
        </BlurView>
      )}
    </View>
  );
}
