import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { ArrowRight, ImageIcon, Plus, Pencil, Trash2, GripVertical, Upload, Heart } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import ArtworkFormDialog from "@/components/ArtworkFormDialog";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import InlineEdit from "@/components/InlineEdit";

const GalleryRoom = () => {
  const { id: slug } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEditMode } = useEditMode();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user favorites for this gallery
  const { data: userFavorites = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites" as any)
        .select("id, artwork_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user,
  });

  const getFavoriteId = (artworkId: string) =>
    userFavorites.find((f: any) => f.artwork_id === artworkId)?.id;

  const handleToggleFavorite = async (e: React.MouseEvent, artworkId: string) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "צריך להתחבר כדי לשמור למועדפים", variant: "destructive" });
      navigate("/login");
      return;
    }
    const existingId = getFavoriteId(artworkId);
    if (existingId) {
      await supabase.from("favorites" as any).delete().eq("id", existingId).eq("user_id", user.id);
      toast({ title: "הוסר מהמועדפים" });
    } else {
      await supabase.from("favorites" as any).insert({ user_id: user.id, artwork_id: artworkId });
      toast({ title: "נשמר במועדפים" });
    }
    queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
  };

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Fetch gallery by slug
  const { data: gallery, isLoading: galleryLoading } = useQuery({
    queryKey: ["gallery", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch artworks for gallery
  const { data: artworks = [], isLoading: artworksLoading } = useQuery({
    queryKey: ["artworks", gallery?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select("*")
        .eq("gallery_id", gallery!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!gallery?.id,
  });

  const isLoading = galleryLoading || artworksLoading;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["artworks", gallery?.id] });
  }, [queryClient, gallery?.id]);

  // Add artwork inline (create in DB immediately, then user can rename inline)
  const handleAddInline = async () => {
    if (!gallery) return;
    const nextOrder = artworks.length > 0 ? Math.max(...artworks.map(a => a.sort_order)) + 1 : 0;
    const { data, error } = await supabase
      .from("artworks")
      .insert({ title: "יצירה חדשה", gallery_id: gallery.id, sort_order: nextOrder })
      .select()
      .single();
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    refresh();
    toast({ title: "יצירה נוספה — לחצי פעמיים על השם לעריכה" });
  };

  // Open new artwork form (full dialog)
  const handleAdd = () => {
    setEditingArtwork(null);
    setFormOpen(true);
  };

  // Open edit form
  const handleEdit = (artwork: any) => {
    setEditingArtwork({
      id: artwork.id,
      gallery_id: artwork.gallery_id,
      title: artwork.title,
      topic: artwork.topic ?? "",
      post: artwork.post ?? "",
      image_url: artwork.image_url ?? "",
      tags: artwork.tags ?? [],
      style: artwork.style ?? "",
      concept: artwork.concept ?? "",
      year: artwork.year ?? new Date().getFullYear(),
      inspiration_url: artwork.inspiration_url ?? "",
    });
    setFormOpen(true);
  };

  // Delete artwork
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("artworks")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "היצירה נמחקה" });
      refresh();
    }
    setDeleteTarget(null);
  };

  // Drag-to-reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      return;
    }

    const reordered = [...artworks];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);

    queryClient.setQueryData(["artworks", gallery?.id], reordered);
    setDragIdx(null);

    const updates = reordered.map((a, i) => ({ id: a.id, sort_order: i }));
    const results = await Promise.all(
      updates.map((u) =>
        supabase.from("artworks").update({ sort_order: u.sort_order }).eq("id", u.id),
      ),
    );

    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      toast({ title: "שגיאה", description: firstError.message, variant: "destructive" });
    } else {
      toast({ title: "סדר היצירות עודכן" });
    }

    refresh();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      {/* Breadcrumb */}
      <PageBreadcrumb crumbs={[
        { label: "גלריות", to: "/" },
        { label: gallery?.name ?? "..." },
      ]} />

      <div className="mt-4" />

      {/* Loading */}
      {isLoading && (
        <>
          <div className="mb-8 space-y-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg bg-card">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Header */}
      {!isLoading && gallery && (
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <InlineEdit
              value={gallery.name}
              enabled={isEditMode}
              as="h1"
              className="text-3xl font-bold text-foreground md:text-4xl"
              inputClassName="text-3xl font-bold md:text-4xl"
              onSave={async (newName) => {
                const { error } = await supabase.from("galleries").update({ name: newName }).eq("id", gallery.id);
                if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                queryClient.invalidateQueries({ queryKey: ["gallery", slug] });
                toast({ title: "שם הגלריה עודכן" });
              }}
            />
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {gallery.category}
            </span>
          </div>
          <p className="text-muted-foreground max-w-2xl mb-1">{gallery.description}</p>
          <p className="text-sm text-muted-foreground">{artworks.length} עבודות</p>
        </header>
      )}

      {/* Empty */}
      {!isLoading && gallery && artworks.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">הגלריה ריקה — הוסיפי יצירה ראשונה</p>
          {isEditMode && (
            <div
              onClick={handleAddInline}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card/50 px-8 py-6 text-muted-foreground transition-all hover:border-primary/60 hover:text-primary"
            >
              <Plus className="h-10 w-10" />
              <span className="text-sm font-medium">הוסיפי יצירה ראשונה</span>
            </div>
          )}
        </div>
      )}

      {/* Section: Artworks */}
      {!isLoading && gallery && artworks.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">עבודות</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork, idx) => (
              <div
                key={artwork.id}
                draggable={isEditMode}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className={`group relative overflow-hidden rounded-lg border bg-card text-right transition-all cursor-pointer ${
                  dragIdx === idx
                    ? "border-primary opacity-50"
                    : "border-border hover:border-primary/40 hover:shadow-[0_0_20px_hsl(76_90%_61%/0.1)]"
                }`}
                onClick={() => navigate(`/artwork/${artwork.id}`)}
              >
                {isEditMode && (
                  <div className="absolute right-2 top-2 z-10 flex gap-1">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm cursor-grab"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(artwork);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-primary cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: artwork.id, title: artwork.title });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                )}
                <div
                  className="relative aspect-square overflow-hidden bg-secondary"
                  onDragOver={(e) => { if (isEditMode) e.preventDefault(); }}
                  onDrop={async (e) => {
                    if (!isEditMode) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (!file?.type.startsWith("image/")) return;
                    const ext = file.name.split(".").pop() ?? "png";
                    const path = `artworks/${crypto.randomUUID()}.${ext}`;
                    const { error } = await supabase.storage.from("artwork-images").upload(path, file);
                    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                    const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(path);
                    await supabase.from("artworks").update({ image_url: urlData.publicUrl }).eq("id", artwork.id);
                    queryClient.invalidateQueries({ queryKey: ["artworks", gallery?.id] });
                    toast({ title: "התמונה עודכנה" });
                  }}
                  onPaste={async (e) => {
                    if (!isEditMode) return;
                    const file = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"))?.getAsFile();
                    if (!file) return;
                    e.preventDefault();
                    const ext = "png";
                    const path = `artworks/${crypto.randomUUID()}.${ext}`;
                    const { error } = await supabase.storage.from("artwork-images").upload(path, file);
                    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                    const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(path);
                    await supabase.from("artworks").update({ image_url: urlData.publicUrl }).eq("id", artwork.id);
                    queryClient.invalidateQueries({ queryKey: ["artworks", gallery?.id] });
                    toast({ title: "התמונה עודכנה" });
                  }}
                  tabIndex={isEditMode ? 0 : undefined}
                >
                  {artwork.image_url ? (
                    <img
                      src={artwork.image_url}
                      alt={artwork.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                      {isEditMode && (
                        <p className="text-xs text-muted-foreground/60">גררי או הדביקי תמונה</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <InlineEdit
                      value={artwork.title}
                      enabled={isEditMode}
                      as="h3"
                      className="text-base font-semibold text-foreground"
                      inputClassName="text-base font-semibold w-full"
                      onSave={async (newTitle) => {
                        const { error } = await supabase.from("artworks").update({ title: newTitle }).eq("id", artwork.id);
                        if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                        refresh();
                        toast({ title: "שם היצירה עודכן" });
                      }}
                    />
                    <p className="mt-1 text-sm text-muted-foreground truncate">{artwork.topic}</p>
                  </div>
                  <button
                    onClick={(e) => handleToggleFavorite(e, artwork.id)}
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                      getFavoriteId(artwork.id)
                        ? "text-primary"
                        : "text-muted-foreground/40 hover:text-primary"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${getFavoriteId(artwork.id) ? "fill-primary" : ""}`} />
                  </button>
                </div>
              </div>
            ))}
            {/* Inline add card */}
            {isEditMode && (
              <div
                onClick={handleAddInline}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "text-primary"); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "text-primary"); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-primary", "text-primary");
                  if (!gallery) return;
                  const file = e.dataTransfer.files?.[0];
                  if (!file?.type.startsWith("image/")) { handleAddInline(); return; }
                  const nextOrder = artworks.length > 0 ? Math.max(...artworks.map(a => a.sort_order)) + 1 : 0;
                  const ext = file.name.split(".").pop() ?? "png";
                  const path = `artworks/${crypto.randomUUID()}.${ext}`;
                  const { error: uploadErr } = await supabase.storage.from("artwork-images").upload(path, file);
                  if (uploadErr) { toast({ title: "שגיאה", description: uploadErr.message, variant: "destructive" }); return; }
                  const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(path);
                  const { error } = await supabase.from("artworks").insert({ title: "יצירה חדשה", gallery_id: gallery.id, sort_order: nextOrder, image_url: urlData.publicUrl }).select().single();
                  if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                  refresh();
                  toast({ title: "יצירה נוספה עם תמונה" });
                }}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card/50 text-muted-foreground transition-all hover:border-primary/60 hover:text-primary"
                style={{ minHeight: "280px" }}
              >
                <Upload className="h-8 w-8" />
                <Plus className="h-10 w-10" />
                <span className="text-sm font-medium">הוסיפי יצירה או גררי תמונה</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Artwork Form Dialog */}
      {gallery && (
        <ArtworkFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          galleryId={gallery.id}
          artwork={editingArtwork}
          onSaved={refresh}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-card text-foreground" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת יצירה</AlertDialogTitle>
            <AlertDialogDescription>
              למחוק את היצירה? פעולה זו אינה הפיכה
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export default GalleryRoom;
