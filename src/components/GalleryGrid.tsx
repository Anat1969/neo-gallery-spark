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
import { thumbUrl } from "@/lib/media";
import { fetchGallery, fetchRootArtworks, galleryKey, rootArtworksKey } from "@/lib/queries";
import { useDockActions } from "@/contexts/DockContext";

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
const GalleryCard = ({ gallery, onOpen, onPrefetch, menu, nameNode, index }: {
  gallery: GalleryItem;
  onOpen: () => void;
  onPrefetch: () => void;
  menu: React.ReactNode;
  nameNode: React.ReactNode;
  index: number;
}) => {
  const frames = useMemo(() => [gallery.cover_image, ...gallery.previews].filter(Boolean).slice(0, 5), [gallery]);
  const [frame, setFrame] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!hover || frames.length < 2) {
      setFrame(0);
      return;
    }
    const t = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), 850);
    return () => window.clearInterval(t);
  }, [hover, frames.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "80px" }}
      transition={{ duration: 0.55, delay: (index % 8) * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
      className="group relative"
      onPointerEnter={() => { setHover(true); onPrefetch(); }}
      onPointerLeave={() => setHover(false)}
    >
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
          {frames.length === 0 && <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">אין תמונה</div>}
          {frames.map((src, i) => (
            <img
              key={src + i}
              src={thumbUrl(src, 640)}
              srcSet={`${thumbUrl(src, 400)} 400w, ${thumbUrl(src, 640)} 640w, ${thumbUrl(src, 960)} 960w`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              alt={i === 0 ? gallery.name : ""}
              loading={index < 4 && i === 0 ? "eager" : "lazy"}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ${i === frame ? "scale-105 opacity-100" : "scale-100 opacity-0"}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 font-mono text-[10px] text-foreground backdrop-blur">{gallery.category}</span>
          {frames.length > 1 && (
            <div className="absolute inset-x-3 bottom-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {frames.map((_, i) => <span key={i} className={`h-0.5 flex-1 rounded-full ${i === frame ? "bg-white" : "bg-white/35"}`} />)}
            </div>
          )}
        </div>
        <div className="flex items-start justify-between gap-2 p-4">
          <div className="min-w-0">
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
        if (a.image_url && list.length < 4) previews.set(a.gallery_id, [...list, a.image_url]);
      });

      const galleries = (data ?? [])
        .map((g: any) => ({
          ...g,
          artworkCount: g.artworks?.[0]?.count ?? 0,
          lastActivity: latestByGallery.get(g.id) ?? g.updated_at ?? "",
          previews: previews.get(g.id) ?? [],
        }))
        .sort((a: any, b: any) => (b.lastActivity || "").localeCompare(a.lastActivity || "")) as GalleryItem[];
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
  const sortedCategories = useMemo(() => {
    const latestByCat = new Map<string, string>();
    galleries.forEach((g) => {
      const cur = latestByCat.get(g.category) ?? "";
      if ((g.lastActivity ?? "") > cur) latestByCat.set(g.category, g.lastActivity ?? "");
    });
    return [...categories].sort((a, b) =>
      (latestByCat.get(b.name) ?? "").localeCompare(latestByCat.get(a.name) ?? ""),
    );
  }, [categories, galleries]);

  const filtered = useMemo(
    () =>
      activeCategory === "הכל"
        ? galleries
        : galleries.filter((g) => g.category === activeCategory),
    [activeCategory, galleries],
  );

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
      <section className="mb-12 mt-4">
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
                className={`flex cursor-pointer items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
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
                {count > 0 && <span className="mr-1 text-xs opacity-75">{count}</span>}
              </div>
            );
          })}
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

      {!isLoading && !isError && galleries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-center text-lg text-muted-foreground">עדיין אין גלריות. "גלריה חדשה" נמצא בפס העריכה למטה.</p>
        </div>
      )}

      {!isLoading && !isError && galleries.length > 0 && (
        <>

          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((gallery, index) => (
              <GalleryCard
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
                        <button type="button" onClick={(e) => e.stopPropagation()} className="h-8 min-h-0 shrink-0 rounded-full border border-border px-3 font-mono text-[10px] text-muted-foreground hover:text-foreground">
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
