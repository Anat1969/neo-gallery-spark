import { useRef, useState } from "react";
import { displayTitle } from "@/lib/title";
import { getDragItem, isItemDrag, setDragItem } from "@/lib/order";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MediaThumb from "./MediaThumb";
import { ACCEPT_ALL } from "@/lib/media";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

export interface WallArtwork {
  id: string;
  title: string;
  topic?: string | null;
  image_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  width?: number | null;
  height?: number | null;
  sort_order: number;
}

export interface TileAction {
  label: string;
  onClick: (a: WallArtwork) => void;
  danger?: boolean;
}

interface Props {
  artworks: WallArtwork[];
  editing: boolean;
  actions: TileAction[];
  onReorder: (next: WallArtwork[]) => void;
  onUpload: (files: File[]) => void;
  onReplaceMedia: (a: WallArtwork, file: File) => void;
  uploading?: { done: number; total: number } | null;
  /** Show the always-available upload tile (drag, paste, click). */
  canUpload?: boolean;
}

/** One framed work. Tilts toward the pointer with a moving sheen, as if lit from the viewer's side. */
const Tile = ({
  artwork,
  index,
  editing,
  actions,
  dragging,
  onDragStart,
  onDropOn,
  onReplaceMedia,
  onUploadFiles,
  onDragEnd,
}: {
  artwork: WallArtwork;
  index: number;
  editing: boolean;
  actions: TileAction[];
  dragging: boolean;
  onDragStart: () => void;
  onDropOn: (draggedId: string) => void;
  onReplaceMedia: (file: File) => void;
  onUploadFiles: (files: File[]) => void;
  onDragEnd: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [5, -5]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-6, 6]), { stiffness: 200, damping: 20 });
  const sheen = useTransform([px, py], ([x, y]: number[]) => `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, hsl(0 0% 100% / 0.16), transparent 45%)`);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(artwork.id);
  const ratio = artwork.width && artwork.height ? artwork.width / artwork.height : null;
  const [target, setTarget] = useState(false);

  return (
    <motion.div
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "120px" }}
      transition={{ duration: 0.6, delay: (index % 6) * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn("group relative mb-5 break-inside-avoid [perspective:1000px]", dragging && "opacity-30")}
      // Any frame can be dragged onto another frame to take its place; the order is saved at once
      draggable
      onDragStart={(e) => { setDragItem(e as unknown as React.DragEvent, "artwork", artwork.id); onDragStart(); }}
      onDragEnd={() => { setTarget(false); onDragEnd(); }}
      onDragOver={(e) => {
        if (isItemDrag(e as unknown as React.DragEvent) || e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (!target && !dragging) setTarget(true);
        }
      }}
      onDragLeave={() => setTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setTarget(false);
        const item = getDragItem(e as unknown as React.DragEvent);
        if (item?.kind === "artwork") return onDropOn(item.id);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (!files.length) return;
        // A file dropped on a frame: in edit mode it replaces that work's file, otherwise it becomes a new work
        if (editing) onReplaceMedia(files[0]);
        else onUploadFiles(files);
      }}
    >
      {target && (
        <div className="pointer-events-none absolute -inset-1.5 z-10 border-2 border-foreground">
          <span className="absolute -top-3 right-3 bg-foreground px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-background">מקום חדש</span>
        </div>
      )}
      <motion.div
        style={{ rotateX: editing || dragging ? 0 : rx, rotateY: editing || dragging ? 0 : ry, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => {
          setHover(false);
          px.set(0.5);
          py.set(0.5);
        }}
        className="relative overflow-hidden border border-border/60 bg-card shadow-deep transition-shadow duration-500 group-hover:shadow-[0_40px_80px_-30px_hsl(var(--shadow-deep))]"
      >
        <Link to={`/artwork/${artwork.id}`} className="block" draggable={false} aria-label={displayTitle(artwork.title) || "פתיחת היצירה"}>
          <MediaThumb item={artwork} natural ratio={ratio} active={hover} />
          <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: sheen }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-10 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            {displayTitle(artwork.title) && <h3 className="text-base font-light text-white">{displayTitle(artwork.title)}</h3>}
            {artwork.topic && <p className="mt-0.5 line-clamp-1 font-mono text-[11px] text-white/70">{artwork.topic}</p>}
          </div>
        </Link>

        <div className="absolute right-2 top-2 z-[3] flex gap-1">
          <button
            type="button"
            onClick={() => toggle(artwork.id)}
            aria-pressed={fav}
            aria-label={fav ? "הסרה מהנבחרות" : "הוספה לנבחרות"}
            className={cn(
              "h-7 min-h-0 border border-foreground/20 px-2 font-mono text-[10px] tracking-[0.1em] backdrop-blur transition-all",
              fav ? "bg-foreground text-background opacity-100" : "bg-background/70 text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100",
            )}
          >
            {fav ? "נבחרת" : "לנבחרות"}
          </button>
          {editing && (
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <button type="button" className="h-7 min-h-0 border border-foreground/20 bg-background/85 px-2 font-mono text-[10px] tracking-[0.1em] text-foreground backdrop-blur hover:bg-foreground hover:text-background" aria-label={`פעולות על ${displayTitle(artwork.title) || "היצירה"}`}>
                  פעולות
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {actions.map((a, i) => (
                  <div key={a.label}>
                    {a.danger && i > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => a.onClick(artwork)} className={cn("cursor-pointer", a.danger && "text-destructive")}>
                      {a.label}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <span aria-hidden className="pointer-events-none absolute left-2 top-2 z-[3] border border-foreground/20 bg-background/85 px-2 py-1 font-mono text-[10px] text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">גרירה להזזה</span>
      </motion.div>
    </motion.div>
  );
};

/**
 * The salon wall: works hang in their own proportions in staggered columns, rise into view
 * as you scroll, and tilt under the pointer. In edit mode the same wall accepts drops of any file.
 */
const ArtworkWall = ({ artworks, editing, actions, onReorder, onUpload, onReplaceMedia, uploading, canUpload = true }: Props) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const drop = (draggedId: string, target: number) => {
    const from = artworks.findIndex((a) => a.id === draggedId);
    setDragIdx(null);
    if (from < 0 || from === target) return;
    const next = [...artworks];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    onReorder(next);
  };

  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 2xl:columns-4">
      {canUpload && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const files = Array.from(e.dataTransfer.files ?? []);
            if (files.length) onUpload(files);
          }}
          className={cn(
            "mb-5 flex min-h-[220px] break-inside-avoid flex-col items-center justify-center gap-2 border border-dashed p-6 text-center transition-colors",
            over ? "border-foreground bg-secondary text-foreground" : "border-muted-foreground/30 text-muted-foreground hover:border-foreground/60",
          )}
        >
          {uploading ? (
            <>
              <span className="text-sm">מעלה {uploading.done} מתוך {uploading.total}</span>
              <span className="h-1 w-40 overflow-hidden rounded bg-muted">
                <span className="block h-full bg-foreground transition-all" style={{ width: `${(uploading.done / uploading.total) * 100}%` }} />
              </span>
            </>
          ) : (
            <>
              <span className="text-sm">גררי לכאן קבצים, הדביקי (Ctrl+V) או לחצי לבחירה</span>
              <span className="font-mono text-[11px]">תמונה · וידאו · PDF · תלת־ממד · שמע · כל קובץ</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ALL}
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) onUpload(files);
              e.target.value = "";
            }}
          />
        </div>
      )}
      {artworks.map((a, i) => (
        <Tile
          key={a.id}
          artwork={a}
          index={i}
          editing={editing}
          actions={actions}
          dragging={dragIdx === i}
          onDragStart={() => setDragIdx(i)}
          onDragEnd={() => setDragIdx(null)}
          onDropOn={(id) => drop(id, i)}
          onUploadFiles={onUpload}
          onReplaceMedia={(file) => onReplaceMedia(a, file)}
        />
      ))}
    </div>
  );
};

export default ArtworkWall;
