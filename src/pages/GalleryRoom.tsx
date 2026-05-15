import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImageIcon, Plus, Pencil, Trash2, GripVertical, Upload, Heart,
  DoorOpen, FolderInput,
} from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import ArtworkFormDialog from "@/components/ArtworkFormDialog";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import InlineEdit from "@/components/InlineEdit";

const slugify = (text: string) =>
  text.trim().toLowerCase()
    .replace(/[^\w֐-׿\s-]/g, "")
    .replace(/\s+/g, "-");

const GalleryRoom = () => {
  const { id: slug } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEditMode } = useEditMode();
  const { toast } = useToast();
  const { user } = useAuth();

  // Favorites
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

  // Artwork form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Room form state
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: "", slug: "", description: "" });
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<any>(null);

  // Move-to-room dialog
  const [moveArtwork, setMoveArtwork] = useState<any>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

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

  // Fetch rooms for this gallery
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", gallery?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms" as any)
        .select("*")
        .eq("gallery_id", gallery!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!gallery?.id,
  });

  // Fetch artworks without a room (gallery root)
  const { data: artworks = [], isLoading: artworksLoading } = useQuery({
    queryKey: ["artworks", gallery?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select("*")
        .eq("gallery_id", gallery!.id)
        .is("room_id" as any, null)
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

  const refreshRooms = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rooms", gallery?.id] });
  }, [queryClient, gallery?.id]);

  // ── Artworks ──────────────────────────────────────────────
  const handleAddInline = async () => {
    if (!gallery) return;
    const nextOrder = artworks.length > 0 ? Math.max(...(artworks as any[]).map(a => a.sort_order)) + 1 : 0;
    const { error } = await supabase
      .from("artworks")
      .insert({ title: "יצירה חדשה", gallery_id: gallery.id, sort_order: nextOrder })
      .select()
      .single();
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    refresh();
    toast({ title: "יצירה נוספה — לחצי פעמיים על השם לעריכה" });
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

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    const reordered = [...artworks];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    queryClient.setQueryData(["artworks", gallery?.id], reordered);
    setDragIdx(null);
    const updates = reordered.map((a: any, i) => ({ id: a.id, sort_order: i }));
    const results = await Promise.all(updates.map((u) => supabase.from("artworks").update({ sort_order: u.sort_order }).eq("id", u.id)));
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) toast({ title: "שגיאה", description: firstError.message, variant: "destructive" });
    else toast({ title: "סדר היצירות עודכן" });
    refresh();
  };

  // ── Move artwork to room ──────────────────────────────────
  const openMoveDialog = (e: React.MouseEvent, artwork: any) => {
    e.stopPropagation();
    setMoveArtwork(artwork);
    setSelectedRoomId("");
  };

  const handleMoveToRoom = async () => {
    if (!moveArtwork || !selectedRoomId) return;
    const { error } = await supabase
      .from("artworks")
      .update({ room_id: selectedRoomId } as any)
      .eq("id", moveArtwork.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "היצירה הועברה לחדר" });
      refresh();
    }
    setMoveArtwork(null);
    setSelectedRoomId("");
  };

  // ── Room CRUD ─────────────────────────────────────────────
  const openNewRoom = () => {
    setEditingRoom(null);
    setRoomForm({ name: "", slug: "", description: "" });
    setRoomFormOpen(true);
  };

  const openEditRoom = (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    setEditingRoom(room);
    setRoomForm({ name: room.name, slug: room.slug, description: room.description ?? "" });
    setRoomFormOpen(true);
  };

  const handleSaveRoom = async () => {
    if (!gallery || !roomForm.name.trim()) {
      toast({ title: "שגיאה", description: "שם החדר הוא שדה חובה", variant: "destructive" });
      return;
    }
    const normalizedSlug = (roomForm.slug || slugify(roomForm.name)).trim();
    setRoomSaving(true);
    try {
      if (editingRoom) {
        const { error } = await supabase
          .from("rooms" as any)
          .update({ name: roomForm.name, slug: normalizedSlug, description: roomForm.description })
          .eq("id", editingRoom.id);
        if (error) throw error;
        toast({ title: "החדר עודכן" });
      } else {
        const nextOrder = rooms.length > 0 ? Math.max(...(rooms as any[]).map(r => r.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from("rooms" as any)
          .insert({ gallery_id: gallery.id, name: roomForm.name, slug: normalizedSlug, description: roomForm.description, sort_order: nextOrder });
        if (error) throw error;
        toast({ title: "החדר נוצר" });
      }
      setRoomFormOpen(false);
      refreshRooms();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message ?? "הפעולה נכשלה", variant: "destructive" });
    } finally {
      setRoomSaving(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!deleteRoomTarget) return;
    const { error } = await supabase.from("rooms" as any).delete().eq("id", deleteRoomTarget.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "החדר נמחק" });
      refreshRooms();
      refresh();
    }
    setDeleteRoomTarget(null);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
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
        </header>
      )}

      {/* ── Rooms section ────────────────────────────────── */}
      {!isLoading && gallery && (
        <section className="mb-10" dir="rtl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <DoorOpen className="h-5 w-5 text-primary" />
              חדרים
            </h2>
            {isEditMode && (
              <Button size="sm" onClick={openNewRoom} className="gap-2">
                <Plus className="h-4 w-4" />
                חדר חדש
              </Button>
            )}
          </div>

          {(rooms as any[]).length === 0 && !isEditMode && (
            <p className="text-sm text-muted-foreground">אין חדרים בגלריה זו</p>
          )}

          {((rooms as any[]).length > 0 || isEditMode) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(rooms as any[]).map((room) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/gallery/${slug}/room/${room.slug}`)}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-[0_0_16px_hsl(76_90%_61%/0.12)]"
                >
                  <div className="relative aspect-video overflow-hidden bg-secondary">
                    {room.cover_image ? (
                      <img src={room.cover_image} alt={room.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <DoorOpen className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="truncate text-sm font-semibold text-foreground">{room.name}</span>
                    {isEditMode && (
                      <div className="flex shrink-0 gap-1">
                        <span
                          role="button"
                          onClick={(e) => openEditRoom(e, room)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </span>
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteRoomTarget(room); }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Artworks (gallery root — no room) ───────────── */}
      {!isLoading && gallery && (
        <section dir="rtl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {(rooms as any[]).length > 0 ? "יצירות ללא חדר" : "עבודות"}
              <span className="mr-2 text-sm font-normal text-muted-foreground">{(artworks as any[]).length}</span>
            </h2>
          </div>

          {(artworks as any[]).length === 0 && !isEditMode && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg text-muted-foreground">הגלריה ריקה — הוסיפי יצירה ראשונה</p>
            </div>
          )}

          {((artworks as any[]).length > 0 || isEditMode) && (
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
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm cursor-grab" onMouseDown={(e) => e.stopPropagation()}>
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                      {(rooms as any[]).length > 0 && (
                        <span
                          role="button"
                          title="העברה לחדר"
                          onClick={(e) => openMoveDialog(e, artwork)}
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:text-primary cursor-pointer"
                        >
                          <FolderInput className="h-3.5 w-3.5" />
                        </span>
                      )}
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
                  <div
                    className="relative aspect-square overflow-hidden bg-secondary"
                    onDragOver={(e) => { if (isEditMode) e.preventDefault(); }}
                    onDrop={async (e) => {
                      if (!isEditMode) return;
                      e.preventDefault(); e.stopPropagation();
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
                      const path = `artworks/${crypto.randomUUID()}.png`;
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
                      <img src={artwork.image_url} alt={artwork.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                        {isEditMode && <p className="text-xs text-muted-foreground/60">גררי או הדביקי תמונה</p>}
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
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "text-primary"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "text-primary"); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-primary", "text-primary");
                    if (!gallery) return;
                    const file = e.dataTransfer.files?.[0];
                    if (!file?.type.startsWith("image/")) { handleAddInline(); return; }
                    const nextOrder = (artworks as any[]).length > 0 ? Math.max(...(artworks as any[]).map(a => a.sort_order)) + 1 : 0;
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
          )}
        </section>
      )}

      {/* Artwork Form Dialog */}
      {gallery && (
        <ArtworkFormDialog open={formOpen} onOpenChange={setFormOpen} galleryId={gallery.id} artwork={editingArtwork} onSaved={refresh} />
      )}

      {/* Delete artwork */}
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

      {/* Room Form Dialog */}
      <Dialog open={roomFormOpen} onOpenChange={setRoomFormOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingRoom ? "עריכת חדר" : "חדר חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>שם *</Label>
              <Input
                value={roomForm.name}
                onChange={(e) => setRoomForm((p) => ({
                  ...p,
                  name: e.target.value,
                  slug: editingRoom ? p.slug : slugify(e.target.value),
                }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={roomForm.slug}
                onChange={(e) => setRoomForm((p) => ({ ...p, slug: e.target.value }))}
                dir="ltr"
                className="mt-1 text-left"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={roomForm.description}
                onChange={(e) => setRoomForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomFormOpen(false)} disabled={roomSaving}>ביטול</Button>
            <Button onClick={handleSaveRoom} disabled={roomSaving}>{editingRoom ? "שמירה" : "יצירה"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete room */}
      <AlertDialog open={!!deleteRoomTarget} onOpenChange={(open) => !open && setDeleteRoomTarget(null)}>
        <AlertDialogContent className="border-border bg-card text-foreground" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת חדר</AlertDialogTitle>
            <AlertDialogDescription>
              למחוק את החדר "{deleteRoomTarget?.name}"? היצירות שבו יחזרו לגלריה הראשית.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחיקה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move artwork to room */}
      <Dialog open={!!moveArtwork} onOpenChange={(open) => !open && setMoveArtwork(null)}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>העברה לחדר</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">בחרי חדר עבור "{moveArtwork?.title}"</Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="בחרי חדר..." />
              </SelectTrigger>
              <SelectContent>
                {(rooms as any[]).map((room) => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveArtwork(null)}>ביטול</Button>
            <Button onClick={handleMoveToRoom} disabled={!selectedRoomId}>העבר</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryRoom;
