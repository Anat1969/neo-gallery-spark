import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ImageIcon, Pencil, Trash2, Plus } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";

interface GalleryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  cover_image: string;
  sort_order: number;
  artworkCount: number;
}

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s-]/g, "")
    .replace(/[\s]+/g, "-");

const GalleryGrid = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEditMode } = useEditMode();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: categories = [] } = useCategories();
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: "",
    cover_image: "",
  });

  const { data: galleries = [], isLoading, isError } = useQuery({
    queryKey: ["galleries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("id, name, slug, description, category, cover_image, sort_order, artworks(count)")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((g: any) => ({
        ...g,
        artworkCount: g.artworks?.[0]?.count ?? 0,
      })) as GalleryItem[];
    },
  });

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
    setForm({ name: "", slug: "", description: "", category: "", cover_image: "" });
    setFormOpen(true);
  };

  const openEditGallery = (gallery: GalleryItem) => {
    setEditingGallery(gallery);
    setForm({
      name: gallery.name,
      slug: gallery.slug,
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

    const normalizedSlug = (form.slug || slugify(form.name)).trim();
    if (!normalizedSlug) {
      toast({ title: "שגיאה", description: "slug לא תקין", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      if (editingGallery) {
        const { error } = await supabase
          .from("galleries")
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
          .from("galleries")
          .select("sort_order")
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;

        const { error } = await supabase.from("galleries").insert({
          name: form.name,
          slug: normalizedSlug,
          description: form.description,
          category: form.category,
          cover_image: form.cover_image,
          sort_order: nextSortOrder,
          created_by: user?.id ?? null,
        });

        if (error) throw error;
        toast({ title: "הגלריה נוצרה" });
      }

      setFormOpen(false);
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: error.message ?? "הפעולה נכשלה", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGallery = async () => {
    if (!deleteTarget) return;

    const { error } = await supabase.from("galleries").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "הגלריה נמחקה" });
    setDeleteTarget(null);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      <div className="mb-8 flex flex-wrap gap-2">
        {["הכל", ...categories.map((c) => c.name)].map((cat) => {
          const count = cat === "הכל" ? galleries.length : galleries.filter((g) => g.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat} {count > 0 && <span className="ml-1 text-xs opacity-75">{count}</span>}
            </button>
          );
        })}
      </div>

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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-center text-lg text-muted-foreground">עדיין אין גלריות — לחצי + כדי להתחיל</p>
          {isEditMode && (
            <Button onClick={openNewGallery} className="gap-2">
              <Plus className="h-4 w-4" />
              גלריה חדשה
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && galleries.length > 0 && (
        <>
          {isEditMode && (
            <div className="mb-4 flex justify-end">
              <Button onClick={openNewGallery} className="gap-2">
                <Plus className="h-4 w-4" />
                גלריה חדשה
              </Button>
            </div>
          )}

          <div className="art-grid">
            {filtered.map((gallery) => (
              <button
                key={gallery.id}
                onClick={() => navigate(`/gallery/${gallery.slug}`)}
                className="group relative overflow-hidden rounded-lg border border-border bg-card text-right transition-all hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
              >
                {isEditMode && (
                  <div className="absolute right-2 top-2 z-10 flex gap-1">
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        openEditGallery(gallery);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteTarget(gallery);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                )}

                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={gallery.cover_image}
                    alt={gallery.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {gallery.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-foreground">{gallery.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{gallery.artworkCount} עבודות</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

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
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                    slug: editingGallery ? prev.slug : slugify(e.target.value),
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                dir="ltr"
                className="mt-1 text-left"
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
                  {categories.map((cat) => (
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
              <Label>תמונת כיסוי (URL)</Label>
              <Input
                value={form.cover_image}
                onChange={(e) => setForm((prev) => ({ ...prev, cover_image: e.target.value }))}
                dir="ltr"
                className="mt-1 text-left"
              />
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
              למחוק את "{deleteTarget?.name}"? פעולה זו אינה הפיכה.
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
