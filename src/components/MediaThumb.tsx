import { useQuery } from "@tanstack/react-query";
import { FileText, Music } from "lucide-react";
import { signedUrl } from "@/lib/media";

export function MediaThumb({ path, kind, className = "" }: { path: string; kind: string; className?: string }) {
  const { data: url } = useQuery({ queryKey: ["signed", path], queryFn: () => signedUrl(path), staleTime: 50 * 60 * 1000 });
  if (kind === "image") return url ? <img loading="lazy" decoding="async" src={url} alt="" className={`object-cover ${className}`} /> : <div className={`bg-secondary ${className}`} />;
  if (kind === "video") return url ? <video src={url} controls className={`bg-background object-cover ${className}`} /> : <div className={`bg-secondary ${className}`} />;
  if (kind === "audio")
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-secondary p-2 ${className}`}>
        <Music className="size-7 text-gold" />
        {url && <audio src={url} controls className="w-full" />}
      </div>
    );
  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" className={`grid place-items-center bg-secondary ${className}`}>
      <FileText className="size-8 text-gold" />
    </a>
  );
}
