import { requireOptionalNativeModule } from "expo";

/**
 * Whether the installed app binary includes expo-blur. A dev build made before
 * expo-blur was added doesn't, and rendering its views would crash; callers
 * fall back to a plain translucent view until the dev build is rebuilt.
 */
export const hasNativeBlur = requireOptionalNativeModule("ExpoBlur") != null;
