import workerUrl from "@ffmpeg/ffmpeg/worker?worker&url";
import coreUrl from "@ffmpeg/core?url";
import wasmUrl from "@ffmpeg/core/wasm?url";

/** Small local jobs only; never runs in a server function or SSR. */
export async function softwareMp4(blob: Blob, onProgress: (n: number) => void) {
  if (blob.size > 30 * 1024 * 1024) throw new Error("هذا الجهاز لا يدعم MP4 المباشر والملف كبير للتحويل المحلي؛ استخدم جهازًا أحدث أو حوّله على سيرفرك.");
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const engine = new FFmpeg();
  try {
    engine.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))));
    await engine.load({ classWorkerURL: workerUrl, coreURL: coreUrl, wasmURL: wasmUrl });
    await engine.writeFile("input", new Uint8Array(await blob.arrayBuffer()));
    const code = await engine.exec(["-i", "input", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "output.mp4"]);
    if (code !== 0) throw new Error("تعذر تحويل الفيديو محليًا؛ جرّب جودة أقل أو جهازًا أحدث.");
    const data = await engine.readFile("output.mp4");
    if (typeof data === "string") throw new Error("ملف فيديو غير صالح");
    return new Blob([new Uint8Array(data)], { type: "video/mp4" });
  } finally { engine.terminate(); }
}