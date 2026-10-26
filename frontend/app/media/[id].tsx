import { useLocalSearchParams } from "expo-router";
import { MediaViewer } from "../../components/MediaViewer";
export default function Viewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MediaViewer id={id} />;
}
