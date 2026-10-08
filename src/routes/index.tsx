import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, ImageIcon, Video, Languages, Captions, Cpu, PenLine, Wand2, FileText, Presentation, Code2, GraduationCap, AudioLines, Briefcase, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";

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

const capabilities = [
  { icon: PenLine, t: "كاتب محترف", d: "سكربتات وإعلانات ومقالات وخطط تسويق جاهزة خلال ثوانٍ." },
  { icon: Briefcase, t: "مستشار أعمال", d: "خطط عمل، تحليل منافسين، حسابات وتقارير دقيقة." },
  { icon: ImageIcon, t: "مصمم صور", d: "صور إعلانية واقعية وبوسترات بكتابة عربية واضحة من وصف بسيط." },
  { icon: Wand2, t: "محرر صور سحري", d: "غيّر الخلفية، أزل العناصر، ورفع دقة الصور القديمة بكلمات." },
  { icon: FileText, t: "خبير مستندات", d: "حوّل بين PDF وWord وExcel، ادمج وضغط ولخّص ملفاتك." },
  { icon: Presentation, t: "صانع عروض", d: "عرض تقديمي كامل بالتصميم من موضوع واحد فقط." },
  { icon: Code2, t: "مبرمج خبير", d: "مواقع وتطبيقات وألعاب كاملة من وصف نصي." },
  { icon: GraduationCap, t: "مصمم كورسات", d: "مناهج تدريبية كاملة بالدروس والتمارين والاختبارات." },
  { icon: Languages, t: "مترجم عالمي", d: "ترجمة احترافية لنصوص طويلة بين أكثر من 200 لغة." },
  { icon: AudioLines, t: "استوديو صوت", d: "صوتك المستنسخ بجودة بودكاست، مع اللهجات العربية والسودانية." },
  { icon: ScanText, t: "تفريغ ذكي", d: "حوّل أي تسجيل إلى نص وترجمة متزامنة بدقة الكلمة." },
  { icon: Video, t: "مخرج فيديو", d: "وجه يتكلم بتزامن الشفاه مع ترجمة ملونة وشعارك." },
];

function Index() {
  const { user } = useAuth();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        {user ? (
          <Button asChild variant="gold" size="sm"><Link to="/dashboard">لوحة التحكم</Link></Button>
        ) : (
          <Button asChild variant="glass" size="sm"><Link to="/auth">تسجيل الدخول</Link></Button>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="relative overflow-hidden py-10 text-center md:py-20">
          <AlabageraPortrait className="mx-auto mb-6 aspect-square w-36 rounded-full border-4 border-gold shadow-gold motion-safe:animate-in motion-safe:zoom-in-90 md:w-52" eager />
          <p className="mb-4 inline-block rounded-full glass px-4 py-1 text-xs text-gold-soft">Alabagera AI</p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            صورتك + صوتك = <span className="text-gold-gradient">فيديو يتكلم</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground md:text-lg">
            استوديو عربي شخصي لصناعة الفيديو والمحتوى، مع مساعد ذكي للترجمة والبرمجة والكورسات وتحليل الملفات.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            {user ? (<>
              <Button asChild variant="gold" size="lg"><Link to="/studio">إنشاء فيديو</Link></Button>
              <Button asChild variant="glass" size="lg"><Link to="/dashboard">لوحة التحكم</Link></Button>
            </>) : (
              <Button asChild variant="gold" size="lg"><Link to="/auth">تسجيل الدخول</Link></Button>
            )}
          </div>
        </section>
        <section className="mb-12">
          <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">ذكاء اصطناعي واحد… <span className="text-gold-gradient">لكل أعمالك</span></h2>
          <p className="mb-6 text-center text-muted-foreground">نخبة من أقوى العقول الذكية تعمل لك بالعربية والإنجليزية</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => (
              <div key={c.t} className="glass rounded-2xl p-5"><c.icon className="mb-3 size-6 text-gold" /><h3 className="font-bold">{c.t}</h3><p className="mt-1 text-sm text-muted-foreground">{c.d}</p></div>
            ))}
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
