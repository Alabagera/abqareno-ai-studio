import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => { const f = () => setLight(document.documentElement.classList.contains("light")); f(); window.addEventListener("abq-theme", f); return () => window.removeEventListener("abq-theme", f); }, []);
  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("theme", next ? "light" : "dark");
  }
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label={light ? "الوضع الليلي" : "الوضع النهاري"}>{light ? <Moon /> : <Sun />}</Button>;
}
