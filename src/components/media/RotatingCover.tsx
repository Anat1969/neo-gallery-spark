import { useEffect, useMemo, useRef, useState } from "react";
import { thumbUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A cover that is never the same twice: each visit opens on a different image from the collection,
 * and while it is on screen it crossfades to the next one every few seconds (staggered per card).
 * `fast` (on hover) flips quickly through the collection, as before.
 */
const RotatingCover = ({
  pool,
  width = 640,
  sizes,
  alt = "",
  className,
  interval = 7000,
  fast = false,
  eager = false,
  onIndex,
}: {
  pool: string[];
  width?: number;
  sizes?: string;
  alt?: string;
  className?: string;
  interval?: number;
  fast?: boolean;
  eager?: boolean;
  onIndex?: (i: number, n: number) => void;
}) => {
  // Keyed by content, so a parent that rebuilds the array each render does not restart the rotation
  const poolKey = pool.filter(Boolean).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const images = useMemo(() => [...new Set(pool.filter(Boolean))], [poolKey]);
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;
  const n = images.length;
  // A different first image on every visit
  const [idx, setIdx] = useState(() => (n ? Math.floor(Math.random() * n) : 0));
  const [shown, setShown] = useState<number[]>(() => [idx]);
  const box = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const jitter = useRef(Math.random() * interval * 0.6);

  useEffect(() => {
    if (idx >= n && n) setIdx(0);
  }, [n, idx]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (n < 2 || (reduceMotion() && !fast)) return;
    const every = fast ? 850 : interval;
    let t: number;
    const tick = () => {
      if (visible.current || fast) {
        setIdx((i) => {
          const next = (i + 1) % n;
          // Preload the one after, so the crossfade never waits
          const pre = new Image();
          pre.src = thumbUrl(images[(next + 1) % n], width);
          return next;
        });
      }
      t = window.setTimeout(tick, every);
    };
    t = window.setTimeout(tick, fast ? every : every + jitter.current);
    return () => window.clearTimeout(t);
  }, [n, fast, interval, images, width]);

  // Keep the previous layer under the new one during the fade
  useEffect(() => {
    setShown((s) => [...s.filter((x) => x !== idx).slice(-1), idx]);
    onIndexRef.current?.(idx, n);
  }, [idx, n]);

  if (!n) return <div ref={box} className={cn("flex items-center justify-center bg-secondary font-mono text-xs text-muted-foreground", className)}>אין תמונה</div>;

  return (
    <div ref={box} className={cn("relative overflow-hidden bg-secondary", className)}>
      {shown.map((i) => (
        <img
          key={images[i]}
          src={thumbUrl(images[i], width)}
          srcSet={`${thumbUrl(images[i], Math.round(width * 0.6))} ${Math.round(width * 0.6)}w, ${thumbUrl(images[i], width)} ${width}w, ${thumbUrl(images[i], Math.round(width * 1.5))} ${Math.round(width * 1.5)}w`}
          sizes={sizes}
          alt={i === idx ? alt : ""}
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-[1200ms] ease-out group-hover:scale-105"
          ref={(el) => {
            // Fade in the active layer once it has painted
            if (el && i === idx) requestAnimationFrame(() => (el.style.opacity = "1"));
          }}
        />
      ))}
    </div>
  );
};

export default RotatingCover;
