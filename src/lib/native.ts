import { requireOptionalNativeModule } from "expo";

/**
 * Whether the installed app binary includes expo-blur. A dev build made before
 * expo-blur was added doesn't, and rendering its views would crash; callers
 * fall back to a plain translucent view until the dev build is rebuilt.
 */
export const hasNativeBlur = requireOptionalNativeModule("ExpoBlur") != null;

/**
 * expo-image-manipulator (resize photos before upload) and expo-video (poster
 * frames for your own videos). Both load their native module on import, so
 * they're only imported when the binary has them. Without them, photos upload
 * as picked and videos show a dark tile until the dev build is rebuilt.
 */
export const hasNativeImageManipulator = requireOptionalNativeModule("ExpoImageManipulator") != null;
export const hasNativeVideo = requireOptionalNativeModule("ExpoVideo") != null;
