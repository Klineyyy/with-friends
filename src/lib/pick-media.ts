import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ActionSheetIOS, Alert, Linking, Platform } from "react-native";

import { POST_LIMITS } from "./format";

/**
 * Create-post step 1 (board 6.1). Instead of the in-app gallery grid we use
 * the system photo picker (no broad media permission, design.md §6.5) and the
 * system camera for 6.1's Camera tile. Opens the composer (6.2) with the result.
 */
export function pickPostMedia() {
  const options = ["Take photo", "Record video", "Choose from library"] as const;
  const run = (choice: (typeof options)[number]) => {
    if (choice === "Take photo") void fromCamera("images");
    else if (choice === "Record video") void fromCamera("videos");
    else void fromLibrary();
  };

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: "New post", options: [...options, "Cancel"], cancelButtonIndex: options.length },
      (index) => {
        if (index < options.length) run(options[index]);
      },
    );
    return;
  }
  // Android alerts take at most three buttons; tapping outside cancels.
  Alert.alert(
    "New post",
    undefined,
    options.map((label) => ({ text: label, onPress: () => run(label) })),
    { cancelable: true },
  );
}

async function fromLibrary() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    quality: 0.8,
  });
  openComposer(result);
}

async function fromCamera(mediaTypes: "images" | "videos") {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Camera is off",
      "To take photos and videos for With Friends, allow camera access in Settings.",
      permission.canAskAgain
        ? [{ text: "OK" }]
        : [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => void Linking.openSettings() },
          ],
    );
    return;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes,
    quality: 0.8,
    // The camera stops at 30 s where the camera app supports it (most do).
    videoMaxDuration: POST_LIMITS.videoMaxMs / 1000,
  });
  openComposer(result);
}

function openComposer(result: ImagePicker.ImagePickerResult) {
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
