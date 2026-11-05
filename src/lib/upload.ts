/**
 * Sends a local file (photo, video, poster) to a Convex upload URL and returns
 * its storage ID. Uses XMLHttpRequest because `fetch` can't report upload
 * progress. Throws on network errors and non-2xx answers.
 */
export async function uploadFile(
  uploadUrl: string,
  uri: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const contentType = blob.type || guessType(uri);
  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`Upload failed (${xhr.status})`));
      try {
        resolve((JSON.parse(xhr.responseText) as { storageId: string }).storageId);
      } catch {
        reject(new Error("Upload failed (bad response)"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed (network)"));
    xhr.send(blob);
  });
}

function guessType(uri: string): string {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "3gp":
      return "video/3gpp";
    case "webm":
      return "video/webm";
    default:
      return "image/jpeg";
  }
}
