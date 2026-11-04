import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

/**
 * Create-post step 1 (board 6.1) uses the system photo picker instead of an
 * in-app gallery grid: no broad media permission needed (design.md §6.5).
 * Opens the composer (6.2) with what was picked.
 */
export async function pickPostMedia() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    quality: 0.8,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  router.push({
    pathname: "/new-post",
    params: {
      uri: asset.uri,
      type: asset.type === "video" ? "video" : "image",
      width: String(asset.width),
      height: String(asset.height),
      durationMs: asset.duration ? String(Math.round(asset.duration)) : "",
      fileSize: asset.fileSize ? String(asset.fileSize) : "",
    },
  });
}
