import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { thumbUrl, MEDIA_LABEL, type MediaType } from "@/lib/media";
import type { WallArtwork } from "./ArtworkWall";

const SLIDE_MS = 7000;

/**
 * Screening hall: the gallery as a slow, full-screen projection. Images drift (Ken Burns),
 * videos play through, the next work fades in. Arrows, space and Escape steer it.
 */
const ScreeningMode = ({ artworks, title, onClose, start = 0 }: { artworks: WallArtwork[]; title: string; onClose: () => void; start?: number }) => {
  const [idx, setIdx] = useState(start);
  const [playing, setPlaying] = useState(true);
  const [tick, setTick] = useState(0);
  const timer = useRef<number>();
  const n = artworks.length;
  const current = artworks[idx];
  const type = (current?.media_type || "image") as MediaType;

  const go = useCallback((d: number) => {
    setIdx((i) => (i + d + n) % n);
    setTick((t) => t + 1);
  }, [n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(1);
      else if (e.key === "ArrowRight") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (playing && type !== "video") timer.current = window.setTimeout(() => go(1), SLIDE_MS);
    return () => window.clearTimeout(timer.current);
  }, [idx, playing, type, go, tick]);

  // Preload the next image so the crossfade never waits
  useEffect(() => {
    const next = artworks[(idx + 1) % n];
    if (next?.image_url) new Image().src = thumbUrl(next.image_url, 1920, 82);
  }, [idx, artworks, n]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] overflow-hidden bg-black text-white"
      dir="rtl"
      role="dialog"
      aria-label={`הקרנה: ${title}`}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={current.id + tick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {type === "video" && current.media_url ? (
            <video
              src={current.media_url}
              poster={thumbUrl(current.image_url, 1920)}
              autoPlay
              muted
              playsInline
              onEnded={() => playing && go(1)}
              className="h-full w-full object-contain"
            />
          ) : current.image_url ? (
            <>
              <img src={thumbUrl(current.image_url, 64, 40)} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
              <img
                src={thumbUrl(current.image_url, 1920, 82)}
                alt={current.title}
                className={`relative max-h-full max-w-full object-contain ${playing ? "ken-burns" : ""}`}
              />
            </>
          ) : (
            <span className="font-mono text-sm text-white/60">{MEDIA_LABEL[type]}</span>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-24 md:p-10 md:pt-32">
        <motion.p key={"t" + current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-2xl font-extralight md:text-4xl">
          {current.title}
        </motion.p>
        <p className="mt-2 font-mono text-xs text-white/60">
          {title} · {idx + 1} / {n}
        </p>
      </div>

      <div className="absolute inset-x-0 top-0 h-[2px] bg-white/10">
        {playing && type !== "video" && (
          <motion.div key={"p" + idx + tick} className="h-full origin-right bg-white/70" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: SLIDE_MS / 1000, ease: "linear" }} />
        )}
      </div>

      <div className="absolute left-4 top-4 flex gap-2 md:left-6 md:top-6">
        {[
          { label: playing ? "השהיה" : "המשך", on: () => setPlaying((p) => !p) },
          { label: "הקודמת", on: () => go(-1) },
          { label: "הבאה", on: () => go(1) },
          { label: "סגירה", on: onClose },
        ].map((b) => (
          <button key={b.label} type="button" onClick={b.on} className="h-9 min-h-0 rounded-md border border-white/25 bg-black/40 px-3 font-mono text-xs text-white backdrop-blur hover:bg-white/15">
            {b.label}
          </button>
        ))}
      </div>

      {/* Tap zones for touch screens */}
      <button type="button" aria-label="הבאה" onClick={() => go(1)} className="absolute bottom-24 left-0 top-20 w-1/3 opacity-0" />
      <button type="button" aria-label="הקודמת" onClick={() => go(-1)} className="absolute bottom-24 right-0 top-20 w-1/3 opacity-0" />
    </motion.div>
  );
};

export default ScreeningMode;
