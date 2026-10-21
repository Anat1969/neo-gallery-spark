import { createElement, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isViewableModel, MEDIA_LABEL, thumbUrl, type MediaType } from "@/lib/media";
import type { MediaLike } from "./MediaThumb";

/** Full presentation of a work, by media type. Heavy viewers (3D) load only when needed. */
const MediaViewer = ({ item, className, autoPlay = false }: { item: MediaLike; className?: string; autoPlay?: boolean }) => {
  const type = (item.media_type || "image") as MediaType;
  const src = item.media_url || item.image_url || "";
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    if (type === "model" && isViewableModel(src)) {
      import("@google/model-viewer").then(() => setModelReady(true)).catch(() => undefined);
    }
  }, [type, src]);

  const download = (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      download
      className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 font-mono text-xs text-foreground hover:bg-secondary"
    >
      הורדת הקובץ המקורי
    </a>
  );

  if (!src) {
    return (
      <div className={cn("flex aspect-[3/2] items-center justify-center rounded-lg bg-secondary", className)}>
        <span className="font-mono text-sm text-muted-foreground">אין קובץ</span>
      </div>
    );
  }

  if (type === "video") {
    return (
      <video
        src={src}
        poster={thumbUrl(item.image_url, 1400)}
        controls
        playsInline
        autoPlay={autoPlay}
        muted={autoPlay}
        className={cn("mx-auto max-h-[72vh] w-full rounded-lg bg-black object-contain shadow-deep", className)}
      />
    );
  }

  if (type === "audio") {
    return (
      <div className={cn("flex flex-col items-center gap-4 rounded-lg bg-secondary p-8", className)}>
        {item.image_url && <img src={thumbUrl(item.image_url, 800)} alt="" className="max-h-[50vh] rounded-md object-contain" />}
        <audio src={src} controls className="w-full max-w-xl" />
      </div>
    );
  }

  if (type === "pdf") {
    return (
      <div className={cn("space-y-3", className)}>
        <object data={`${src}#view=FitH`} type="application/pdf" className="h-[72vh] w-full rounded-lg border border-border bg-card shadow-deep">
          {item.image_url && <img src={thumbUrl(item.image_url, 1400)} alt={item.title} className="mx-auto max-h-[72vh] object-contain" />}
        </object>
        <div className="flex justify-center">{download}</div>
      </div>
    );
  }

  if (type === "model") {
    if (isViewableModel(src) && modelReady) {
      return (
        <div className={cn("space-y-3", className)}>
          {createElement("model-viewer", {
            src,
            poster: item.image_url || undefined,
            alt: item.title,
            "camera-controls": true,
            "auto-rotate": true,
            "shadow-intensity": "1",
            exposure: "1",
            ar: true,
            style: { width: "100%", height: "72vh", background: "transparent", borderRadius: "0.5rem" },
          })}
          <div className="flex justify-center">{download}</div>
        </div>
      );
    }
    return (
      <div className={cn("flex flex-col items-center gap-4 rounded-lg bg-secondary p-10", className)}>
        <span className="font-mono text-sm text-muted-foreground">{MEDIA_LABEL.model}</span>
        {!isViewableModel(src) && (
          <p className="max-w-md text-center text-sm text-muted-foreground">התצוגה התלת־ממדית בדפדפן תומכת ב-GLB וב-GLTF. את הקובץ הזה אפשר להוריד ולפתוח בתוכנה.</p>
        )}
        {download}
      </div>
    );
  }

  if (type === "file") {
    return (
      <div className={cn("flex flex-col items-center gap-4 rounded-lg bg-secondary p-10", className)}>
        {item.image_url && <img src={thumbUrl(item.image_url, 800)} alt="" className="max-h-[50vh] rounded-md object-contain" />}
        {download}
      </div>
    );
  }

  return (
    <img
      src={thumbUrl(src, 1600, 85)}
      srcSet={`${thumbUrl(src, 960, 85)} 960w, ${thumbUrl(src, 1600, 85)} 1600w, ${thumbUrl(src, 2400, 88)} 2400w`}
      sizes="(max-width: 1024px) 100vw, 1024px"
      alt={item.title}
      decoding="async"
      className={cn("mx-auto max-h-[72vh] w-full rounded-lg object-contain shadow-deep", className)}
    />
  );
};

export default MediaViewer;
