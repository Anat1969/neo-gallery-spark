import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import ArtworkFormDialog from "@/components/ArtworkFormDialog";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { buildCrumbs } from "@/lib/breadcrumbs";
import InlineEdit from "@/components/InlineEdit";
import ProjectMetaBar from "@/components/ProjectMetaBar";
import ImageDropZone from "@/components/ImageDropZone";
import ArtworkWall, { type WallArtwork } from "@/components/media/ArtworkWall";
import ScreeningMode from "@/components/media/ScreeningMode";
import { useArtworkUploader } from "@/hooks/useArtworkUploader";
import { useDockActions } from "@/contexts/DockContext";
import { MEDIA_LABEL, thumbUrl, uploadImage, type MediaType } from "@/lib/media";
import { fetchGallery, fetchRootArtworks, galleryKey, rootArtworksKey } from "@/lib/queries";

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
  // Artwork form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [screening, setScreening] = useState(false);

  // Room form state
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: "", slug: "", description: "", cover_image: "" });
  const [roomCoverUploadingId, setRoomCoverUploadingId] = useState<string | null>(null);
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<any>(null);

  // Move-to-room dialog
  const [moveArtwork, setMoveArtwork] = useState<any>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const { data: gallery, isLoading: galleryLoading } = useQuery({
    queryKey: galleryKey(slug),
    queryFn: () => fetchGallery(slug!),
    enabled: !!slug,
  });

  // Category row for this gallery (project name + app link)
  const { data: categoryRow } = useQuery({
    queryKey: ["category-meta", gallery?.category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neo_categories")
        .select("id, name, project_name, app_name")
        .eq("name", gallery!.category)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!gallery?.category,
  });

  // Fetch rooms for this gallery — silently returns [] if table doesn't exist yet
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", gallery?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("neo_rooms" as any)
          .select("*")
          .eq("gallery_id", gallery!.id)
          .order("sort_order", { ascending: true });
        if (error) return [];
        return (data ?? []) as any[];
      } catch {
        return [];
      }
    },
    enabled: !!gallery?.id,
  });

  const { data: artworks = [], isLoading: artworksLoading } = useQuery({
    queryKey: rootArtworksKey(gallery?.id),
    queryFn: () => fetchRootArtworks(gallery!.id),
    enabled: !!gallery?.id,
  });

  const isLoading = galleryLoading || artworksLoading;

  // View mode: newest artworks first; edit mode keeps manual sort_order for drag
  const displayArtworks = useMemo(
    () =>
      isEditMode
        ? artworks
        : [...(artworks as any[])].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [artworks, isEditMode],
  );

  const displayRooms = useMemo(
    () =>
      [...(rooms as any[])].sort((a, b) =>
        (b.updated_at ?? b.created_at ?? "").localeCompare(a.updated_at ?? a.created_at ?? ""),
      ),
    [rooms],
  );

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
      .from("neo_artworks")
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
    const { error } = await supabase.from("neo_artworks").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "היצירה נמחקה" });
      refresh();
    }
    setDeleteTarget(null);
  };

  const handleReorder = async (reordered: WallArtwork[]) => {
    queryClient.setQueryData(["artworks", gallery?.id], reordered);
    const results = await Promise.all(reordered.map((a, i) => supabase.from("neo_artworks").update({ sort_order: i }).eq("id", a.id)));
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) toast({ title: "שגיאה", description: firstError.message, variant: "destructive" });
    else toast({ title: "סדר היצירות עודכן" });
    refresh();
  };

  const nextOrder = (artworks as any[]).length > 0 ? Math.max(...(artworks as any[]).map((a) => a.sort_order)) + 1 : 0;
  const uploader = useArtworkUploader({ galleryId: gallery?.id, roomId: null, nextOrder, onDone: refresh });

  const mediaCounts = useMemo(() => {
    const m = new Map<string, number>();
    (artworks as any[]).forEach((a) => m.set(a.media_type || "image", (m.get(a.media_type || "image") ?? 0) + 1));
    return [...m.entries()];
  }, [artworks]);

  // ── Move artwork to room ──────────────────────────────────
  const openMoveDialog = (artwork: any) => {
    setMoveArtwork(artwork);
    setSelectedRoomId("");
  };

  const handleMoveToRoom = async () => {
    if (!moveArtwork || !selectedRoomId) return;
    const { error } = await supabase
      .from("neo_artworks")
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
    setRoomForm({ name: "", slug: "", description: "", cover_image: "" });
    setRoomFormOpen(true);
  };

  const openEditRoom = (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    setEditingRoom(room);
    setRoomForm({ name: room.name, slug: room.slug, description: room.description ?? "", cover_image: room.cover_image ?? "" });
    setRoomFormOpen(true);
  };

  // Upload a cover image straight onto a room card (drag / paste / click)
  const uploadRoomCover = useCallback(async (roomId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "שגיאה", description: "רק קבצי תמונה מותרים", variant: "destructive" });
      return;
    }
    setRoomCoverUploadingId(roomId);
    try {
      const url = await uploadImage(file, "room-covers");
      const { error: updateError } = await supabase
        .from("neo_rooms" as any)
        .update({ cover_image: url })
        .eq("id", roomId);
      if (updateError) throw updateError;
      refreshRooms();
      toast({ title: "תמונת החדר עודכנה" });
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setRoomCoverUploadingId(null);
    }
  }, [refreshRooms, toast]);

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
          .from("neo_rooms" as any)
          .update({ name: roomForm.name, slug: normalizedSlug, description: roomForm.description, cover_image: roomForm.cover_image })
          .eq("id", editingRoom.id);
        if (error) throw error;
        toast({ title: "החדר עודכן" });
      } else {
        const nextOrder = rooms.length > 0 ? Math.max(...(rooms as any[]).map(r => r.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from("neo_rooms" as any)
          .insert({ gallery_id: gallery.id, name: roomForm.name, slug: normalizedSlug, description: roomForm.description, cover_image: roomForm.cover_image, sort_order: nextOrder });
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
    const { error } = await supabase.from("neo_rooms" as any).delete().eq("id", deleteRoomTarget.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "החדר נמחק" });
      refreshRooms();
      refresh();
    }
    setDeleteRoomTarget(null);
  };

  const pickFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "*/*";
    input.onchange = () => input.files?.length && uploader.upload(Array.from(input.files));
    input.click();
  };

  useDockActions(
    gallery
      ? [
          { id: "upload", label: "העלאת קבצים", onClick: pickFiles, primary: true },
          { id: "empty", label: "יצירה ריקה", onClick: handleAddInline },
          { id: "room", label: "חדר חדש", onClick: openNewRoom },
        ]
      : [],
    [gallery?.id, artworks.length, rooms.length],
  );

  const tileActions = [
    { label: "עריכת פרטים", onClick: (a: WallArtwork) => handleEdit(a) },
    ...((rooms as any[]).length > 0 ? [{ label: "העברה לחדר", onClick: (a: WallArtwork) => openMoveDialog(a) }] : []),
    { label: "מחיקה", onClick: (a: WallArtwork) => setDeleteTarget({ id: a.id, title: a.title }), danger: true },
  ];

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 lg:px-12">
      <PageBreadcrumb crumbs={buildCrumbs({
        category: gallery?.category,
        gallery: { name: gallery?.name ?? "..." },
      })} />

      {isLoading && (
        <>
          <div className="mb-8 space-y-3">
            <Skeleton className="h-12 w-72" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {[260, 340, 200, 300, 380, 240].map((h, i) => (
              <Skeleton key={i} className="mb-5 w-full rounded-md" style={{ height: h }} />
            ))}
          </div>
        </>
      )}

      {!isLoading && gallery && (
        <header className="mb-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">{gallery.category}</span>
            <InlineEdit
              value={gallery.name}
              enabled={isEditMode}
              as="h1"
              className="mt-1 text-4xl font-extralight tracking-tight text-foreground md:text-6xl"
              inputClassName="text-4xl font-extralight md:text-6xl"
              onSave={async (newName) => {
                const { error } = await supabase.from("neo_galleries").update({ name: newName }).eq("id", gallery.id);
                if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                queryClient.invalidateQueries({ queryKey: ["gallery", slug] });
                toast({ title: "שם הגלריה עודכן" });
              }}
            />
            {gallery.description && <p className="mt-3 max-w-2xl text-muted-foreground">{gallery.description}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
              <span>{(artworks as any[]).length} עבודות</span>
              {mediaCounts.filter(([t]) => t !== "image").map(([t, c]) => (
                <span key={t}>{c} {MEDIA_LABEL[t as MediaType]}</span>
              ))}
              {(rooms as any[]).length > 0 && <span>{(rooms as any[]).length} חדרים</span>}
            </div>
            <ProjectMetaBar
              table="galleries"
              rowId={gallery.id}
              label="פרויקט הגלריה:"
              projectName={(gallery as any).project_name}
              appUrl={(gallery as any).app_name}
              editable={isEditMode}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["gallery", slug] })}
            />
            {categoryRow && (
              <ProjectMetaBar
                table="categories"
                rowId={categoryRow.id}
                label={`פרויקט הקטגוריה ${categoryRow.name}:`}
                projectName={categoryRow.project_name}
                appUrl={categoryRow.app_name}
                editable={isEditMode}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["category-meta", gallery.category] })}
              />
            )}
          </div>
          {(artworks as any[]).length > 0 && (
            <button type="button" onClick={() => setScreening(true)} className="arch-btn arch-btn-ink arch-btn-lg shadow-deep">
              הקרנה
            </button>
          )}
        </header>
      )}

      {/* Rooms */}
      {!isLoading && gallery && ((rooms as any[]).length > 0 || isEditMode) && (
        <section className="mb-12">
          <h2 className="mb-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">חדרים</h2>
          {(rooms as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">אין עדיין חדרים. "חדר חדש" נמצא בפס העריכה.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {displayRooms.map((room: any, i: number) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/gallery/${slug}/room/${room.slug}`)}
                  className="group relative cursor-pointer overflow-hidden rounded-md border border-border/60 bg-card shadow-deep"
                >
                  <div
                    className="relative aspect-[4/3] overflow-hidden bg-secondary"
                    onDragOver={(e) => { if (isEditMode) { e.preventDefault(); e.stopPropagation(); } }}
                    onDrop={(e) => {
                      if (!isEditMode) return;
                      e.preventDefault(); e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) uploadRoomCover(room.id, file);
                    }}
                  >
                    {roomCoverUploadingId === room.id && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 font-mono text-xs">מעלה...</div>
                    )}
                    {room.cover_image ? (
                      <img src={thumbUrl(room.cover_image, 640)} alt={room.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">{isEditMode ? "גררי לכאן תמונת חדר" : "אין תמונה"}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute bottom-3 right-3 text-lg font-light text-white">{room.name}</span>
                  </div>
                  {isEditMode && (
                    <div className="absolute left-2 top-2 flex gap-1">
                      <button type="button" onClick={(e) => openEditRoom(e, room)} className="h-7 min-h-0 rounded-sm bg-background/85 px-2 font-mono text-[10px] backdrop-blur">עריכה</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteRoomTarget(room); }} className="h-7 min-h-0 rounded-sm bg-background/85 px-2 font-mono text-[10px] text-destructive backdrop-blur">מחיקה</button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Works: the salon wall */}
      {!isLoading && gallery && (
        <section>
          {(rooms as any[]).length > 0 && (
            <h2 className="mb-4 font-mono text-xs tracking-[0.2em] text-muted-foreground">יצירות ללא חדר</h2>
          )}
          {(artworks as any[]).length === 0 && !isEditMode ? (
            <p className="py-16 text-center text-lg text-muted-foreground">הגלריה ריקה. במצב עריכה אפשר לגרור לכאן קבצים.</p>
          ) : (
            <ArtworkWall
              artworks={displayArtworks as WallArtwork[]}
              editing={isEditMode}
              actions={tileActions}
              onReorder={handleReorder}
              onUpload={uploader.upload}
              onReplaceMedia={(a, f) => uploader.replace(a.id, f)}
              uploading={uploader.progress}
            />
          )}
        </section>
      )}

      <AnimatePresence>
        {screening && (
          <ScreeningMode artworks={displayArtworks as WallArtwork[]} title={gallery?.name ?? ""} onClose={() => setScreening(false)} />
        )}
      </AnimatePresence>

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
            <div>
              <Label>תמונת החדר</Label>
              <div className="mt-1">
                <ImageDropZone
                  value={roomForm.cover_image}
                  onChange={(url) => setRoomForm((p) => ({ ...p, cover_image: url }))}
                  folder="room-covers"
                />
              </div>
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
