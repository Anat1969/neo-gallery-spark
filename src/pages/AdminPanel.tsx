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
import { slugify, uniqueSlug, friendlyDbError } from "@/lib/slug";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  X,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Save,
} from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import ImageDropZone from "@/components/ImageDropZone";

interface Gallery {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  coverImage: string;
  artworkCount: number;
  sortOrder: number;
  projectName: string;
  appName: string;
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

type SortDirection = "asc" | "desc";
type GallerySortKey = "name" | "category" | "projectName" | "appName" | "artworkCount";
type ArtworkSortKey = "imageUrl" | "title" | "galleryName";
type CategorySortKey = "name" | "project_name" | "app_name" | "galleryCount" | "sort_order";

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
}

const SortableHeader = ({ label, active, direction, onSort }: SortableHeaderProps) => (
  <th scope="col" className="px-5 py-4 text-right">
    <Button
      type="button"
      variant="ghost"
      onClick={onSort}
      className="h-11 gap-2 px-2 text-base font-bold text-foreground hover:text-primary"
      aria-label={`מיון לפי ${label}`}
    >
      {label}
      {active ? (
        direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  </th>
);

const compareValues = (a: string | number, b: string | number, direction: SortDirection) => {
  const result = typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), "he", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
};

const CATEGORIES_FALLBACK = ["אופנה", "פנים", "אדריכלות", "כלים", "אומנות", "פיסול", "צילום"];

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
  const [catProjectName, setCatProjectName] = useState("");
  const [catAppName, setCatAppName] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [deleteCatTarget, setDeleteCatTarget] = useState<{ id: string; name: string } | null>(null);
  const [gallerySort, setGallerySort] = useState<{ key: GallerySortKey; direction: SortDirection }>({ key: "name", direction: "asc" });
  const [artworkSort, setArtworkSort] = useState<{ key: ArtworkSortKey; direction: SortDirection }>({ key: "title", direction: "asc" });
  const [categorySort, setCategorySort] = useState<{ key: CategorySortKey; direction: SortDirection }>({ key: "sort_order", direction: "asc" });
  const [gallerySearch, setGallerySearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [galleryMetadataDrafts, setGalleryMetadataDrafts] = useState<Record<string, { projectName: string; appName: string }>>({});
  const [categoryMetadataDrafts, setCategoryMetadataDrafts] = useState<Record<string, { projectName: string; appName: string }>>({});
  const [savingMetadataId, setSavingMetadataId] = useState<string | null>(null);

  const { data: galleries = [], isLoading: galleriesLoading } = useQuery({
    queryKey: ["admin-galleries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("id, name, slug, description, category, cover_image, sort_order, project_name, app_name, artworks(count)")
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
        projectName: row.project_name ?? "",
        appName: row.app_name ?? "",
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
    description: "",
    category: "",
    coverImage: "",
    projectName: "",
    appName: "",
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
    setCatProjectName("");
    setCatAppName("");
    setCatDialogOpen(true);
  };

  const openEditCategory = (cat: { id: string; name: string; sort_order: number; project_name?: string; app_name?: string }) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatProjectName(cat.project_name ?? "");
    setCatAppName(cat.app_name ?? "");
    setCatDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!catName.trim()) {
      toast({ title: "שגיאה", description: "שם הקטגוריה הוא שדה חובה", variant: "destructive" });
      return;
    }

    setIsSavingCategory(true);
    try {
      if (editingCat) {
        const { error } = await supabase
          .from("categories")
          .update({ name: catName.trim(), project_name: catProjectName.trim(), app_name: catAppName.trim() })
          .eq("id", editingCat.id);
        if (error) throw error;
        toast({ title: "הקטגוריה עודכנה" });
      } else {
        const maxOrder = categoriesData.length > 0 ? Math.max(...categoriesData.map((c) => c.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from("categories")
          .insert({ name: catName.trim(), sort_order: maxOrder, project_name: catProjectName.trim(), app_name: catAppName.trim() });
        if (error) throw error;
        toast({ title: "הקטגוריה נוצרה" });
      }
      setCatDialogOpen(false);
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
      return;
    }
    toast({ title: "הקטגוריה נמחקה" });
    setDeleteCatTarget(null);
    refresh();
  };

  const saveCategoryMetadata = async (category: { id: string; project_name?: string; app_name?: string }) => {
    const draft = categoryMetadataDrafts[category.id] ?? {
      projectName: category.project_name ?? "",
      appName: category.app_name ?? "",
    };
    setSavingMetadataId(`category-${category.id}`);
    try {
      const { error } = await supabase
        .from("categories")
        .update({ project_name: draft.projectName.trim(), app_name: draft.appName.trim() })
        .eq("id", category.id);
      if (error) throw error;
      setCategoryMetadataDrafts((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
      toast({ title: "פרטי הקטגוריה נשמרו" });
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
    } finally {
      setSavingMetadataId(null);
    }
  };

  const openNewGallery = () => {
    setEditingGallery(null);
    setGForm({ name: "", description: "", category: "", coverImage: "", projectName: "", appName: "" });
    setGalleryDialogOpen(true);
  };

  const openEditGallery = (g: Gallery) => {
    setEditingGallery(g);
    setGForm({
      name: g.name,
      description: g.description,
      category: g.category,
      coverImage: g.coverImage,
      projectName: g.projectName,
      appName: g.appName,
    });
    setGalleryDialogOpen(true);
  };

  const saveGallery = async () => {
    if (!gForm.name || !gForm.category) {
      toast({ title: "שגיאה", description: "שם וקטגוריה הם שדות חובה", variant: "destructive" });
      return;
    }

    const baseSlug = slugify(gForm.name);
    if (!baseSlug) {
      toast({ title: "שגיאה", description: "השם חייב להכיל אותיות או מספרים", variant: "destructive" });
      return;
    }

    const takenSlugs = new Set(
      galleries.filter((g) => g.id !== editingGallery?.id).map((g) => g.slug),
    );
    const normalizedSlug = uniqueSlug(baseSlug, takenSlugs);

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
            project_name: gForm.projectName.trim(),
            app_name: gForm.appName.trim(),
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
          project_name: gForm.projectName.trim(),
          app_name: gForm.appName.trim(),
          sort_order: (maxRow?.sort_order ?? -1) + 1,
          created_by: user?.id ?? null,
        });

        if (error) throw error;
        toast({ title: "הגלריה נוצרה" });
      }

      setGalleryDialogOpen(false);
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
    }
  };

  const saveGalleryMetadata = async (gallery: Gallery) => {
    const draft = galleryMetadataDrafts[gallery.id] ?? {
      projectName: gallery.projectName,
      appName: gallery.appName,
    };
    setSavingMetadataId(`gallery-${gallery.id}`);
    try {
      const { error } = await supabase
        .from("galleries")
        .update({ project_name: draft.projectName.trim(), app_name: draft.appName.trim() })
        .eq("id", gallery.id);
      if (error) throw error;
      setGalleryMetadataDrafts((current) => {
        const next = { ...current };
        delete next[gallery.id];
        return next;
      });
      toast({ title: "פרטי הגלריה נשמרו" });
      refresh();
    } catch (error: any) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
    } finally {
      setSavingMetadataId(null);
    }
  };

  const deleteGallery = async (id: string) => {
    const { error } = await supabase.from("galleries").delete().eq("id", id);

    if (error) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
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
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
    }
  };

  const deleteArtwork = async (id: string) => {
    const { error } = await supabase.from("artworks").delete().eq("id", id);

    if (error) {
      toast({ title: "שגיאה", description: friendlyDbError(error), variant: "destructive" });
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

  const toggleSort = <T extends string>(
    current: { key: T; direction: SortDirection },
    key: T,
    setter: (next: { key: T; direction: SortDirection }) => void,
  ) => setter({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" });

  const sortedGalleries = useMemo(
    () => galleries
      .filter((gallery) => {
        const query = gallerySearch.trim().toLocaleLowerCase("he");
        return !query || [gallery.name, gallery.category, gallery.projectName, gallery.appName]
          .some((value) => value.toLocaleLowerCase("he").includes(query));
      })
      .sort((a, b) => compareValues(a[gallerySort.key], b[gallerySort.key], gallerySort.direction)),
    [galleries, gallerySearch, gallerySort],
  );

  const sortedArtworks = useMemo(
    () => [...filteredArtworks].sort((a, b) => compareValues(a[artworkSort.key], b[artworkSort.key], artworkSort.direction)),
    [filteredArtworks, artworkSort],
  );

  const sortedCategories = useMemo(() => {
    const withCounts = categoriesData.map((category) => ({
      ...category,
      galleryCount: galleries.filter((gallery) => gallery.category === category.name).length,
    }));
    const query = categorySearch.trim().toLocaleLowerCase("he");
    return withCounts
      .filter((category) => !query || [category.name, category.project_name ?? "", category.app_name ?? ""]
        .some((value) => value.toLocaleLowerCase("he").includes(query)))
      .sort((a, b) => compareValues(a[categorySort.key] ?? "", b[categorySort.key] ?? "", categorySort.direction));
  }, [categoriesData, galleries, categorySearch, categorySort]);

  const isEmpty = !isLoading && galleries.length === 0;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-base text-foreground md:px-8 lg:px-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Button>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">ניהול</h1>
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
          <TabsList className="mb-6 h-12 bg-secondary p-1">
            <TabsTrigger value="galleries" className="h-10 px-5 text-base font-semibold">גלריות</TabsTrigger>
            <TabsTrigger value="artworks" className="h-10 px-5 text-base font-semibold">יצירות</TabsTrigger>
            <TabsTrigger value="categories" className="h-10 px-5 text-base font-semibold">קטגוריות</TabsTrigger>
          </TabsList>

          <TabsContent value="galleries">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input value={gallerySearch} onChange={(event) => setGallerySearch(event.target.value)} placeholder="חיפוש גלריה, קטגוריה, פרויקט או אפליקציה" className="h-12 pr-11 text-base" />
              </div>
              <Button onClick={openNewGallery} className="gap-2">
                <Plus className="h-4 w-4" />
                גלריה חדשה
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[980px] text-right text-base">
                <thead className="border-b border-border bg-secondary">
                  <tr>
                    <SortableHeader label="שם" active={gallerySort.key === "name"} direction={gallerySort.direction} onSort={() => toggleSort(gallerySort, "name", setGallerySort)} />
                    <SortableHeader label="קטגוריה" active={gallerySort.key === "category"} direction={gallerySort.direction} onSort={() => toggleSort(gallerySort, "category", setGallerySort)} />
                    <SortableHeader label="שם הפרויקט" active={gallerySort.key === "projectName"} direction={gallerySort.direction} onSort={() => toggleSort(gallerySort, "projectName", setGallerySort)} />
                    <SortableHeader label="שם האפליקציה" active={gallerySort.key === "appName"} direction={gallerySort.direction} onSort={() => toggleSort(gallerySort, "appName", setGallerySort)} />
                    <SortableHeader label="יצירות" active={gallerySort.key === "artworkCount"} direction={gallerySort.direction} onSort={() => toggleSort(gallerySort, "artworkCount", setGallerySort)} />
                    <th className="px-5 py-4 text-right text-base font-bold text-foreground">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGalleries.map((g) => (
                    <tr key={g.id} className="border-b border-border last:border-0">
                       <td className="px-5 py-4 font-semibold text-foreground">{g.name}</td>
                       <td className="px-5 py-4 text-foreground">{g.category}</td>
                       <td className="px-3 py-3">
                         <Input
                           value={galleryMetadataDrafts[g.id]?.projectName ?? g.projectName}
                           onChange={(event) => setGalleryMetadataDrafts((current) => ({
                             ...current,
                             [g.id]: {
                               projectName: event.target.value,
                               appName: current[g.id]?.appName ?? g.appName,
                             },
                           }))}
                           placeholder="הקלידי שם פרויקט"
                           aria-label={`שם הפרויקט של ${g.name}`}
                           className="h-11 min-w-44 bg-background text-base"
                         />
                       </td>
                       <td className="px-3 py-3">
                         <Input
                           value={galleryMetadataDrafts[g.id]?.appName ?? g.appName}
                           onChange={(event) => setGalleryMetadataDrafts((current) => ({
                             ...current,
                             [g.id]: {
                               projectName: current[g.id]?.projectName ?? g.projectName,
                               appName: event.target.value,
                             },
                           }))}
                           placeholder="הקלידי שם אפליקציה"
                           aria-label={`שם האפליקציה של ${g.name}`}
                           className="h-11 min-w-44 bg-background text-base"
                         />
                       </td>
                       <td className="px-5 py-4 text-foreground">{g.artworkCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                           <Button
                             type="button"
                             size="icon"
                             variant="ghost"
                             onClick={() => void saveGalleryMetadata(g)}
                             disabled={!galleryMetadataDrafts[g.id] || savingMetadataId === `gallery-${g.id}`}
                             title="שמירת שם הפרויקט ושם האפליקציה"
                             aria-label={`שמירת פרטי ${g.name}`}
                             className="h-9 w-9 text-muted-foreground hover:text-primary"
                           >
                             <Save className="h-4 w-4" />
                           </Button>
                          <button onClick={() => openEditGallery(g)} title="עריכת פרטי הגלריה" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => navigate(`/gallery/${g.slug}`)} title="צפייה בגלריה" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget({ type: "gallery", id: g.id, name: g.name })} title="מחיקת הגלריה" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive">
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
                <table className="w-full min-w-[680px] text-right text-base">
                  <thead className="border-b border-border bg-secondary">
                    <tr>
                      <SortableHeader label="תמונה" active={artworkSort.key === "imageUrl"} direction={artworkSort.direction} onSort={() => toggleSort(artworkSort, "imageUrl", setArtworkSort)} />
                      <SortableHeader label="שם" active={artworkSort.key === "title"} direction={artworkSort.direction} onSort={() => toggleSort(artworkSort, "title", setArtworkSort)} />
                      <SortableHeader label="גלריה" active={artworkSort.key === "galleryName"} direction={artworkSort.direction} onSort={() => toggleSort(artworkSort, "galleryName", setArtworkSort)} />
                      <th className="px-5 py-4 text-right text-base font-bold text-foreground">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedArtworks.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          {a.imageUrl ? (
                            <img src={a.imageUrl} alt={a.title} className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-secondary" />
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-foreground">{a.title}</td>
                        <td className="px-5 py-4 text-foreground">{a.galleryName}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEditArtwork(a)} title="עריכת פרטי היצירה" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteTarget({ type: "artwork", id: a.id, name: a.title })} title="מחיקת היצירה" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive">
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="חיפוש קטגוריה, פרויקט או אפליקציה" className="h-12 pr-11 text-base" />
              </div>
              <Button onClick={openNewCategory} className="gap-2" title="הוספת קטגוריה חדשה למערכת">
                <Plus className="h-4 w-4" />
                קטגוריה חדשה
              </Button>
            </div>

            {categoriesData.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">אין קטגוריות עדיין</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[900px] text-right text-base">
                  <thead className="border-b border-border bg-secondary">
                    <tr>
                      <SortableHeader label="שם" active={categorySort.key === "name"} direction={categorySort.direction} onSort={() => toggleSort(categorySort, "name", setCategorySort)} />
                      <SortableHeader label="שם הפרויקט" active={categorySort.key === "project_name"} direction={categorySort.direction} onSort={() => toggleSort(categorySort, "project_name", setCategorySort)} />
                      <SortableHeader label="שם האפליקציה" active={categorySort.key === "app_name"} direction={categorySort.direction} onSort={() => toggleSort(categorySort, "app_name", setCategorySort)} />
                      <SortableHeader label="גלריות" active={categorySort.key === "galleryCount"} direction={categorySort.direction} onSort={() => toggleSort(categorySort, "galleryCount", setCategorySort)} />
                      <SortableHeader label="סדר" active={categorySort.key === "sort_order"} direction={categorySort.direction} onSort={() => toggleSort(categorySort, "sort_order", setCategorySort)} />
                      <th className="px-5 py-4 text-right text-base font-bold text-foreground">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCategories.map((cat) => {
                      return (
                        <tr key={cat.id} className="border-b border-border last:border-0">
                          <td className="px-5 py-4 font-semibold text-foreground">{cat.name}</td>
                          <td className="px-3 py-3">
                            <Input
                              value={categoryMetadataDrafts[cat.id]?.projectName ?? cat.project_name ?? ""}
                              onChange={(event) => setCategoryMetadataDrafts((current) => ({
                                ...current,
                                [cat.id]: {
                                  projectName: event.target.value,
                                  appName: current[cat.id]?.appName ?? cat.app_name ?? "",
                                },
                              }))}
                              placeholder="הקלידי שם פרויקט"
                              aria-label={`שם הפרויקט של ${cat.name}`}
                              className="h-11 min-w-44 bg-background text-base"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              value={categoryMetadataDrafts[cat.id]?.appName ?? cat.app_name ?? ""}
                              onChange={(event) => setCategoryMetadataDrafts((current) => ({
                                ...current,
                                [cat.id]: {
                                  projectName: current[cat.id]?.projectName ?? cat.project_name ?? "",
                                  appName: event.target.value,
                                },
                              }))}
                              placeholder="הקלידי שם אפליקציה"
                              aria-label={`שם האפליקציה של ${cat.name}`}
                              className="h-11 min-w-44 bg-background text-base"
                            />
                          </td>
                          <td className="px-5 py-4 text-foreground">{cat.galleryCount}</td>
                          <td className="px-5 py-4 text-foreground">{cat.sort_order}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => void saveCategoryMetadata(cat)}
                                disabled={!categoryMetadataDrafts[cat.id] || savingMetadataId === `category-${cat.id}`}
                                title="שמירת שם הפרויקט ושם האפליקציה"
                                aria-label={`שמירת פרטי ${cat.name}`}
                                className="h-9 w-9 text-muted-foreground hover:text-primary"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <button onClick={() => openEditCategory(cat)} title="עריכת הקטגוריה, הפרויקט והאפליקציה" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary">
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
              <Input value={gForm.name} onChange={(e) => setGForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" />
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
              <Label className="text-base font-semibold text-foreground">שם הפרויקט שיצר את התמונות</Label>
              <Input value={gForm.projectName} onChange={(e) => setGForm((p) => ({ ...p, projectName: e.target.value }))} className="mt-2 h-12 text-base" />
            </div>
            <div>
              <Label className="text-base font-semibold text-foreground">שם האפליקציה</Label>
              <Input value={gForm.appName} onChange={(e) => setGForm((p) => ({ ...p, appName: e.target.value }))} className="mt-2 h-12 text-base" />
            </div>
            <div>
              <Label className="text-foreground">תמונת כיסוי</Label>
              <div className="mt-1">
                <ImageDropZone value={gForm.coverImage} onChange={(url) => setGForm((p) => ({ ...p, coverImage: url }))} />
              </div>
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
              <Label className="text-foreground">תמונה</Label>
              <div className="mt-1">
                <ImageDropZone value={aForm.imageUrl} onChange={(url) => setAForm((p) => ({ ...p, imageUrl: url }))} folder="artworks" />
              </div>
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
        <DialogContent className="border-border bg-card text-foreground sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCat ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-5 py-2" onSubmit={(event) => { event.preventDefault(); void saveCategory(); }}>
            <div>
              <Label className="text-base font-semibold text-foreground">שם *</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} className="mt-2 h-12 text-base" autoFocus />
            </div>
            <div>
              <Label className="text-base font-semibold text-foreground">שם הפרויקט שיצר את התמונות</Label>
              <Input value={catProjectName} onChange={(e) => setCatProjectName(e.target.value)} className="mt-2 h-12 text-base" placeholder="למשל: ART-AI" />
            </div>
            <div>
              <Label className="text-base font-semibold text-foreground">שם האפליקציה</Label>
              <Input value={catAppName} onChange={(e) => setCatAppName(e.target.value)} className="mt-2 h-12 text-base" placeholder="למשל: Midjourney" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCatDialogOpen(false)}>ביטול</Button>
              <Button type="submit" disabled={isSavingCategory}>{isSavingCategory ? "שומרת..." : editingCat ? "שמירה" : "יצירה"}</Button>
            </DialogFooter>
          </form>
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
