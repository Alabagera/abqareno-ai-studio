/** Browser-only conversion: imported on demand after a user starts an export. */
export async function phoneMp4(blob: Blob, onProgress: (value: number) => void) {
  const { Input, BlobSource, ALL_FORMATS, Output, Mp4OutputFormat, BufferTarget, Conversion, canEncodeAudio } = await import("mediabunny");
  if (!(await canEncodeAudio("aac"))) {
    const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
    registerAacEncoder();
  }
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  try {
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const conversion = await Conversion.init({ input, output, video: { codec: "avc" }, audio: { codec: "aac", bitrate: 192000 } });
    if (!conversion.isValid || conversion.discardedTracks.length) {
      const { softwareMp4 } = await import("./phone-export-fallback");
      return softwareMp4(blob, onProgress);
    }
    conversion.onProgress = (progress) => onProgress(progress);
    await conversion.execute();
    if (!target.buffer) throw new Error("لم ينتج ملف الفيديو");
    return new Blob([target.buffer], { type: "video/mp4" });
  } finally { input.dispose(); }
}