import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  X,
  ArrowRight,
} from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

interface Gallery {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  coverImage: string;
  artworkCount: number;
  sortOrder: number;
}

interface Artwork {
  id: string;
  galleryId: string;
  title: string;
  topic: string;
  post: string;
  imageUrl: string;
  tags: string[];
  style: string;
  concept: string;
  year: number;
  inspirationUrl: string;
  galleryName: string;
}

const CATEGORIES_FALLBACK = ["אופנה", "פנים", "אדריכלות", "כלים", "אומנות", "פיסול", "צילום"];

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s-]/g, "")
    .replace(/[\s]+/g, "-");

const AdminPanel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: categoriesData = [], isLoading: categoriesLoading } = useCategories();
  const categoryNames = categoriesData.length > 0 ? categoriesData.map((c) => c.name) : CATEGORIES_FALLBACK;

  // Category CRUD state
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<{ id: string; name: string; sort_order: number } | null>(null);
  const [catName, setCatName] = useState("");
  const [deleteCatTarget, setDeleteCatTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: galleries = [], isLoading: galleriesLoading } = useQuery({
    queryKey: ["admin-galleries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("id, name, slug, description, category, cover_image, sort_order, artworks(count)")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description ?? "",
        category: row.category,
        coverImage: row.cover_image ?? "",
        sortOrder: row.sort_order ?? 0,
        artworkCount: row.artworks?.[0]?.count ?? 0,
      })) as Gallery[];
    },
  });

  const { data: artworks = [], isLoading: artworksLoading } = useQuery({
    queryKey: ["admin-artworks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select(
          "id, gallery_id, title, topic, post, image_url, tags, style, concept, year, inspiration_url, gallery:galleries(name)",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        galleryId: row.gallery_id,
        title: row.title,
        topic: row.topic ?? "",
        post: row.post ?? "",
        imageUrl: row.image_url ?? "",
        tags: row.tags ?? [],
        style: row.style ?? "",
        concept: row.concept ?? "",
        year: row.year ?? new Date().getFullYear(),
        inspirationUrl: row.inspiration_url ?? "",
        galleryName: row.gallery?.name ?? "",
      })) as Artwork[];
    },
  });

  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
  const [gForm, setGForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: "",
    coverImage: "",
  });

  const [artworkDialogOpen, setArtworkDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [aForm, setAForm] = useState({
    galleryId: "",
    title: "",
    topic: "",
    post: "",
    imageUrl: "",
    tags: [] as string[],
    style: "",
    concept: "",
    year: new Date().getFullYear(),
    inspirationUrl: "",
  });
  const [tagInput, setTagInput] = useState("");

  const [filterGalleryId, setFilterGalleryId] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "gallery" | "artwork"; id: string; name: string } | null>(null);

  const isLoading = galleriesLoading || artworksLoading;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
    queryClient.invalidateQueries({ queryKey: ["admin-artworks"] });
    queryClient.invalidateQueries({ queryKey: ["galleries"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  // --- Category CRUD ---
  const openNewCategory = () => {
    setEditingCat(null);
    setCatName("");
    setCatDialogOpen(true);
  };

  const openEditCategory = (cat: { id: string; name: string; sort_order: number }) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!catName.trim()) {
      toast({ title: "שגיאה", description: "שם הקטגוריה הוא שדה חובה", variant: "destructive" });
      return;
    }

    try {
      if (editingCat) {
        const { error } = await supabase
          .from("categories")
          .update({ name: catName.trim() })
          .eq("id", editingCat.id);
        if (error) throw error;
        toast({ title: "הקטגוריה עודכנה" });
      } else {
        const maxOrder = categoriesData.length > 0 ? Math.max(...categoriesData.map((c) => c.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from("categories")
          .insert({ name: catName.trim(), sort_order: maxOrder });
        if (error) throw error;
        toast({ title: "הקטגוריה נוצרה" });
      }
      setCatDialogOpen(false);
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: error.message ?? "הפעולה נכשלה", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "הקטגוריה נמחקה" });
    setDeleteCatTarget(null);
    refresh();
  };

  const openNewGallery = () => {
    setEditingGallery(null);
    setGForm({ name: "", slug: "", description: "", category: "", coverImage: "" });
    setGalleryDialogOpen(true);
  };

  const openEditGallery = (g: Gallery) => {
    setEditingGallery(g);
    setGForm({
      name: g.name,
      slug: g.slug,
      description: g.description,
      category: g.category,
      coverImage: g.coverImage,
    });
    setGalleryDialogOpen(true);
  };

  const saveGallery = async () => {
    if (!gForm.name || !gForm.category) {
      toast({ title: "שגיאה", description: "שם וקטגוריה הם שדות חובה", variant: "destructive" });
      return;
    }

    const normalizedSlug = (gForm.slug || slugify(gForm.name)).trim();

    try {
      if (editingGallery) {
        const { error } = await supabase
          .from("galleries")
          .update({
            name: gForm.name,
            slug: normalizedSlug,
            description: gForm.description,
            category: gForm.category,
            cover_image: gForm.coverImage,
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

        const { error } = await supabase.from("galleries").insert({
          name: gForm.name,
          slug: normalizedSlug,
          description: gForm.description,
          category: gForm.category,
          cover_image: gForm.coverImage,
          sort_order: (maxRow?.sort_order ?? -1) + 1,
          created_by: user?.id ?? null,
        });

        if (error) throw error;
        toast({ title: "הגלריה נוצרה" });
      }

      setGalleryDialogOpen(false);
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: error.message ?? "הפעולה נכשלה", variant: "destructive" });
    }
  };

  const deleteGallery = async (id: string) => {
    const { error } = await supabase.from("galleries").delete().eq("id", id);

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "הגלריה נמחקה" });
    setDeleteTarget(null);
    refresh();
  };

  const openNewArtwork = () => {
    setEditingArtwork(null);
    setAForm({
      galleryId: galleries[0]?.id ?? "",
      title: "",
      topic: "",
      post: "",
      imageUrl: "",
      tags: [],
      style: "",
      concept: "",
      year: new Date().getFullYear(),
      inspirationUrl: "",
    });
    setTagInput("");
    setArtworkDialogOpen(true);
  };

  const openEditArtwork = (a: Artwork) => {
    setEditingArtwork(a);
    setAForm({
      galleryId: a.galleryId,
      title: a.title,
      topic: a.topic,
      post: a.post,
      imageUrl: a.imageUrl,
      tags: [...a.tags],
      style: a.style,
      concept: a.concept,
      year: a.year,
      inspirationUrl: a.inspirationUrl,
    });
    setTagInput("");
    setArtworkDialogOpen(true);
  };

  const saveArtwork = async () => {
    if (!aForm.title || !aForm.galleryId) {
      toast({ title: "שגיאה", description: "שם וגלריה הם שדות חובה", variant: "destructive" });
      return;
    }

    const payload = {
      gallery_id: aForm.galleryId,
      title: aForm.title,
      topic: aForm.topic,
      post: aForm.post,
      image_url: aForm.imageUrl,
      tags: aForm.tags,
      style: aForm.style,
      concept: aForm.concept,
      year: aForm.year,
      inspiration_url: aForm.inspirationUrl,
    };

    try {
      if (editingArtwork) {
        const { error } = await supabase
          .from("artworks")
          .update(payload)
          .eq("id", editingArtwork.id);

        if (error) throw error;
        toast({ title: "היצירה עודכנה" });
      } else {
        const { data: maxRow } = await supabase
          .from("artworks")
          .select("sort_order")
          .eq("gallery_id", aForm.galleryId)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error } = await supabase
          .from("artworks")
          .insert({ ...payload, sort_order: (maxRow?.sort_order ?? -1) + 1 });

        if (error) throw error;
        toast({ title: "היצירה נוצרה" });
      }

      setArtworkDialogOpen(false);
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: error.message ?? "הפעולה נכשלה", variant: "destructive" });
    }
  };

  const deleteArtwork = async (id: string) => {
    const { error } = await supabase.from("artworks").delete().eq("id", id);

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "היצירה נמחקה" });
    setDeleteTarget(null);
    refresh();
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !aForm.tags.includes(t)) {
      setAForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setAForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const filteredArtworks = useMemo(
    () => (filterGalleryId === "all" ? artworks : artworks.filter((a) => a.galleryId === filterGalleryId)),
    [artworks, filterGalleryId],
  );

  const isEmpty = !isLoading && galleries.length === 0;

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Button>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">ניהול</h1>
        </div>
      </div>

      {isLoading && <p className="py-12 text-center text-muted-foreground">טוען נתונים...</p>}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">אין תוכן עדיין — צרי את הגלריה הראשונה שלך</p>
          <Button onClick={openNewGallery} className="gap-2">
            <Plus className="h-4 w-4" />
            גלריה חדשה
          </Button>
        </div>
      )}

      {!isLoading && !isEmpty && (
        <Tabs defaultValue="galleries" className="w-full">
          <TabsList className="mb-6 bg-secondary">
            <TabsTrigger value="galleries">גלריות</TabsTrigger>
            <TabsTrigger value="artworks">יצירות</TabsTrigger>
            <TabsTrigger value="categories">קטגוריות</TabsTrigger>
          </TabsList>

          <TabsContent value="galleries">
            <div className="mb-4 flex justify-end">
              <Button onClick={openNewGallery} className="gap-2">
                <Plus className="h-4 w-4" />
                גלריה חדשה
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-border bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground">שם</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">קטגוריה</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">יצירות</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {galleries.map((g) => (
                    <tr key={g.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{g.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.artworkCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEditGallery(g)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => navigate(`/gallery/${g.slug}`)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget({ type: "gallery", id: g.id, name: g.name })} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="artworks">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Select value={filterGalleryId} onValueChange={setFilterGalleryId}>
                <SelectTrigger className="w-48 border-border bg-secondary text-foreground">
                  <SelectValue placeholder="סינון לפי גלריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הגלריות</SelectItem>
                  {galleries.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={openNewArtwork} className="gap-2">
                <Plus className="h-4 w-4" />
                יצירה חדשה
              </Button>
            </div>

            {filteredArtworks.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">אין יצירות להצגה</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-right text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-muted-foreground">תמונה</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">שם</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">גלריה</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArtworks.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          {a.imageUrl ? (
                            <img src={a.imageUrl} alt={a.title} className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-secondary" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{a.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.galleryName}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEditArtwork(a)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteTarget({ type: "artwork", id: a.id, name: a.title })} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <div className="mb-4 flex justify-end">
              <Button onClick={openNewCategory} className="gap-2" title="הוספת קטגוריה חדשה למערכת">
                <Plus className="h-4 w-4" />
                קטגוריה חדשה
              </Button>
            </div>

            {categoriesData.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">אין קטגוריות עדיין</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-right text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-muted-foreground">שם</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">גלריות</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">סדר</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriesData.map((cat) => {
                      const galleryCount = galleries.filter((g) => g.category === cat.name).length;
                      return (
                        <tr key={cat.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{galleryCount}</td>
                          <td className="px-4 py-3 text-muted-foreground">{cat.sort_order}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openEditCategory(cat)} title="עריכת שם הקטגוריה" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteCatTarget({ id: cat.id, name: cat.name })} title="מחיקת הקטגוריה" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={galleryDialogOpen} onOpenChange={setGalleryDialogOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGallery ? "עריכת גלריה" : "גלריה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-foreground">שם *</Label>
              <Input value={gForm.name} onChange={(e) => setGForm((p) => ({ ...p, name: e.target.value, slug: p.slug || slugify(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-foreground">Slug</Label>
              <Input value={gForm.slug} onChange={(e) => setGForm((p) => ({ ...p, slug: e.target.value }))} dir="ltr" className="mt-1 text-left" />
            </div>
            <div>
              <Label className="text-foreground">תיאור</Label>
              <Textarea value={gForm.description} onChange={(e) => setGForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="mt-1" />
            </div>
            <div>
              <Label className="text-foreground">קטגוריה *</Label>
              <Select value={gForm.category} onValueChange={(v) => setGForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחרי קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {categoryNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">תמונת כיסוי (URL)</Label>
              <Input value={gForm.coverImage} onChange={(e) => setGForm((p) => ({ ...p, coverImage: e.target.value }))} dir="ltr" className="mt-1 text-left" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGalleryDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={saveGallery}>{editingGallery ? "שמירה" : "יצירה"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={artworkDialogOpen} onOpenChange={setArtworkDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingArtwork ? "עריכת יצירה" : "יצירה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-foreground">גלריה *</Label>
              <Select value={aForm.galleryId} onValueChange={(v) => setAForm((p) => ({ ...p, galleryId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחרי גלריה" />
                </SelectTrigger>
                <SelectContent>
                  {galleries.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">שם *</Label>
              <Input value={aForm.title} onChange={(e) => setAForm((p) => ({ ...p, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-foreground">נושא</Label>
              <Input value={aForm.topic} onChange={(e) => setAForm((p) => ({ ...p, topic: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-foreground">פוסט</Label>
              <Textarea value={aForm.post} onChange={(e) => setAForm((p) => ({ ...p, post: e.target.value }))} rows={3} className="mt-1" />
            </div>
            <div>
              <Label className="text-foreground">תמונה (URL)</Label>
              <Input value={aForm.imageUrl} onChange={(e) => setAForm((p) => ({ ...p, imageUrl: e.target.value }))} dir="ltr" className="mt-1 text-left" />
            </div>
            <div>
              <Label className="text-foreground">תגיות</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="הקלידי תגית + Enter"
                />
              </div>
              {aForm.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {aForm.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-primary px-2.5 py-0.5 text-xs text-primary">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">סגנון</Label>
                <Input value={aForm.style} onChange={(e) => setAForm((p) => ({ ...p, style: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-foreground">קונספט</Label>
                <Input value={aForm.concept} onChange={(e) => setAForm((p) => ({ ...p, concept: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">שנה</Label>
                <Input type="number" value={aForm.year} onChange={(e) => setAForm((p) => ({ ...p, year: parseInt(e.target.value, 10) || new Date().getFullYear() }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-foreground">קישור השראה</Label>
                <Input value={aForm.inspirationUrl} onChange={(e) => setAForm((p) => ({ ...p, inspirationUrl: e.target.value }))} dir="ltr" className="mt-1 text-left" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArtworkDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={saveArtwork}>{editingArtwork ? "שמירה" : "יצירה"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת {deleteTarget?.type === "gallery" ? "גלריה" : "יצירה"}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              למחוק את "{deleteTarget?.name}"? פעולה זו אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80">ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget?.type === "gallery" ? deleteGallery(deleteTarget.id) : deleteArtwork(deleteTarget!.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCat ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-foreground">שם *</Label>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatDialogOpen(false)}>ביטול</Button>
            <Button onClick={saveCategory}>{editingCat ? "שמירה" : "יצירה"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category delete confirm */}
      <AlertDialog open={!!deleteCatTarget} onOpenChange={(open) => !open && setDeleteCatTarget(null)}>
        <AlertDialogContent className="border-border bg-card text-foreground" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קטגוריה</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              למחוק את "{deleteCatTarget?.name}"? פעולה זו אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80">ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCatTarget && deleteCategory(deleteCatTarget.id)}
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

export default AdminPanel;
