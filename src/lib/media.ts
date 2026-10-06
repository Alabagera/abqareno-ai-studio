import { supabase } from "@/integrations/supabase/client";

export type MediaKind = "image" | "video" | "audio" | "document";

export const KIND_META: Record<MediaKind, { label: string; accept: string }> = {
  image: { label: "صور", accept: "image/*" },
  video: { label: "فيديوهات", accept: "video/*" },
  audio: { label: "صوتيات", accept: "audio/*" },
  document: { label: "مستندات", accept: ".pdf,.doc,.docx,.txt,.srt,.vtt,.ppt,.pptx,.xls,.xlsx" },
};

export function detectKind(file: File): MediaKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export async function uploadMedia(file: File, kind: MediaKind = detectKind(file)) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("يجب تسجيل الدخول");
  const ext = file.name.split(".").pop() || "bin";
  const path = `${u.user.id}/${kind}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from("media_assets")
    .insert({ kind, name: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function signedUrl(path: string) {
  const { data } = await supabase.storage.from("media").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function deleteMedia(id: string, path: string) {
  await supabase.storage.from("media").remove([path]);
  await supabase.from("media_assets").delete().eq("id", id);
}

export function formatSize(b?: number | null) {
  if (!b) return "";
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} ك.ب`;
  return `${(b / 1024 / 1024).toFixed(1)} م.ب`;
}
