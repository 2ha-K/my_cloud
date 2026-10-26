import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
export function IconButton({
  name,
  label,
  onPress,
  color = "#fff",
  selected = false,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <Ionicons name={name} size={25} color={color} />
    </Pressable>
  );
}
