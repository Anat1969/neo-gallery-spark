import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

/* ─── Types ─── */

interface Gallery {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  coverImage: string;
  artworkCount: number;
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
}

const CATEGORIES = [
  "Fashion",
  "Interior",
  "Architecture",
  "Tools",
  "Art",
  "Sculpture",
  "Photography",
];

const CATEGORY_LABELS: Record<string, string> = {
  Fashion: "אופנה",
  Interior: "פנים",
  Architecture: "אדריכלות",
  Tools: "כלים",
  Art: "אומנות",
  Sculpture: "פיסול",
  Photography: "צילום",
};

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s-]/g, "")
    .replace(/[\s]+/g, "-");

/* ─── Initial mock data ─── */

const INIT_GALLERIES: Gallery[] = [
  { id: "g1", name: "חלומות עירוניים", slug: "urban-dreams", description: "סדרת עבודות אדריכלות עתידנית", category: "Architecture", coverImage: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80", artworkCount: 3 },
  { id: "g2", name: "עתיד הבד", slug: "fabric-futures", description: "עיצוב אופנה מונע AI", category: "Fashion", coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80", artworkCount: 2 },
];

const INIT_ARTWORKS: Artwork[] = [
  { id: "a1", galleryId: "g1", title: "מגדל הרוח", topic: "אדריכלות עתידנית", post: "בניין שנושם.", imageUrl: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80", tags: ["אדריכלות", "AI"], style: "ניאו-ברוטליזם", concept: "ארכיטקטורה נושמת", year: 2024, inspirationUrl: "" },
  { id: "a2", galleryId: "g1", title: "גשר הזכוכית", topic: "תשתיות", post: "שקיפות כמעבר.", imageUrl: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=400&q=80", tags: ["תשתיות", "זכוכית"], style: "מינימליזם", concept: "חיבור", year: 2023, inspirationUrl: "" },
];

/* ─── Component ─── */

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [galleries, setGalleries] = useState<Gallery[]>(INIT_GALLERIES);
  const [artworks, setArtworks] = useState<Artwork[]>(INIT_ARTWORKS);

  // Gallery form
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
  const [gForm, setGForm] = useState({ name: "", slug: "", description: "", category: "", coverImage: "" });

  // Artwork form
  const [artworkDialogOpen, setArtworkDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [aForm, setAForm] = useState({ galleryId: "", title: "", topic: "", post: "", imageUrl: "", tags: [] as string[], style: "", concept: "", year: new Date().getFullYear(), inspirationUrl: "" });
  const [tagInput, setTagInput] = useState("");

  // Artwork filter
  const [filterGalleryId, setFilterGalleryId] = useState<string>("all");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: "gallery" | "artwork"; id: string; name: string } | null>(null);

  /* ── Gallery CRUD ── */

  const openNewGallery = () => {
    setEditingGallery(null);
    setGForm({ name: "", slug: "", description: "", category: "", coverImage: "" });
    setGalleryDialogOpen(true);
  };

  const openEditGallery = (g: Gallery) => {
    setEditingGallery(g);
    setGForm({ name: g.name, slug: g.slug, description: g.description, category: g.category, coverImage: g.coverImage });
    setGalleryDialogOpen(true);
  };

  const saveGallery = () => {
    if (!gForm.name || !gForm.category) {
      toast({ title: "שגיאה", description: "שם וקטגוריה הם שדות חובה", variant: "destructive" });
      return;
    }
    const slug = gForm.slug || slugify(gForm.name);
    if (editingGallery) {
      setGalleries((prev) => prev.map((g) => g.id === editingGallery.id ? { ...g, ...gForm, slug } : g));
      toast({ title: "הגלריה עודכנה" });
    } else {
      const newG: Gallery = { id: `g${Date.now()}`, ...gForm, slug, artworkCount: 0 };
      setGalleries((prev) => [...prev, newG]);
      toast({ title: "הגלריה נוצרה" });
    }
    setGalleryDialogOpen(false);
  };

  const deleteGallery = (id: string) => {
    setGalleries((prev) => prev.filter((g) => g.id !== id));
    setArtworks((prev) => prev.filter((a) => a.galleryId !== id));
    toast({ title: "הגלריה נמחקה" });
    setDeleteTarget(null);
  };

  /* ── Artwork CRUD ── */

  const openNewArtwork = () => {
    setEditingArtwork(null);
    setAForm({ galleryId: galleries[0]?.id ?? "", title: "", topic: "", post: "", imageUrl: "", tags: [], style: "", concept: "", year: new Date().getFullYear(), inspirationUrl: "" });
    setTagInput("");
    setArtworkDialogOpen(true);
  };

  const openEditArtwork = (a: Artwork) => {
    setEditingArtwork(a);
    setAForm({ galleryId: a.galleryId, title: a.title, topic: a.topic, post: a.post, imageUrl: a.imageUrl, tags: [...a.tags], style: a.style, concept: a.concept, year: a.year, inspirationUrl: a.inspirationUrl });
    setTagInput("");
    setArtworkDialogOpen(true);
  };

  const saveArtwork = () => {
    if (!aForm.title || !aForm.galleryId) {
      toast({ title: "שגיאה", description: "שם וגלריה הם שדות חובה", variant: "destructive" });
      return;
    }
    if (editingArtwork) {
      setArtworks((prev) => prev.map((a) => a.id === editingArtwork.id ? { ...a, ...aForm } : a));
      toast({ title: "היצירה עודכנה" });
    } else {
      const newA: Artwork = { id: `a${Date.now()}`, ...aForm };
      setArtworks((prev) => [...prev, newA]);
      // Update count
      setGalleries((prev) => prev.map((g) => g.id === aForm.galleryId ? { ...g, artworkCount: g.artworkCount + 1 } : g));
      toast({ title: "היצירה נוצרה" });
    }
    setArtworkDialogOpen(false);
  };

  const deleteArtwork = (id: string) => {
    const art = artworks.find((a) => a.id === id);
    setArtworks((prev) => prev.filter((a) => a.id !== id));
    if (art) {
      setGalleries((prev) => prev.map((g) => g.id === art.galleryId ? { ...g, artworkCount: Math.max(0, g.artworkCount - 1) } : g));
    }
    toast({ title: "היצירה נמחקה" });
    setDeleteTarget(null);
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

  const filteredArtworks = filterGalleryId === "all" ? artworks : artworks.filter((a) => a.galleryId === filterGalleryId);

  const galleryName = (id: string) => galleries.find((g) => g.id === id)?.name ?? "—";

  const isEmpty = galleries.length === 0;

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Button>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">ניהול</h1>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">אין תוכן עדיין — צרי את הגלריה הראשונה שלך</p>
          <Button onClick={openNewGallery} className="gap-2">
            <Plus className="h-4 w-4" />
            גלריה חדשה
          </Button>
        </div>
      )}

      {!isEmpty && (
        <Tabs defaultValue="galleries" className="w-full">
          <TabsList className="mb-6 bg-secondary">
            <TabsTrigger value="galleries">גלריות</TabsTrigger>
            <TabsTrigger value="artworks">יצירות</TabsTrigger>
          </TabsList>

          {/* ─── Galleries Tab ─── */}
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
                      <td className="px-4 py-3 text-muted-foreground">{CATEGORY_LABELS[g.category] ?? g.category}</td>
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

          {/* ─── Artworks Tab ─── */}
          <TabsContent value="artworks">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Select value={filterGalleryId} onValueChange={setFilterGalleryId}>
                <SelectTrigger className="w-48 border-border bg-secondary text-foreground">
                  <SelectValue placeholder="סינון לפי גלריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הגלריות</SelectItem>
                  {galleries.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
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
                        <td className="px-4 py-3 text-muted-foreground">{galleryName(a.galleryId)}</td>
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
        </Tabs>
      )}

      {/* ─── Gallery Dialog ─── */}
      <Dialog open={galleryDialogOpen} onOpenChange={setGalleryDialogOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGallery ? "עריכת גלריה" : "גלריה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-foreground">שם *</Label>
              <Input value={gForm.name} onChange={(e) => setGForm((p) => ({ ...p, name: e.target.value, slug: p.slug || slugify(e.target.value) }))} className="mt-1 border-muted-foreground/30 bg-secondary text-foreground focus:border-primary" />
            </div>
            <div>
              <Label className="text-foreground">Slug</Label>
              <Input value={gForm.slug} onChange={(e) => setGForm((p) => ({ ...p, slug: e.target.value }))} dir="ltr" className="mt-1 border-muted-foreground/30 bg-secondary text-foreground text-left focus:border-primary" />
            </div>
            <div>
              <Label className="text-foreground">תיאור</Label>
              <Textarea value={gForm.description} onChange={(e) => setGForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="mt-1 border-muted-foreground/30 bg-secondary text-foreground focus:border-primary" />
            </div>
            <div>
              <Label className="text-foreground">קטגוריה *</Label>
              <Select value={gForm.category} onValueChange={(v) => setGForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 border-muted-foreground/30 bg-secondary text-foreground">
                  <SelectValue placeholder="בחרי קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">תמונת כיסוי (URL)</Label>
              <Input value={gForm.coverImage} onChange={(e) => setGForm((p) => ({ ...p, coverImage: e.target.value }))} dir="ltr" className="mt-1 border-muted-foreground/30 bg-secondary text-foreground text-left focus:border-primary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGalleryDialogOpen(false)}>ביטול</Button>
            <Button onClick={saveGallery}>{editingGallery ? "שמירה" : "יצירה"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Artwork Dialog ─── */}
      <Dialog open={artworkDialogOpen} onOpenChange={setArtworkDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingArtwork ? "עריכת יצירה" : "יצירה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-foreground">גלריה *</Label>
              <Select value={aForm.galleryId} onValueChange={(v) => setAForm((p) => ({ ...p, galleryId: v }))}>
                <SelectTrigger className="mt-1 border-muted-foreground/30 bg-secondary text-foreground">
                  <SelectValue placeholder="בחרי גלריה" />
                </SelectTrigger>
                <SelectContent>
                  {galleries.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">שם *</Label>
              <Input value={aForm.title} onChange={(e) => setAForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 border-muted-foreground/30 bg-secondary text-foreground focus:border-primary" />
            </div>
            <div>
              <Label className="text-foreground">נושא</Label>
              <Input value={aForm.topic} onChange={(e) => setAForm((p) => ({ ...p, topic: e.target.value }))} className="mt-1 border-muted-foreground/30 bg-secondary text-foreground focus:border-primary" />
            </div>
            <div>
              <Label className="text-foreground">פוסט</Label>
              <Textarea value={aForm.post} onChange={(e) => setAForm((p) => ({ ...p, post: e.target.value }))} rows={3} className="mt-1 border-muted-foreground/30 bg-secondary text-foreground focus:border-primary" />
            </div>
            <div>
              <Label className="text-foreground">תמונה (URL)</Label>
              <Input value={aForm.imageUrl} onChange={(e) => setAForm((p) => ({ ...p, imageUrl: e.target.value }))} dir="ltr" className="mt-1 border-muted-foreground/30 bg-secondary text-foreground text-left focus:border-primary" />
            </div>
            <div>
              <Label className="text-foreground">תגיות</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="הקלידי תגית + Enter"
                  className="border-muted-foreground/30 bg-secondary text-foreground focus:border-primary"
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
                <Input value={aForm.style} onChange={(e) => setAForm((p) => ({ ...p, style: e.target.value }))} className="mt-1 border-muted-foreground/30 bg-secondary text-foreground focus:border-primary" />
              </div>
              <div>
                <Label className="text-foreground">קונספט</Label>
                <Input value={aForm.concept} onChange={(e) => setAForm((p) => ({ ...p, concept: e.target.value }))} className="mt-1 border-muted-foreground/30 bg-secondary text-foreground focus:border-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">שנה</Label>
                <Input type="number" value={aForm.year} onChange={(e) => setAForm((p) => ({ ...p, year: parseInt(e.target.value) || 0 }))} className="mt-1 border-muted-foreground/30 bg-secondary text-foreground focus:border-primary" />
              </div>
              <div>
                <Label className="text-foreground">קישור השראה</Label>
                <Input value={aForm.inspirationUrl} onChange={(e) => setAForm((p) => ({ ...p, inspirationUrl: e.target.value }))} dir="ltr" className="mt-1 border-muted-foreground/30 bg-secondary text-foreground text-left focus:border-primary" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArtworkDialogOpen(false)}>ביטול</Button>
            <Button onClick={saveArtwork}>{editingArtwork ? "שמירה" : "יצירה"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת {deleteTarget?.type === "gallery" ? "גלריה" : "יצירה"}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              האם למחוק את "{deleteTarget?.name}"? פעולה זו בלתי הפיכה.
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
    </div>
  );
};

export default AdminPanel;
