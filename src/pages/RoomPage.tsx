import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ImageIcon, Plus, Pencil, Trash2, GripVertical, Heart, FolderMinus } from "lucide-react";
import ArtworkFormDialog from "@/components/ArtworkFormDialog";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import InlineEdit from "@/components/InlineEdit";

const RoomPage = () => {
  const { gallerySlug, roomSlug } = useParams<{ gallerySlug: string; roomSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEditMode } = useEditMode();
  const { toast } = useToast();
  const { user } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Fetch gallery
  const { data: gallery } = useQuery({
    queryKey: ["gallery", gallerySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("galleries")
        .select("*")
        .eq("slug", gallerySlug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gallerySlug,
  });

  // Fetch room
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["room", gallery?.id, roomSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms" as any)
        .select("*")
        .eq("gallery_id", gallery!.id)
        .eq("slug", roomSlug!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!gallery?.id && !!roomSlug,
  });

  // Fetch user favorites
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

  // Fetch artworks in this room
  const { data: artworks = [], isLoading: artworksLoading } = useQuery({
    queryKey: ["room-artworks", room?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select("*")
        .eq("room_id" as any, room!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!room?.id,
  });

  const isLoading = roomLoading || artworksLoading;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["room-artworks", room?.id] });
  }, [queryClient, room?.id]);

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

  const handleAddInline = async () => {
    if (!gallery || !room) return;
    const nextOrder = artworks.length > 0 ? Math.max(...artworks.map((a: any) => a.sort_order)) + 1 : 0;
    const { error } = await supabase
      .from("artworks")
      .insert({ title: "יצירה חדשה", gallery_id: gallery.id, room_id: room.id, sort_order: nextOrder } as any)
      .select()
      .single();
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    refresh();
    toast({ title: "יצירה נוספה" });
  };

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("artworks").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "היצירה נמחקה" });
      refresh();
    }
    setDeleteTarget(null);
  };

  // Remove artwork from room (keep in gallery root)
  const handleRemoveFromRoom = async (e: React.MouseEvent, artworkId: string) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("artworks")
      .update({ room_id: null } as any)
      .eq("id", artworkId);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "היצירה הועברה חזרה לגלריה" });
      refresh();
      queryClient.invalidateQueries({ queryKey: ["artworks", gallery?.id] });
    }
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    const reordered = [...artworks];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    queryClient.setQueryData(["room-artworks", room?.id], reordered);
    setDragIdx(null);
    const updates = reordered.map((a: any, i) => ({ id: a.id, sort_order: i }));
    await Promise.all(updates.map((u) => supabase.from("artworks").update({ sort_order: u.sort_order }).eq("id", u.id)));
    refresh();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12" dir="rtl">
      <PageBreadcrumb crumbs={[
        { label: "גלריות", to: "/" },
        { label: gallery?.name ?? "...", to: `/gallery/${gallerySlug}` },
        { label: room?.name ?? "..." },
      ]} />

      <div className="mt-4" />

      {isLoading && (
        <div className="space-y-3 mb-8">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      )}

      {!isLoading && room && (
        <header className="mb-8">
          <InlineEdit
            value={room.name}
            enabled={isEditMode}
            as="h1"
            className="text-3xl font-bold text-foreground md:text-4xl"
            inputClassName="text-3xl font-bold md:text-4xl"
            onSave={async (newName) => {
              const { error } = await supabase
                .from("rooms" as any)
                .update({ name: newName })
                .eq("id", room.id);
              if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
              queryClient.invalidateQueries({ queryKey: ["room", gallery?.id, roomSlug] });
              toast({ title: "שם החדר עודכן" });
            }}
          />
          {room.description && (
            <p className="mt-2 text-muted-foreground max-w-2xl">{room.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{artworks.length} עבודות</p>
        </header>
      )}

      {!isLoading && room && artworks.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">החדר ריק — הוסיפי יצירות מהגלריה</p>
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

      {!isLoading && room && artworks.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(artworks as any[]).map((artwork, idx) => (
            <div
              key={artwork.id}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              className={`group relative overflow-hidden rounded-lg border bg-card text-right transition-all cursor-pointer ${
                dragIdx === idx ? "border-primary opacity-50" : "border-border hover:border-primary/40 hover:shadow-[0_0_20px_hsl(76_90%_61%/0.1)]"
              }`}
              onClick={() => navigate(`/artwork/${artwork.id}`)}
            >
              {isEditMode && (
                <div className="absolute right-2 top-2 z-10 flex gap-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm cursor-grab">
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                  <span
                    role="button"
                    onClick={(e) => handleRemoveFromRoom(e, artwork.id)}
                    title="הוצא מהחדר"
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-amber-500 cursor-pointer"
                  >
                    <FolderMinus className="h-3.5 w-3.5" />
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); handleEdit(artwork); }}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-primary cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: artwork.id, title: artwork.title }); }}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </div>
              )}
              <div className="relative aspect-square overflow-hidden bg-secondary">
                {artwork.image_url ? (
                  <img src={artwork.image_url} alt={artwork.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground truncate">{artwork.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground truncate">{artwork.topic}</p>
                </div>
                <button
                  onClick={(e) => handleToggleFavorite(e, artwork.id)}
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${getFavoriteId(artwork.id) ? "text-primary" : "text-muted-foreground/40 hover:text-primary"}`}
                >
                  <Heart className={`h-4 w-4 ${getFavoriteId(artwork.id) ? "fill-primary" : ""}`} />
                </button>
              </div>
            </div>
          ))}
          {isEditMode && (
            <div
              onClick={handleAddInline}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card/50 text-muted-foreground transition-all hover:border-primary/60 hover:text-primary"
              style={{ minHeight: "280px" }}
            >
              <Plus className="h-10 w-10" />
              <span className="text-sm font-medium">הוסיפי יצירה</span>
            </div>
          )}
        </div>
      )}

      {gallery && (
        <ArtworkFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          galleryId={gallery.id}
          artwork={editingArtwork}
          onSaved={refresh}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-card text-foreground" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת יצירה</AlertDialogTitle>
            <AlertDialogDescription>למחוק את היצירה? פעולה זו אינה הפיכה</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחיקה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoomPage;
