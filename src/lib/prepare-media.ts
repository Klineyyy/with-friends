import { hasNativeImageManipulator, hasNativeVideo } from "./native";

/** Long edge of an uploaded photo. Enough for a full-width phone screen at 3x. */
const IMAGE_MAX_EDGE = 2048;
const IMAGE_QUALITY = 0.8;
/** Poster frames only fill the feed width, so they can be smaller. */
const POSTER_MAX_EDGE = 1080;

export type PreparedImage = { uri: string; width: number; height: number };

/**
 * Shrinks a photo so its long edge is at most 2048 px and re-encodes it as
 * JPEG (scope §6: compress images on device before upload). Photos that are
 * already small are only re-encoded. Returns the original if the native module
 * is missing or anything fails, so posting never breaks over this.
 */
export async function compressImage(uri: string, width: number, height: number): Promise<PreparedImage> {
  if (!hasNativeImageManipulator) return { uri, width, height };
  try {
    const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
    const context = ImageManipulator.manipulate(uri, {
      maxWidth: IMAGE_MAX_EDGE,
      maxHeight: IMAGE_MAX_EDGE,
    });
    const longEdge = Math.max(width, height);
    if (longEdge > IMAGE_MAX_EDGE) {
      context.resize(
        width >= height ? { width: IMAGE_MAX_EDGE, height: null } : { width: null, height: IMAGE_MAX_EDGE },
      );
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: IMAGE_QUALITY });
    context.release();
    image.release();
    return { uri: result.uri, width: result.width, height: result.height };
  } catch (error) {
    console.warn("compressImage failed, using the original", error);
    return { uri, width, height };
  }
}

/**
 * Grabs a frame near the start of a video and saves it as a JPEG, used as the
 * poster in the feed and the upload row (scope A13). Returns undefined if the
 * native modules are missing or the frame can't be read.
 */
export async function makeVideoPoster(uri: string): Promise<string | undefined> {
  if (!hasNativeVideo || !hasNativeImageManipulator) return undefined;
  const [{ createVideoPlayer }, { ImageManipulator, SaveFormat }] = await Promise.all([
    import("expo-video"),
    import("expo-image-manipulator"),
  ]);
  const player = createVideoPlayer(uri);
  try {
    // 0.5 s in skips the black first frame many phone videos start with.
    const [thumbnail] = await player.generateThumbnailsAsync([0.5], {
      maxWidth: POSTER_MAX_EDGE,
      maxHeight: POSTER_MAX_EDGE,
    });
    if (!thumbnail) return undefined;
    const context = ImageManipulator.manipulate(thumbnail);
    const image = await context.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: IMAGE_QUALITY });
    context.release();
    image.release();
    return result.uri;
  } catch (error) {
    console.warn("makeVideoPoster failed", error);
    return undefined;
  } finally {
    player.release();
  }
}
