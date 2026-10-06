import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, ImageIcon, Video, Languages, Captions, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عبقرينو AI Studio — فيديوهات متحدثة من صورتك وصوتك" },
      { name: "description", content: "حوّل صورتك ونصك إلى فيديو متحدث بصوتك، مع ترجمة نصية ملونة وترجمة لغات." },
      { property: "og:title", content: "عبقرينو AI Studio" },
      { property: "og:description", content: "استوديو عربي لإنشاء فيديوهات Talking Avatar بنماذج مفتوحة المصدر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: ImageIcon, t: "صورتك", d: "ارفع صورة واضحة للوجه" },
  { icon: Mic, t: "صوتك", d: "نص يتحول إلى صوتك المستنسخ" },
  { icon: Video, t: "فيديو متحدث", d: "تحريك الوجه بتزامن الشفاه" },
  { icon: Captions, t: "ترجمة نصية", d: "خطوط منسقة وألوان جميلة" },
  { icon: Languages, t: "ترجمة لغات", d: "انشر محتواك لكل العالم" },
  { icon: Cpu, t: "نماذج مفتوحة", d: "بدّل النموذج دون إعادة البناء" },
];

function Index() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Button asChild variant="glass" size="sm">
          <Link to="/auth">تسجيل الدخول</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="py-14 text-center md:py-24">
          <p className="mb-4 inline-block rounded-full glass px-4 py-1 text-xs text-gold-soft">Alabagera AI</p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            صورتك + صوتك = <span className="text-gold-gradient">فيديو يتكلم</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground md:text-lg">
            استوديو عربي شخصي لإنشاء فيديوهات Talking Avatar، مع ترجمة نصية تلقائية وترجمة لغات.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild variant="gold" size="lg">
              <Link to="/auth">ابدأ الآن</Link>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link to="/dashboard">لوحة التحكم</Link>
            </Button>
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {features.map((f) => (
            <div key={f.t} className="glass rounded-2xl p-5">
              <f.icon className="mb-3 size-6 text-gold" />
              <h3 className="font-bold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
