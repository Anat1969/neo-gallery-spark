import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MEDIA_LABEL, srcSet, thumbUrl, type MediaType } from "@/lib/media";

export interface MediaLike {
  title: string;
  image_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
}

interface Props {
  item: MediaLike;
  className?: string;
  /** CSS sizes hint for responsive images */
  sizes?: string;
  /** Plays muted video previews while hovered */
  active?: boolean;
  eager?: boolean;
  /** Keep the work's own proportions (salon wall) instead of filling a fixed box */
  natural?: boolean;
  ratio?: number | null;
}

/**
 * The visual face of any work: a resized image with a blurred low-res underlay,
 * a muted looping preview for video, a paper sheet for PDF, a plinth for 3D.
 */
const MediaThumb = ({ item, className, sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw", active, eager, natural, ratio }: Props) => {
  const type = (item.media_type || "image") as MediaType;
  const poster = item.image_url || "";
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => undefined);
    else v.pause();
  }, [active]);

  const label = type !== "image" && (
    <span className="pointer-events-none absolute bottom-2 left-2 z-[2] rounded-sm bg-background/80 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-foreground/80 backdrop-blur">
      {MEDIA_LABEL[type] ?? "קובץ"}
    </span>
  );

  const box = natural ? "relative w-full overflow-hidden bg-secondary" : "relative h-full w-full overflow-hidden bg-secondary";
  const boxStyle = natural ? { aspectRatio: ratio ? String(ratio) : undefined, minHeight: ratio ? undefined : 160 } : undefined;

  if (type === "video" && item.media_url && active) {
    return (
      <div className={cn(box, className)} style={boxStyle}>
        <video
          ref={videoRef}
          src={item.media_url}
          poster={thumbUrl(poster, 640)}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
        {label}
      </div>
    );
  }

  if (!poster) {
    return (
      <div className={cn(box, "flex items-center justify-center", natural && !ratio && "aspect-[4/5]", className)} style={natural && ratio ? boxStyle : undefined}>
        {type === "pdf" ? (
          <div className="relative h-[70%] w-[52%] rotate-[-3deg] rounded-[2px] bg-card shadow-deep">
            <div className="absolute inset-x-[12%] top-[14%] space-y-[6%]">
              {[90, 70, 80, 55, 75].map((w, i) => (
                <div key={i} className="h-[3px] rounded bg-muted-foreground/30" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        ) : type === "model" ? (
          <div className="relative h-1/2 w-1/2 [perspective:400px]">
            <div className="absolute inset-0 animate-[spin_14s_linear_infinite] rounded-sm border border-foreground/30 [transform:rotateX(60deg)]" />
            <div className="absolute inset-[18%] rounded-sm border border-foreground/50 bg-foreground/5 shadow-deep" />
          </div>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">{type === "image" ? "אין תמונה" : MEDIA_LABEL[type]}</span>
        )}
        {label}
      </div>
    );
  }

  return (
    <div
      className={cn(box, className)}
      style={{ ...boxStyle, backgroundImage: `url("${thumbUrl(poster, 24, 40)}")`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <img
        src={thumbUrl(poster, 640)}
        srcSet={srcSet(poster)}
        sizes={sizes}
        alt={item.title}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        // @ts-expect-error fetchpriority is valid HTML
        fetchpriority={eager ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className={cn(
          natural ? "block h-auto w-full" : "h-full w-full object-cover",
          "transition-[opacity,transform,filter] duration-700",
          loaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
        )}
      />
      {label}
    </div>
  );
};

export default MediaThumb;
