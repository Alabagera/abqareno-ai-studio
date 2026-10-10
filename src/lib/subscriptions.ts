// WhatsApp contact for subscriptions; the number is only inside the link, never shown on screen.
const WA = "249111420301";
export const whatsappLink = (text = "مرحبًا، أريد معرفة تفاصيل الاشتراك في عبقرينو AI Studio") =>
  `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

export const PLANS = [
  { id: "monthly", label: "شهري", days: 30 },
  { id: "quarterly", label: "3 أشهر", days: 90 },
  { id: "yearly", label: "سنوي", days: 365 },
  { id: "unlimited", label: "دائم", days: null },
] as const;
export const planLabel = (id: string | null | undefined) => PLANS.find((p) => p.id === id)?.label ?? "بدون اشتراك";
