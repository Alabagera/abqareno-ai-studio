import { supabase } from "@/integrations/supabase/client";
import { newProject, serialize, type Project } from "./types";

// Editor projects live in the database; a local backup survives sudden exits.
const localKey = (id: string) => `abq-editor-${id}`;

export async function listProjects() {
  const { data, error } = await supabase.from("editor_projects").select("id,title,export_path,thumb_path,duration_seconds,updated_at").order("updated_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}
export async function createProject(title = "مشروع فيديو جديد") {
  const { data, error } = await supabase.from("editor_projects").insert({ title, data: newProject() as never }).select("id").single();
  if (error) throw error;
  return data.id;
}
export async function loadProject(id: string) {
  const { data, error } = await supabase.from("editor_projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  let project = { ...newProject(), ...(data.data as unknown as Partial<Project>) } as Project;
  let title = data.title;
  try {
    const raw = localStorage.getItem(localKey(id));
    if (raw) {
      const b = JSON.parse(raw) as { savedAt: number; title: string; project: Project };
      if (b.savedAt > new Date(data.updated_at).getTime() + 1000) { project = { ...newProject(), ...b.project }; title = b.title; }
    }
  } catch { /* ignore bad backup */ }
  return { row: data, project, title };
}
export function backupLocal(id: string, title: string, p: Project) {
  try { localStorage.setItem(localKey(id), JSON.stringify({ savedAt: Date.now(), title, project: serialize(p) })); } catch { /* storage full */ }
}
export async function saveProject(id: string, title: string, p: Project, duration: number, extra: { export_path?: string; thumb_path?: string } = {}) {
  const { error } = await supabase.from("editor_projects").update({ title, data: serialize(p) as never, duration_seconds: duration, updated_at: new Date().toISOString(), ...extra }).eq("id", id);
  if (error) throw error;
}
export async function deleteProject(id: string) {
  const { error } = await supabase.from("editor_projects").delete().eq("id", id);
  if (error) throw error;
  localStorage.removeItem(localKey(id));
}
