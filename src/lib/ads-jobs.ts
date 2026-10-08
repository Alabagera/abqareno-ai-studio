import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/media";

// Browser-session job store: ad generation keeps running while the user moves
// between app pages (not after closing the tab). Results persist locally.
export type AdKind = "text" | "image" | "video";
export type AdAsset = { kind: "image" | "video"; url: string; path: string; name: string };
export type AdParams = { idea: string; modelId: string; width: number; height: number; duration: number; workflow?: Record<string, unknown> | undefined; revision?: string | undefined };
export type ChatMsg = { role: "user" | "assistant"; text: string };
type Status = "idle" | "running" | "done" | "error";
export type AdState = {
  text: string; image: AdAsset | null; video: AdAsset | null; idea: string;
  status: Record<AdKind, Status>; progress: Record<AdKind, string>; error: Record<AdKind, string>; chat: ChatMsg[];
};
const kinds: AdKind[] = ["text", "image", "video"];
const blank = <T,>(v: T) => ({ text: v, image: v, video: v });
let state: AdState = { text: "", image: null, video: null, idea: "", status: blank<Status>("idle"), progress: blank(""), error: blank(""), chat: [] };
const listeners = new Set<() => void>();
const ctrls: Partial<Record<AdKind, AbortController>> = {};
let userId: string | null = null; let loaded = false;
const key = () => `abq-ads-draft-${userId}`;

function set(patch: Partial<AdState>) {
  state = { ...state, ...patch }; listeners.forEach((l) => l());
  if (userId && loaded) try { localStorage.setItem(key(), JSON.stringify({ idea: state.idea, text: state.text, chat: state.chat.slice(-40), image: state.image && { ...state.image, url: "" }, video: state.video && { ...state.video, url: "" } })); } catch { /* storage full */ }
}
const setK = (field: "status" | "progress" | "error", kind: AdKind, v: string) => set({ [field]: { ...state[field], [kind]: v } } as Partial<AdState>);

export const adsStore = {
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  get: () => state,
  setIdea: (idea: string) => set({ idea }),
  setText: (text: string) => set({ text }),
  async init() {
    const user = (await supabase.auth.getUser()).data.user; if (!user) return;
    if (userId === user.id && loaded) return;
    userId = user.id; loaded = false;
    try {
      const saved = JSON.parse(localStorage.getItem(key()) ?? "null") as Partial<AdState> | null;
      if (saved) {
        state = { ...state, idea: saved.idea ?? "", text: saved.text ?? "", chat: saved.chat ?? [] };
        for (const k of ["image", "video"] as const) { const a = saved[k]; if (a?.path) { const url = await signedUrl(a.path); if (url) state = { ...state, [k]: { ...a, url } }; } }
      }
    } catch { /* malformed draft */ }
    loaded = true; set({});
  },
  running: () => kinds.some((k) => state.status[k] === "running"),
  stop(kind?: AdKind) { for (const k of kind ? [kind] : kinds) ctrls[k]?.abort(); },
  async run(kind: AdKind, p: AdParams, quiet = false) {
    if (state.status[kind] === "running") return false;
    const ctrl = new AbortController(); ctrls[kind] = ctrl;
    setK("status", kind, "running"); setK("error", kind, ""); setK("progress", kind, "جارٍ الاتصال بسيرفرك…");
    const previous = state.text;
    if (kind === "text") set({ text: "" });
    let ok = false;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch("/api/ads", { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` }, body: JSON.stringify({ action: kind, ...p, ...(p.revision && kind === "text" ? { previous } : {}) }) });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buffer = ""; let done = false;
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        buffer += dec.decode(chunk.value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const ev = JSON.parse(line.slice(5)) as { type: string; text?: string; message?: string } & AdAsset;
          if (ev.type === "text") set({ text: state.text + (ev.text ?? "") });
          else if (ev.type === "progress") setK("progress", kind, ev.text ?? "");
          else if (ev.type === "asset") set(ev.kind === "image" ? { image: ev } : { video: ev });
          else if (ev.type === "error") throw new Error(ev.message);
          else if (ev.type === "done") done = true;
        }
      }
      if (!done) throw new Error("انقطع الاتصال قبل اكتمال الإعلان؛ راجع سيرفرك قبل بدء طلب جديد.");
      setK("status", kind, "done"); ok = true;
      if (!quiet) toast.success(kind === "text" ? "الإعلان النصي جاهز" : kind === "image" ? "صورة الإعلان جاهزة" : "فيديو الإعلان جاهز");
    } catch (e) {
      if (kind === "text" && !state.text) set({ text: previous });
      setK("status", kind, ctrl.signal.aborted ? "idle" : "error");
      if (!ctrl.signal.aborted) setK("error", kind, (e as Error).message || "تعذر الإنشاء");
    } finally { setK("progress", kind, ""); delete ctrls[kind]; }
    return ok;
  },
  /** Text, image and video together with automatic strongest-model choice. */
  async runAll(p: Omit<AdParams, "modelId">, targets: AdKind[] = kinds, revision?: string) {
    if (revision) set({ chat: [...state.chat, { role: "user", text: revision }] });
    const results = await Promise.all(targets.map((k) => adsStore.run(k, { ...p, modelId: "auto", revision }, true)));
    const names = { text: "النص", image: "الصورة", video: "الفيديو" };
    const ready = targets.filter((_, i) => results[i]).map((k) => names[k]);
    const failed = targets.filter((_, i) => !results[i]).map((k) => `${names[k]}: ${state.error[k] || "أُوقف"}`);
    const summary = [ready.length ? `جاهز: ${ready.join("، ")}` : "", failed.length ? `لم يكتمل — ${failed.join(" · ")}` : ""].filter(Boolean).join("\n");
    set({ chat: [...state.chat, { role: "assistant", text: summary }] });
    if (ready.length === targets.length) toast.success("اكتملت الإعلانات: " + ready.join("، "));
    else toast.error("بعض الإعلانات لم تكتمل، افتح صفحة الإعلانات للتفاصيل");
  },
};
