import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** First image among dropped or pasted items. */
export const imageFrom = (list?: FileList | DataTransferItemList | null): File | null => {
  if (!list) return null;
  for (const it of Array.from(list as ArrayLike<File | DataTransferItem>)) {
    const f = it instanceof File ? it : it.kind === "file" ? it.getAsFile() : null;
    if (f && f.type.startsWith("image/")) return f;
  }
  return null;
};

/** All files among dropped or pasted items. */
export const filesFrom = (list?: FileList | null): File[] => (list ? Array.from(list) : []);

/**
 * Paste anywhere on the page uploads files (Ctrl+V of a screenshot or copied files),
 * unless the cursor is in a text field that holds plain text.
 */
export const usePasteFiles = (onFiles: (files: File[]) => void, enabled = true) => {
  const cb = useRef(onFiles);
  cb.current = onFiles;
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-own-paste]")) return;
      const files = filesFrom(e.clipboardData?.files);
      if (!files.length) return;
      e.preventDefault();
      cb.current(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enabled]);
};

/** A small image well: drop, paste or click to choose. Shows the chosen image at once. */
export const ImageWell = ({ file, onFile, label, className }: { file: File | null; onFile: (f: File | null) => void; label: string; className?: string }) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const f = imageFrom(e.dataTransfer.files);
        if (f) onFile(f);
      }}
      className={cn(
        "relative flex cursor-pointer items-center justify-center overflow-hidden bg-secondary/60 text-center transition-colors",
        over ? "bg-foreground/10 outline outline-1 outline-foreground" : "hover:bg-secondary",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="px-3 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-muted-foreground">
          {label}
          <br />
          גרירה · הדבקה · לחיצה
        </span>
      )}
      {url && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFile(null);
          }}
          className="absolute left-2 top-2 h-7 min-h-0 bg-background/85 px-2 font-mono text-[10px] backdrop-blur"
        >
          הסרה
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
};

/**
 * The last item of a list that turns into a form in place: name, optional extras, save with Enter.
 * Pasting an image anywhere inside it fills the image well.
 */
export const CreateTile = ({
  idle,
  title,
  busy,
  onSubmit,
  children,
  className,
  openClassName,
  onPasteImage,
}: {
  /** Extra classes for the open form, e.g. spanning the full row on a narrow grid */
  openClassName?: string;
  idle: ReactNode;
  title: string;
  busy?: boolean;
  onSubmit: (close: () => void) => void;
  children: (close: () => void) => ReactNode;
  className?: string;
  onPasteImage?: (f: File) => void;
}) => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        onDragOver={(e) => {
          if (onPasteImage) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn("group flex flex-col items-center justify-center gap-2 border border-dashed border-foreground/25 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground", className)}
      >
        {idle}
      </button>
    );
  return (
    <form
      data-own-paste
      aria-label={title}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(close);
      }}
      onKeyDown={(e) => e.key === "Escape" && close()}
      onPaste={(e) => {
        const f = imageFrom(e.clipboardData.files);
        if (f && onPasteImage) {
          e.preventDefault();
          onPasteImage(f);
        }
      }}
      className={cn("flex min-w-0 flex-col gap-3 border border-foreground bg-card p-3 shadow-deep", busy && "pointer-events-none opacity-60", className, openClassName)}
    >
      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">{title}</span>
      {children(close)}
    </form>
  );
};

/** Text field for the create tiles: big, thin, focused on open. */
export const CreateName = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <input
    autoFocus
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="h-11 w-full border-b border-foreground/40 bg-transparent text-xl font-light outline-none placeholder:text-muted-foreground/60 focus:border-foreground"
  />
);

export const CreateActions = ({ close, busy, label = "שמירה" }: { close: () => void; busy?: boolean; label?: string }) => (
  <div className="flex gap-2">
    <button type="submit" disabled={busy} className="arch-btn arch-btn-ink flex-1">
      {busy ? "שומרת..." : label}
    </button>
    <button type="button" onClick={close} className="arch-btn arch-btn-quiet">
      ביטול
    </button>
  </div>
);
