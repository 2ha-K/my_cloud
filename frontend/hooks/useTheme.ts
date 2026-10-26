import { useColorScheme } from "react-native";
export function useTheme() {
  const dark = useColorScheme() === "dark";
  return {
    dark,
    background: dark ? "#000000" : "#FFFFFF",
    surface: dark ? "#1C1C1E" : "#F2F2F7",
    text: dark ? "#F5F5F7" : "#151517",
    secondary: dark ? "#A1A1A6" : "#737378",
    line: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    blue: dark ? "#64A9FF" : "#007AFF",
    glass: dark ? "rgba(20,20,22,0.62)" : "rgba(255,255,255,0.64)",
  };
}
