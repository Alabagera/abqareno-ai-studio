import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "تعيين كلمة مرور جديدة — عبقرينو AI Studio" },
    { name: "description", content: "اختر كلمة مرور جديدة لحسابك في عبقرينو." },
    { property: "og:title", content: "كلمة مرور جديدة — عبقرينو" },
    { property: "og:description", content: "استعادة الدخول إلى استوديو عبقرينو." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    async function prepareRecovery() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) await supabase.auth.exchangeCodeForSession(code);
      const { data } = await supabase.auth.getSession();
      if (active) { setRecoveryReady(Boolean(data.session)); setChecking(false); }
    }
    void prepareRecovery();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setRecoveryReady(true);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تغيير كلمة المرور");
    nav({ to: "/dashboard" });
  }
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-4 rounded-3xl p-7">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="text-center text-xl font-bold">كلمة مرور جديدة</h1>
        {checking ? <p className="text-center text-sm text-muted-foreground">جارٍ التحقق من رابط الاستعادة…</p> : !recoveryReady ? <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">رابط الاستعادة غير صالح أو انتهت مدته. اطلب رابطًا جديدًا من صفحة الدخول.</p> : null}
        <div className="space-y-1.5"><Label htmlFor="npw">كلمة المرور الجديدة</Label><Input id="npw" type="password" dir="ltr" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit" variant="gold" className="w-full" disabled={busy || checking || !recoveryReady}>حفظ كلمة المرور</Button>
      </form>
    </div>
  );
}
