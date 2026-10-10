import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Sparkles, Mic, Video, Film, Bot, Megaphone, NotebookPen, FolderOpen, Languages, Captions, ShieldCheck, Crown, Rocket, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";
import { whatsappLink } from "@/lib/subscriptions";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "الاشتراكات — عبقرينو AI Studio" },
      { name: "description", content: "اشترك في عبقرينو AI Studio: فيديوهات متحدثة بصوتك، محرر احترافي، ومساعد ذكي بالعربية." },
      { property: "og:title", content: "اشتراكات عبقرينو AI Studio" },
      { property: "og:description", content: "خطط شهرية وسنوية لاستوديو عربي متكامل لصناعة الفيديو والمحتوى." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Subscriptions,
});

const tour = [
  { icon: Video, t: "الاستوديو", d: "اكتب نصًا، فيتحول إلى فيديو تتكلم فيه صورتك بصوتك، مع ترجمة ملوّنة وشعارك." },
  { icon: Film, t: "محرر الفيديو", d: "قص ودمج، أكثر من 90 انتقالًا مبهرًا، ألف رمز، 600 مربع نص، فلاتر وتصدير MP4 بجودة عالية." },
  { icon: Captions, t: "ترجمة نصية تلقائية", d: "يستخرج كلام الفيديو إلى نص متزامن بدقة، بالعربية واللهجات والإنجليزية." },
  { icon: Bot, t: "المساعد الذكي", d: "كاتب، مترجم، مبرمج، صانع عروض وكورسات ومستندات PDF وWord وExcel." },
  { icon: Megaphone, t: "استوديو الإعلانات", d: "صور وفيديوهات إعلانية جاهزة لكل منصات التواصل." },
  { icon: Mic, t: "صوتك المستنسخ", d: "صوت بجودة الاستوديو يحافظ على هويتك، مع اللهجات العربية والسودانية." },
  { icon: Sparkles, t: "عبقرينو الصوتي", d: "تكلّم فقط: يفتح الأقسام، يشغّل الملفات، ينجز مهامك ويبحث في الموقع كله." },
  { icon: NotebookPen, t: "يومياتي", d: "مهامك وتذكيراتك اليومية مع عبارات تحفيزية ونغمات." },
  { icon: FolderOpen, t: "مكتبتك الخاصة", d: "كل ملفاتك محفوظة وخاصة بك وحدك، بأسماء تختارها." },
  { icon: Languages, t: "عربي وإنجليزي", d: "واجهة عربية أولًا، وتدعم الإنجليزية والنص المختلط بسلاسة." },
];

const plans = [
  { icon: Rocket, name: "الشهري", tag: "ابدأ الآن", perks: ["كل أقسام الاستوديو", "المحرر الاحترافي", "المساعد الذكي", "دعم عبر واتساب"] },
  { icon: Crown, name: "السنوي", tag: "الأوفر", best: true, perks: ["كل مزايا الشهري", "حدود فيديو أكبر", "أولوية في الدعم", "توفير كبير مقارنة بالشهري"] },
  { icon: ShieldCheck, name: "الفرق والشركات", tag: "حسب الطلب", perks: ["حسابات متعددة", "صلاحيات لكل عضو", "حدود مخصصة", "إعداد مخصص لنشاطك"] },
];

function WhatsAppButton({ text, label = "اعرف التفاصيل عبر واتساب", size = "lg" as const }: { text?: string; label?: string; size?: "lg" | "default" }) {
  return <Button asChild variant="gold" size={size}><a href={whatsappLink(text)} target="_blank" rel="noopener noreferrer"><MessageCircle />{label}</a></Button>;
}

function Subscriptions() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/"><Logo /></Link>
        <Button asChild variant="glass" size="sm"><Link to="/auth">تسجيل الدخول</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="py-10 text-center md:py-16">
          <AlabageraPortrait className="mx-auto mb-6 aspect-square w-32 rounded-full border-4 border-gold shadow-gold md:w-44" eager />
          <p className="glass mb-4 inline-block rounded-full px-4 py-1 text-xs text-gold-soft">الاشتراكات</p>
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">استوديو كامل في جيبك… <span className="text-gold-gradient">بصوتك وصورتك</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground md:text-lg">بدل كاميرا ومونتير ومترجم وكاتب ومصمم، اشترك في عبقرينو واصنع محتوى احترافيًا خلال دقائق، من هاتفك وبالعربية.</p>
          <div className="mt-8"><WhatsAppButton /></div>
        </section>

        <section className="mb-14">
          <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">جولة سريعة في <span className="text-gold-gradient">عبقرينو</span></h2>
          <p className="mb-6 text-center text-muted-foreground">كل هذا يفتح لك مع الاشتراك</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tour.map((f, i) => (
              <div key={f.t} className="glass rounded-2xl p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                <f.icon className="mb-3 size-6 text-gold" /><h3 className="font-bold">{f.t}</h3><p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="mb-6 text-center text-2xl font-bold md:text-3xl">اختر خطتك</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={`glass relative flex flex-col rounded-3xl p-6 ${p.best ? "border-2 border-gold shadow-gold" : ""}`}>
                <span className="absolute -top-3 start-6 rounded-full bg-gold-gradient px-3 py-0.5 text-xs font-bold text-primary-foreground">{p.tag}</span>
                <p.icon className="mb-3 size-8 text-gold" />
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-gold-soft">الأسعار وطرق الدفع عبر واتساب</p>
                <ul className="my-5 flex-1 space-y-2 text-sm">{p.perks.map((x) => <li key={x} className="flex items-center gap-2"><Check className="size-4 text-gold" />{x}</li>)}</ul>
                <WhatsAppButton size="default" label="اشترك الآن" text={`مرحبًا، أريد الاشتراك في خطة «${p.name}» في عبقرينو AI Studio`} />
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-6 md:p-10">
          <h2 className="mb-4 text-xl font-bold">كيف أشترك؟</h2>
          <ol className="space-y-3 text-sm md:text-base">
            {["اضغط زر واتساب واختر الخطة المناسبة لك.", "نرسل لك الرسوم وطرق الدفع المتاحة في بلدك.", "بعد الدفع ننشئ حسابك ونفعّل اشتراكك فورًا.", "سجّل الدخول وابدأ صناعة محتواك. ونذكّرك قبل انتهاء الاشتراك."].map((s, i) => (
              <li key={s} className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold-gradient text-sm font-bold text-primary-foreground">{i + 1}</span>{s}</li>
            ))}
          </ol>
          <div className="mt-6"><WhatsAppButton /></div>
        </section>
      </main>
    </div>
  );
}
