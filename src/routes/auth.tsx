import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — عبقرينو AI Studio" },
      { name: "description", content: "سجّل دخولك إلى استوديو عبقرينو." },
      { property: "og:title", content: "تسجيل الدخول — عبقرينو" },
      { property: "og:description", content: "ادخل إلى لوحة تحكم عبقرينو AI Studio." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب، تحقق من بريدك لتأكيده");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("تعذر تسجيل الدخول بجوجل");
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="glass w-full max-w-sm rounded-3xl p-7">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="mb-6 text-center text-xl font-bold">{mode === "in" ? "مرحبًا بعودتك" : "إنشاء حساب جديد"}</h1>
        <Button variant="glass" className="w-full" onClick={google}>المتابعة باستخدام Google</Button>
        <div className="my-5 text-center text-xs text-muted-foreground">أو بالبريد الإلكتروني</div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">كلمة المرور</Label>
            <Input id="pw" type="password" dir="ltr" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="gold" className="w-full" disabled={busy}>
            {mode === "in" ? "دخول" : "إنشاء الحساب"}
          </Button>
        </form>
        <button className="mt-5 w-full text-center text-sm text-gold-soft" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </div>
    </div>
  );
}
