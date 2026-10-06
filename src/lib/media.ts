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
  if (file.size > 20 * 1024 * 1024) throw new Error("الحد الأقصى للملف 20 ميجابايت");
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("يجب تسجيل الدخول");
  const { data: ownerId, error: ownerError } = await supabase.rpc("workspace_owner_id", { _user_id: u.user.id });
  if (ownerError || !ownerId) throw ownerError ?? new Error("تعذر تحديد مساحة العمل");
  const ext = file.name.split(".").pop() || "bin";
  const path = `${ownerId}/${kind}/${crypto.randomUUID()}.${ext}`;
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
  const removed = await supabase.storage.from("media").remove([path]);
  if (removed.error) throw removed.error;
  const deleted = await supabase.from("media_assets").delete().eq("id", id);
  if (deleted.error) throw deleted.error;
}

export async function downloadMedia(path: string, filename: string) {
  const url = await signedUrl(path);
  if (!url) throw new Error("تعذر تجهيز رابط التنزيل");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.click();
}

export function formatSize(b?: number | null) {
  if (!b) return "";
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} ك.ب`;
  return `${(b / 1024 / 1024).toFixed(1)} م.ب`;
}
