import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import ImageDropZone from "@/components/ImageDropZone";
import InlineEdit from "@/components/InlineEdit";
import { slugify, uniqueSlug, friendlyDbError } from "@/lib/slug";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LatestStrip, { type StripWork } from "@/components/LatestStrip";
import { thumbUrl, uploadImage } from "@/lib/media";
import HomeDemo from "@/components/media/HomeDemo";
import RotatingCover from "@/components/media/RotatingCover";
import { CreateName, CreateTile, ImageWell, imageFrom } from "@/components/create/InlineCreate";
import { fetchGallery, fetchRootArtworks, galleryKey, rootArtworksKey } from "@/lib/queries";
import { useDockActions } from "@/contexts/DockContext";
import { bySortOrder, getDragItem, isItemDrag, moveItem, saveOrder, setDragItem } from "@/lib/order";

interface GalleryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  cover_image: string;
  sort_order: number;
  artworkCount: number;
  lastActivity?: string;
  previews: string[];
}

/** A gallery as a stack of prints: on hover it flips through its latest works. */
const GalleryCard = ({ gallery, onOpen, onPrefetch, menu, nameNode, index, onCover, onDropGallery }: {
  gallery: GalleryItem;
  onDropGallery: (draggedId: string) => void;
  onCover: (f: File) => Promise<void>;
  onOpen: () => void;
  onPrefetch: () => void;
  menu: React.ReactNode;
  nameNode: React.ReactNode;
  index: number;
}) => {
  // The cover rotates through the gallery's own works, so the home page never shows the same faces
  const pool = useMemo(() => [gallery.cover_image, ...gallery.previews].filter(Boolean), [gallery]);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [hover, setHover] = useState(false);
  const [dropping, setDropping] = useState<"over" | "saving" | null>(null);
  const [target, setTarget] = useState(false);


  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "80px" }}
      transition={{ duration: 0.55, delay: (index % 8) * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
      className="group relative"
      onPointerEnter={() => { setHover(true); onPrefetch(); }}
      onPointerLeave={() => setHover(false)}
      draggable
      onDragStart={(e) => setDragItem(e as unknown as React.DragEvent, "gallery", gallery.id)}
      onDragEnd={() => setTarget(false)}
      onDragOver={(e) => {
        if (isItemDrag(e as unknown as React.DragEvent)) { e.preventDefault(); if (!target) setTarget(true); return; }
        if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDropping("over"); }
      }}
      onDragLeave={() => { setTarget(false); setDropping((d) => (d === "over" ? null : d)); }}
      onDrop={async (e) => {
        const item = getDragItem(e as unknown as React.DragEvent);
        if (item) { e.preventDefault(); setTarget(false); if (item.kind === "gallery" && item.id !== gallery.id) onDropGallery(item.id); return; }
        const f = imageFrom(e.dataTransfer.files);
        if (!f) return setDropping(null);
        e.preventDefault();
        setDropping("saving");
        await onCover(f);
        setDropping(null);
      }}
    >
      {target && (
        <div className="pointer-events-none absolute -inset-2 z-20 border-2 border-foreground">
          <span className="absolute -top-3 right-3 bg-foreground px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-background">מקום חדש</span>
        </div>
      )}
      {/* Stacked prints behind the card give it physical depth */}
      <div aria-hidden className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-[1.2deg] rounded-md border border-border/50 bg-card/60 transition-transform duration-500 group-hover:translate-x-3 group-hover:translate-y-2 group-hover:rotate-[2.5deg]" />
      <div aria-hidden className="absolute inset-0 -translate-x-1 translate-y-1 -rotate-[1deg] rounded-md border border-border/40 bg-card/40 transition-transform duration-500 group-hover:-translate-x-2.5 group-hover:-rotate-[2deg]" />
      <div
        role="link"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
        className="relative cursor-pointer overflow-hidden rounded-md border border-border/70 bg-card text-right shadow-deep transition-transform duration-500 group-hover:-translate-y-1"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          {dropping && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 font-mono text-xs tracking-[0.12em] backdrop-blur">
              {dropping === "saving" ? "שומרת תמונת כיסוי..." : "שחררי כאן להחלפת הכיסוי"}
            </div>
          )}
          <RotatingCover
            pool={pool}
            fast={hover}
            interval={6500}
            eager={index < 4}
            alt={gallery.name}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="absolute inset-0"
            onIndex={(i, n) => setPos([i, n])}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <span className="absolute left-0 top-0 bg-background/85 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-foreground backdrop-blur">{gallery.category}</span>
          {pos[1] > 1 && (
            <span className="absolute bottom-3 left-3 font-mono text-[10px] tracking-[0.12em] text-white/80 opacity-0 transition-opacity group-hover:opacity-100" style={{ direction: "ltr" }}>
              {String(pos[0] + 1).padStart(2, "0")} / {String(pos[1]).padStart(2, "0")}
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-2 p-4">
          <div className="min-w-0">
            <span aria-hidden className="arch-num">{String(index + 1).padStart(3, "0")}</span>
            {nameNode}
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{gallery.artworkCount} עבודות</p>
          </div>
          {menu}
        </div>
      </div>
    </motion.div>
  );
};

const GalleryGrid = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEditMode } = useEditMode();
  const { toast } = useToast();

  const { data: categories = [] } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "הכל";
  const setActiveCategory = (cat: string) => {
    if (cat === "הכל") setSearchParams({}, { replace: true });
    else setSearchParams({ category: cat }, { replace: true });
  };
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    cover_image: "",
  });

  const { data: home, isLoading, isError } = useQuery({
    queryKey: ["galleries"],
    queryFn: async () => {
      const [{ data, error }, { data: activity }] = await Promise.all([
        supabase
          .from("neo_galleries")
          .select("id, name, slug, description, category, cover_image, sort_order, updated_at, artworks:neo_artworks(count)")
          .order("sort_order", { ascending: true }),
        supabase
          .from("neo_artworks")
          .select("id, title, gallery_id, created_at, image_url, media_type")
          .order("created_at", { ascending: false }),
      ]);
      if (error) throw error;

      const latestByGallery = new Map<string, string>();
      const previews = new Map<string, string[]>();
      (activity ?? []).forEach((a) => {
        if (!latestByGallery.has(a.gallery_id)) latestByGallery.set(a.gallery_id, a.created_at);
        const list = previews.get(a.gallery_id) ?? [];
        if (a.image_url && list.length < 16) previews.set(a.gallery_id, [...list, a.image_url]);
      });

      const galleries = (data ?? [])
        .map((g: any) => ({
          ...g,
          artworkCount: g.artworks?.[0]?.count ?? 0,
          lastActivity: latestByGallery.get(g.id) ?? g.updated_at ?? "",
          previews: previews.get(g.id) ?? [],
        }))
        .sort(bySortOrder) as GalleryItem[];
      const latest = (activity ?? []).filter((a) => a.image_url).slice(0, 18) as StripWork[];
      return { galleries, latest };
    },
  });
  const galleries = home?.galleries ?? [];

  const prefetch = (g: GalleryItem) => {
    queryClient.prefetchQuery({ queryKey: galleryKey(g.slug), queryFn: () => fetchGallery(g.slug), staleTime: 60_000 });
    queryClient.prefetchQuery({ queryKey: rootArtworksKey(g.id), queryFn: () => fetchRootArtworks(g.id), staleTime: 60_000 });
  };

  // Categories ordered by most recent artwork activity (newest first)
  // Cover pool of every category: the images of all its galleries
  const catPools = useMemo(() => {
    const m = new Map<string, string[]>();
    const all: string[] = [];
    galleries.forEach((g) => {
      const imgs = [g.cover_image, ...g.previews].filter(Boolean);
      m.set(g.category, [...(m.get(g.category) ?? []), ...imgs]);
      all.push(...imgs.slice(0, 3));
    });
    m.set("הכל", all);
    return m;
  }, [galleries]);

  // Lists keep the order set by dragging
  const sortedCategories = useMemo(() => [...categories].sort(bySortOrder), [categories]);

  // Drag a gallery onto a gallery: it takes that place. Onto a category chip: it moves to that category.
  const [chipTarget, setChipTarget] = useState<string | null>(null);
  const reorderGallery = async (draggedId: string, targetId: string) => {
    const from = galleries.findIndex((g) => g.id === draggedId), to = galleries.findIndex((g) => g.id === targetId);
    if (from < 0 || to < 0) return;
    const next = moveItem(galleries, from, to).map((g, i) => ({ ...g, sort_order: i }));
    queryClient.setQueryData(["galleries"], (old: any) => (old ? { ...old, galleries: next } : old));
    const err = await saveOrder("neo_galleries", moveItem(galleries, from, to));
    if (err) toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    refresh();
  };
  const dropOnChip = async (e: React.DragEvent, cat: string) => {
    e.preventDefault();
    setChipTarget(null);
    const item = getDragItem(e);
    if (!item) return;
    if (item.kind === "gallery" && cat !== "הכל") {
      const g = galleries.find((x) => x.id === item.id);
      if (!g || g.category === cat) return;
      const { error } = await supabase.from("neo_galleries").update({ category: cat }).eq("id", g.id);
      if (error) return toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      toast({ title: `"${g.name}" עברה לקטגוריה ${cat}` });
      refresh();
    } else if (item.kind === "category" && cat !== "הכל") {
      const from = sortedCategories.findIndex((c) => c.id === item.id), to = sortedCategories.findIndex((c) => c.name === cat);
      if (from < 0 || to < 0 || from === to) return;
      const next = moveItem(sortedCategories, from, to);
      queryClient.setQueryData(["categories"], next.map((c, i) => ({ ...c, sort_order: i })));
      const err = await saveOrder("neo_categories", next);
      if (err) toast({ title: "שגיאה", description: err.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  };

  const filtered = useMemo(
    () =>
      activeCategory === "הכל"
        ? galleries
        : galleries.filter((g) => g.category === activeCategory),
    [activeCategory, galleries],
  );

  // ── Create in place: category chip, gallery tile, cover by drop ──
  const [newCat, setNewCat] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [ng, setNg] = useState<{ name: string; category: string; file: File | null }>({ name: "", category: "", file: null });
  const [creating, setCreating] = useState(false);

  const createCategory = async () => {
    const name = newCat.trim();
    if (!name) return setCatOpen(false);
    const max = Math.max(-1, ...categories.map((c) => c.sort_order ?? 0));
    const { error } = await supabase.from("neo_categories").insert({ name, sort_order: max + 1 });
    if (error) return toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
    toast({ title: `הקטגוריה "${name}" נוספה` });
    setNewCat("");
    setCatOpen(false);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    setActiveCategory(name);
  };

  const createGallery = async (close: () => void) => {
    const name = ng.name.trim();
    const category = ng.category || (activeCategory !== "הכל" ? activeCategory : sortedCategories[0]?.name);
    if (!name || !category) return toast({ title: "צריך שם וקטגוריה", variant: "destructive" });
    const base = slugify(name);
    if (!base) return toast({ title: "השם חייב להכיל אותיות או מספרים", variant: "destructive" });
    setCreating(true);
    try {
      const cover_image = ng.file ? await uploadImage(ng.file, "covers") : "";
      const max = Math.max(-1, ...galleries.map((g) => g.sort_order ?? 0));
      const { error } = await supabase.from("neo_galleries").insert({
        name, category, cover_image, description: "", sort_order: max + 1,
        slug: uniqueSlug(base, new Set(galleries.map((g) => g.slug))),
      });
      if (error) throw error;
      toast({ title: `הגלריה "${name}" נוצרה` });
      setNg({ name: "", category: "", file: null });
      close();
      refresh();
    } catch (e: any) {
      toast({ title: "שגיאה", description: friendlyDbError(e), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const replaceCover = async (g: GalleryItem, f: File) => {
    try {
      const url = await uploadImage(f, "covers");
      const { error } = await supabase.from("neo_galleries").update({ cover_image: url }).eq("id", g.id);
      if (error) throw error;
      toast({ title: `תמונת הכיסוי של "${g.name}" הוחלפה` });
      refresh();
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["galleries"] });
  };

  const openNewGallery = () => {
    setEditingGallery(null);
    setForm({ name: "", description: "", category: "", cover_image: "" });
    setFormOpen(true);
  };

  const openEditGallery = (gallery: GalleryItem) => {
    setEditingGallery(gallery);
    setForm({
      name: gallery.name,
      description: gallery.description ?? "",
      category: gallery.category,
      cover_image: gallery.cover_image ?? "",
    });
    setFormOpen(true);
  };

  const handleSaveGallery = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      toast({ title: "שגיאה", description: "שם וקטגוריה הם שדות חובה", variant: "destructive" });
      return;
    }

    const baseSlug = slugify(form.name);
    if (!baseSlug) {
      toast({ title: "שגיאה", description: "השם חייב להכיל אותיות או מספרים", variant: "destructive" });
      return;
    }

    const takenSlugs = new Set(
      galleries.filter((g) => g.id !== editingGallery?.id).map((g) => g.slug),
    );
    const normalizedSlug = uniqueSlug(baseSlug, takenSlugs);

    setSaving(true);

    try {
      if (editingGallery) {
        const { error } = await supabase
          .from("neo_galleries")
          .update({
            name: form.name,
            slug: normalizedSlug,
            description: form.description,
            category: form.category,
            cover_image: form.cover_image,
          })
          .eq("id", editingGallery.id);

        if (error) throw error;
        toast({ title: "הגלריה עודכנה" });
      } else {
        const { data: maxRow } = await supabase
          .from("neo_galleries")
          .select("sort_order")
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;

        const { error } = await supabase.from("neo_galleries").insert({
          name: form.name,
          slug: normalizedSlug,
          description: form.description,
          category: form.category,
          cover_image: form.cover_image,
          sort_order: nextSortOrder,
        });

        if (error) throw error;
        toast({ title: "הגלריה נוצרה" });
      }

      setFormOpen(false);
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGallery = async () => {
    if (!deleteTarget) return;

    const { error } = await supabase.from("neo_galleries").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
      return;
    }

    toast({ title: "הגלריה נמחקה" });
    setDeleteTarget(null);
    refresh();
  };

  useDockActions([{ id: "new-gallery", label: "גלריה חדשה", onClick: openNewGallery, primary: true }], [galleries.length]);

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 lg:px-12" dir="rtl">
      <section className="mb-12 mt-4 grid items-end gap-8 lg:grid-cols-[1.618fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}>
          <span className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground">תיק עבודות</span>
          <h1 className="mt-2 max-w-4xl text-5xl font-extralight leading-[1.05] tracking-tight md:text-7xl">
            ענת שטיבלמן
            <span className="block text-muted-foreground">תמונות, סרטים, פליירים ומודלים</span>
          </h1>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            {galleries.length} גלריות · {galleries.reduce((n, g) => n + g.artworkCount, 0)} עבודות
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}>
          <HomeDemo />
        </motion.div>
      </section>
      {home?.latest && home.latest.length > 0 && <LatestStrip works={home.latest} />}


      {/* Section: Categories */}
      <section className="mb-10">
        <h2 className="mb-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">קטגוריות</h2>
        <div className="flex flex-wrap gap-2">
           {["הכל", ...sortedCategories.map((c) => c.name)].map((cat) => {
            const catObj = sortedCategories.find((c) => c.name === cat);
            const count = cat === "הכל" ? galleries.length : galleries.filter((g) => g.category === cat).length;
            return (
              <div
                key={cat}
                role="button"
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                draggable={!!catObj}
                onDragStart={(e) => catObj && setDragItem(e as unknown as React.DragEvent, "category", catObj.id)}
                onDragOver={(e) => { if (cat !== "הכל" && isItemDrag(e as unknown as React.DragEvent)) { e.preventDefault(); if (chipTarget !== cat) setChipTarget(cat); } }}
                onDragLeave={() => setChipTarget(null)}
                onDrop={(e) => dropOnChip(e as unknown as React.DragEvent, cat)}
                className={`arch-btn h-9 cursor-pointer gap-2 ps-1 ${chipTarget === cat ? "outline outline-2 outline-offset-4 outline-foreground" : ""}`}
              >
                {/* The category's own cover: a small square that rotates through all its galleries */}
                {(catPools.get(cat)?.length ?? 0) > 0 && (
                  <RotatingCover pool={catPools.get(cat)!} width={96} interval={5200} className="h-7 w-7 shrink-0" />
                )}
                {catObj && isEditMode ? (
                  <InlineEdit
                    value={cat}
                    enabled
                    className="text-sm font-medium"
                    inputClassName="text-sm h-6 w-24"
                    onSave={async (newName) => {
                      const { error } = await supabase.from("neo_categories").update({ name: newName }).eq("id", catObj.id);
                      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                      queryClient.invalidateQueries({ queryKey: ["categories"] });
                      queryClient.invalidateQueries({ queryKey: ["galleries"] });
                      toast({ title: "הקטגוריה עודכנה" });
                    }}
                  />
                ) : (
                  <span>{cat}</span>
                )}
                {count > 0 && <span aria-hidden className="arch-num">{String(count).padStart(2, "0")}</span>}
              </div>
            );
          })}
          {catOpen ? (
            <form
              data-own-paste
              onSubmit={(e) => { e.preventDefault(); createCategory(); }}
              className="flex h-9 items-stretch border border-foreground"
            >
              <input
                autoFocus
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setCatOpen(false)}
                onBlur={() => !newCat.trim() && setCatOpen(false)}
                placeholder="שם הקטגוריה"
                aria-label="שם הקטגוריה החדשה"
                className="w-40 bg-transparent px-3 text-sm outline-none"
              />
              <button type="submit" className="h-full min-h-0 bg-foreground px-3 font-mono text-[11px] text-background">שמירה</button>
            </form>
          ) : (
            <button type="button" onClick={() => setCatOpen(true)} className="arch-btn h-9 border-dashed text-muted-foreground">
              + קטגוריה
            </button>
          )}
        </div>
      </section>

      {/* Section: Galleries */}
      <section>
        <h2 className="mb-6 font-mono text-xs tracking-[0.2em] text-muted-foreground">
          {activeCategory === "הכל" ? "כל הגלריות" : `גלריות · ${activeCategory}`}
        </h2>

      {isLoading && (
        <div className="art-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-card">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא ניתן לטעון גלריות</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {!isLoading && !isError && (
        <>

          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              <CreateTile
                key="new-gallery"
                title="גלריה חדשה"
                busy={creating}
                className="min-h-[260px]"
                idle={<><span className="text-3xl font-extralight">+</span><span className="font-mono text-[11px] tracking-[0.15em]">גלריה חדשה</span><span className="text-xs">אפשר לגרור לכאן תמונת כיסוי</span></>}
                onPasteImage={(f) => setNg((p) => ({ ...p, file: f }))}
                onSubmit={(close) => createGallery(close)}
              >
                {(close) => (
                  <div className="flex flex-col gap-3">
                    <ImageWell file={ng.file} onFile={(f) => setNg((p) => ({ ...p, file: f }))} label="תמונת כיסוי" className="aspect-[4/3] w-full" />
                    <CreateName value={ng.name} onChange={(v) => setNg((p) => ({ ...p, name: v }))} placeholder="שם הגלריה" />
                    <select
                      value={ng.category || (activeCategory !== "הכל" ? activeCategory : sortedCategories[0]?.name ?? "")}
                      onChange={(e) => setNg((p) => ({ ...p, category: e.target.value }))}
                      aria-label="קטגוריה"
                      className="h-10 border border-foreground/30 bg-transparent px-2 text-sm"
                    >
                      {sortedCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" disabled={creating} className="arch-btn arch-btn-ink flex-1">{creating ? "שומרת..." : "יצירת הגלריה"}</button>
                      <button type="button" onClick={close} className="arch-btn arch-btn-quiet">ביטול</button>
                    </div>
                  </div>
                )}
              </CreateTile>
            {filtered.map((gallery, index) => (
              <GalleryCard
                onCover={(f) => replaceCover(gallery, f)}
                onDropGallery={(id) => reorderGallery(id, gallery.id)}
                key={gallery.id}
                gallery={gallery}
                index={index}
                onOpen={() => navigate(`/gallery/${gallery.slug}`)}
                onPrefetch={() => prefetch(gallery)}
                nameNode={
                  <InlineEdit
                    value={gallery.name}
                    enabled={isEditMode}
                    as="h3"
                    className="text-lg font-light text-foreground"
                    inputClassName="text-base w-full"
                    onSave={async (newName) => {
                      const { error } = await supabase.from("neo_galleries").update({ name: newName }).eq("id", gallery.id);
                      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                      refresh();
                      toast({ title: "שם הגלריה עודכן" });
                    }}
                  />
                }
                menu={
                  isEditMode && (
                    <DropdownMenu dir="rtl">
                      <DropdownMenuTrigger asChild>
                        <button type="button" onClick={(e) => e.stopPropagation()} className="arch-btn h-8 px-2.5 text-[10px]">
                          פעולות
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openEditGallery(gallery)}>עריכת גלריה</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setDeleteTarget(gallery)}>מחיקה</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }
              />
            ))}
          </div>
        </>
      )}
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingGallery ? "עריכת גלריה" : "גלריה חדשה"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>שם *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>קטגוריה *</Label>
              <Select
                value={form.category}
                onValueChange={(category) => setForm((prev) => ({ ...prev, category }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחרי קטגוריה" />
                </SelectTrigger>
              <SelectContent>
                  {sortedCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>תמונת כיסוי</Label>
              <div className="mt-1">
                <ImageDropZone
                  value={form.cover_image}
                  onChange={(url) => setForm((prev) => ({ ...prev, cover_image: url }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              ביטול
            </Button>
            <Button onClick={handleSaveGallery} disabled={saving}>
              {editingGallery ? "שמירה" : "יצירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-card text-foreground" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת גלריה</AlertDialogTitle>
            <AlertDialogDescription>
              למחוק את "{deleteTarget?.name}"? הגלריה תישמר בסל המחזור של המערכת.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGallery}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GalleryGrid;
