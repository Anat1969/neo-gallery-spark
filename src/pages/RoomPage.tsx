import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import ArtworkFormDialog from "@/components/ArtworkFormDialog";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { buildCrumbs } from "@/lib/breadcrumbs";
import InlineEdit from "@/components/InlineEdit";
import ProjectMetaBar from "@/components/ProjectMetaBar";
import { AnimatePresence, motion } from "framer-motion";
import ArtworkWall, { type WallArtwork } from "@/components/media/ArtworkWall";
import ScreeningMode from "@/components/media/ScreeningMode";
import { useArtworkUploader } from "@/hooks/useArtworkUploader";
import { useDockActions } from "@/contexts/DockContext";

const RoomPage = () => {
  const { gallerySlug, roomSlug } = useParams<{ gallerySlug: string; roomSlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEditMode } = useEditMode();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [screening, setScreening] = useState(false);

  // Fetch gallery
  const { data: gallery } = useQuery({
    queryKey: ["gallery", gallerySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neo_galleries")
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
        .from("neo_rooms" as any)
        .select("*")
        .eq("gallery_id", gallery!.id)
        .eq("slug", roomSlug!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!gallery?.id && !!roomSlug,
  });

  // Fetch artworks in this room
  const { data: artworks = [], isLoading: artworksLoading } = useQuery({
    queryKey: ["room-artworks", room?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neo_artworks" as any)
        .select("*")
        .eq("room_id", room!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!room?.id,
  });

  const isLoading = roomLoading || artworksLoading;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["room-artworks", room?.id] });
  }, [queryClient, room?.id]);

  const handleAddInline = async () => {
    if (!gallery || !room) return;
    const nextOrder = artworks.length > 0 ? Math.max(...artworks.map((a: any) => a.sort_order)) + 1 : 0;
    const { error } = await supabase
      .from("neo_artworks")
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
    const { error } = await supabase.from("neo_artworks").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "היצירה נמחקה" });
      refresh();
    }
    setDeleteTarget(null);
  };

  // Remove artwork from room (keep in gallery root)
  const handleRemoveFromRoom = async (artworkId: string) => {
    const { error } = await supabase
      .from("neo_artworks")
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

  const handleReorder = async (reordered: WallArtwork[]) => {
    queryClient.setQueryData(["room-artworks", room?.id], reordered);
    await Promise.all(reordered.map((a, i) => supabase.from("neo_artworks").update({ sort_order: i }).eq("id", a.id)));
    refresh();
  };

  const nextOrder = artworks.length > 0 ? Math.max(...artworks.map((a: any) => a.sort_order)) + 1 : 0;
  const uploader = useArtworkUploader({ galleryId: gallery?.id, roomId: room?.id, nextOrder, onDone: refresh });

  const pickFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => input.files?.length && uploader.upload(Array.from(input.files));
    input.click();
  };

  useDockActions(
    room
      ? [
          { id: "upload", label: "העלאת קבצים", onClick: pickFiles, primary: true },
          { id: "empty", label: "יצירה ריקה", onClick: handleAddInline },
        ]
      : [],
    [room?.id, artworks.length],
  );

  const tileActions = [
    { label: "עריכת פרטים", onClick: (a: WallArtwork) => handleEdit(a) },
    { label: "הוצאה מהחדר", onClick: (a: WallArtwork) => handleRemoveFromRoom(a.id) },
    { label: "מחיקה", onClick: (a: WallArtwork) => setDeleteTarget({ id: a.id, title: a.title }), danger: true },
  ];

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 lg:px-12" dir="rtl">
      <PageBreadcrumb crumbs={buildCrumbs({
        category: (gallery as any)?.category,
        gallery: { name: gallery?.name ?? "...", slug: gallerySlug },
        room: { name: room?.name ?? "..." },
      })} />

      <div className="mt-4" />

      {isLoading && (
        <div className="space-y-3 mb-8">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      )}

      {!isLoading && room && (
        <header className="mb-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">חדר בגלריה {gallery?.name}</span>
            <InlineEdit
              value={room.name}
              enabled={isEditMode}
              as="h1"
              className="mt-1 text-4xl font-extralight tracking-tight text-foreground md:text-6xl"
              inputClassName="text-4xl font-extralight md:text-6xl"
              onSave={async (newName) => {
                const { error } = await supabase.from("neo_rooms" as any).update({ name: newName }).eq("id", room.id);
                if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
                queryClient.invalidateQueries({ queryKey: ["room", gallery?.id, roomSlug] });
                toast({ title: "שם החדר עודכן" });
              }}
            />
            {room.description && <p className="mt-3 max-w-2xl text-muted-foreground">{room.description}</p>}
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">{artworks.length} עבודות</p>
            <ProjectMetaBar
              table="rooms"
              rowId={room.id}
              label="פרויקט החדר:"
              projectName={room.project_name}
              appUrl={room.app_name}
              editable={isEditMode}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["room", gallery?.id, roomSlug] })}
            />
          </div>
          {artworks.length > 0 && (
            <motion.button
              type="button"
              onClick={() => setScreening(true)}
              whileHover={{ scale: 1.03 }}
              className="h-14 rounded-full bg-foreground px-8 text-base font-light text-background shadow-deep"
            >
              הקרנה
            </motion.button>
          )}
        </header>
      )}

      {!isLoading && room && (
        artworks.length === 0 && !isEditMode ? (
          <p className="py-16 text-center text-lg text-muted-foreground">החדר ריק. במצב עריכה אפשר לגרור לכאן קבצים.</p>
        ) : (
          <ArtworkWall
            artworks={artworks as WallArtwork[]}
            editing={isEditMode}
            actions={tileActions}
            onReorder={handleReorder}
            onUpload={uploader.upload}
            onReplaceMedia={(a, f) => uploader.replace(a.id, f)}
            uploading={uploader.progress}
          />
        )
      )}

      <AnimatePresence>
        {screening && <ScreeningMode artworks={artworks as WallArtwork[]} title={room?.name ?? ""} onClose={() => setScreening(false)} />}
      </AnimatePresence>

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
