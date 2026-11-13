import { useRef, useState } from "react";

/**
 * The gallery's one-minute film, beside the home title (golden ratio: title 1.618, film 1).
 * Nothing downloads until the visitor presses play: only the poster loads with the page.
 */
const HomeDemo = () => {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const v = ref.current;
    if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => {});
  };

  return (
    <figure className="w-full">
      <div className="relative overflow-hidden border border-border bg-card shadow-[0_24px_60px_-30px_hsl(var(--foreground)/0.45)]" style={{ aspectRatio: "1280 / 800" }}>
        <video
          ref={ref}
          src="/demo/anat-gallery-demo.mp4"
          poster="/demo/anat-gallery-demo.jpg"
          preload="none"
          playsInline
          controls={playing}
          onEnded={() => setPlaying(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {!playing && (
          <button type="button" onClick={play} className="group absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/55 via-transparent to-transparent p-4 text-start">
            <span className="arch-btn arch-btn-ink">צפייה בסרטון · דקה</span>
          </button>
        )}
      </div>
      <figcaption className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-muted-foreground">
        הגלריה בתנועה, מהעיר כולה ועד הפרט
        <span className="block opacity-70">קול: Gemini · מוזיקה: הולחנה בקוד לסרטון</span>
      </figcaption>
    </figure>
  );
};

export default HomeDemo;
