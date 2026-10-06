import { useEffect, useRef, useState } from "react";
import { Camera, Circle, Mic, RefreshCw, Square, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function pickMime(kind: "audio" | "video") {
  const list = kind === "audio" ? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"] : ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  return list.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

export function AudioRecorder({ onSave, label = "تسجيل من الميكروفون" }: { onSave: (file: File) => void | Promise<void>; label?: string }) {
  const [open, setOpen] = useState(false);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [secs, setSecs] = useState(0);
  const chunks = useRef<Blob[]>([]);
  useEffect(() => { if (!rec) return; const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t); }, [rec]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const mime = pickMime("audio");
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); setBlob(new Blob(chunks.current, { type: r.mimeType || "audio/webm" })); };
      r.start(); setRec(r); setSecs(0); setBlob(null);
    } catch { toast.error("لم يُسمح باستخدام الميكروفون"); }
  }
  function stop() { rec?.stop(); setRec(null); }
  async function save() {
    if (!blob) return;
    const ext = blob.type.includes("mp4") ? "m4a" : "webm";
    await onSave(new File([blob], `تسجيل-${Date.now()}.${ext}`, { type: blob.type }));
    setBlob(null); setOpen(false);
  }
  return (
    <>
      <Button type="button" variant="glass" onClick={() => setOpen(true)}><Mic />{label}</Button>
      <Dialog open={open} onOpenChange={(o) => { if (!o) stop(); setOpen(o); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تسجيل صوتي</DialogTitle></DialogHeader>
          <div className="space-y-4 text-center">
            <div className="text-3xl font-bold tabular-nums">{String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}</div>
            {rec ? <Button variant="destructive" onClick={stop}><Square />إيقاف</Button> : <Button variant="gold" onClick={start}><Circle className="fill-current" />{blob ? "إعادة التسجيل" : "ابدأ التسجيل"}</Button>}
            {blob && <><audio controls src={URL.createObjectURL(blob)} className="w-full" /><Button className="w-full" variant="gold" onClick={save}>حفظ التسجيل</Button></>}
            <p className="text-xs text-muted-foreground">نصيحة: سجّل في غرفة هادئة على بعد شبر من الميكروفون.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CameraCapture({ onSave, allowVideo = true, label = "التصوير بالكاميرا" }: { onSave: (file: File) => void | Promise<void>; allowVideo?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: allowVideo })
      .then((s) => { if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; } streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => toast.error("لم يُسمح باستخدام الكاميرا"));
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, [open, facing, allowVideo]);

  function photo() {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (facing === "user") { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    c.toBlob(async (b) => { if (b) { await onSave(new File([b], `صورة-${Date.now()}.jpg`, { type: "image/jpeg" })); setOpen(false); } }, "image/jpeg", 0.92);
  }
  function startVideo() {
    const s = streamRef.current; if (!s) return;
    const mime = pickMime("video");
    const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = async () => { const b = new Blob(chunks.current, { type: r.mimeType || "video/webm" }); await onSave(new File([b], `فيديو-${Date.now()}.${b.type.includes("mp4") ? "mp4" : "webm"}`, { type: b.type })); setOpen(false); };
    r.start(); setRec(r);
  }
  return (
    <>
      <Button type="button" variant="glass" onClick={() => setOpen(true)}><Camera />{label}</Button>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { rec?.stop(); setRec(null); } setOpen(o); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>الكاميرا</DialogTitle></DialogHeader>
          <video ref={videoRef} autoPlay playsInline muted className={`aspect-[3/4] w-full rounded-xl bg-muted object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="glass" size="icon" aria-label="تبديل الكاميرا" onClick={() => setFacing(facing === "user" ? "environment" : "user")} disabled={!!rec}><RefreshCw /></Button>
            <Button variant="gold" onClick={photo} disabled={!!rec}><Camera />التقاط صورة</Button>
            {allowVideo && (rec ? <Button variant="destructive" onClick={() => { rec.stop(); setRec(null); }}><Square />إيقاف وحفظ</Button> : <Button variant="glass" onClick={startVideo}><Video />تسجيل فيديو</Button>)}
            <Button variant="ghost" size="icon" aria-label="إغلاق" onClick={() => setOpen(false)}><X /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
