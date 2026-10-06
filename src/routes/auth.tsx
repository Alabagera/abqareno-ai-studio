import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user } = useAuth();
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="glass w-full max-w-sm rounded-3xl p-7">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="mb-2 text-center text-xl font-bold">مرحبًا بعودتك</h1>
        <p className="mb-6 text-center text-xs text-muted-foreground">الحسابات ينشئها المدير الرئيسي فقط</p>
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
            دخول
          </Button>
        </form>
        <Button type="button" variant="link" className="mt-4 w-full text-xs text-muted-foreground" onClick={async () => {
            if (!email) { toast.error("اكتب بريدك الإلكتروني أولًا"); return; }
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
            if (error) toast.error(error.message); else toast.success("أرسلنا رابط تعيين كلمة المرور إلى بريدك");
          }}>نسيت كلمة المرور؟</Button>
      </div>
    </div>
  );
}
