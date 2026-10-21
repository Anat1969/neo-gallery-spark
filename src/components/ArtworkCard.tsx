import { useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ShareExport from "@/components/ShareExport";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProjectMetaBar from "@/components/ProjectMetaBar";
import { buildCrumbs } from "@/lib/breadcrumbs";
import { useEditMode } from "@/contexts/EditModeContext";
import { useFavorites } from "@/hooks/useFavorites";
import MediaViewer from "@/components/media/MediaViewer";
import { MEDIA_LABEL, type MediaType } from "@/lib/media";

interface ArtworkCardProps {
  asModal?: boolean;
  onClose?: () => void;
}

const ArtworkCard = ({ asModal = false, onClose }: ArtworkCardProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEditMode } = useEditMode();
  const { isFavorite, toggle } = useFavorites();

  const {
    data: artwork,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["artwork", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neo_artworks")
        .select(
          "id, title, topic, post, tags, style, concept, year, image_url, media_url, media_type, inspiration_url, inspiration_label, gallery_id, room_id, sort_order, created_at, gallery:neo_galleries(id, name, slug, category, project_name, app_name)",
        )
        .eq("id", id!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const galleryMeta = artwork?.gallery as any;

  const { data: categoryRow } = useQuery({
    queryKey: ["category-meta", galleryMeta?.category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neo_categories")
        .select("id, name, project_name, app_name")
        .eq("name", galleryMeta.category)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!galleryMeta?.category,
  });

  // Neighbours in the same gallery, newest first (as on the wall), for previous / next
  const { data: siblings = [] } = useQuery({
    queryKey: ["siblings", artwork?.gallery_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("neo_artworks")
        .select("id, created_at")
        .eq("gallery_id", artwork!.gallery_id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!artwork?.gallery_id,
    staleTime: 5 * 60_000,
  });
  const pos = siblings.findIndex((x) => x.id === id);
  const prevId = pos > 0 ? siblings[pos - 1].id : null;
  const nextId = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1].id : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) return;
      if (e.key === "ArrowLeft" && nextId) navigate(`/artwork/${nextId}`);
      if (e.key === "ArrowRight" && prevId) navigate(`/artwork/${prevId}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevId, nextId, navigate]);

  const isFavorited = !!id && isFavorite(id);
  const handleToggleFavorite = () => id && toggle(id);

  const content = (
    <div className="min-h-screen">
      <div className="flex items-center justify-between px-4 py-3 md:px-8">
        {asModal ? (
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="flex h-11 items-center justify-center rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            סגירה
          </button>
        ) : (
          <PageBreadcrumb
            sticky={false}
            crumbs={buildCrumbs({
              category: (artwork?.gallery as any)?.category,
              gallery: artwork?.gallery as any,
              artworkTitle: artwork?.title ?? "...",
            })}
          />
        )}

        {isEditMode && artwork?.gallery?.slug && (
          <Button
            variant="outline"
            onClick={() => navigate(`/gallery/${artwork.gallery.slug}`)}
            className="gap-2 border-primary text-primary hover:bg-primary/10"
          >
            עריכה
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="px-4 md:px-8 lg:px-12">
          <Skeleton className="mx-auto aspect-[3/2] max-h-[60vh] w-full max-w-4xl rounded-lg" />
          <div className="mx-auto mt-6 max-w-3xl space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא ניתן לטעון את היצירה</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {!isLoading && !isError && artwork && (
        <div className="px-4 pb-12 md:px-8 lg:px-12">
          <motion.div key={artwork.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mx-auto max-w-5xl">
            <MediaViewer item={artwork} />
          </motion.div>

          <div className="mx-auto mt-4 flex max-w-5xl items-center justify-between font-mono text-xs text-muted-foreground">
            <button type="button" disabled={!prevId} onClick={() => prevId && navigate(`/artwork/${prevId}`)} className="arch-btn arch-btn-quiet">הקודמת</button>
            <span>{MEDIA_LABEL[(artwork.media_type || "image") as MediaType]}{pos >= 0 && ` · ${pos + 1} / ${siblings.length}`}</span>
            <button type="button" disabled={!nextId} onClick={() => nextId && navigate(`/artwork/${nextId}`)} className="arch-btn arch-btn-quiet">הבאה</button>
          </div>

          <div className="mx-auto mt-6 max-w-3xl">
            <h1 className="text-3xl font-extralight tracking-tight text-foreground md:text-5xl">{artwork.title}</h1>
            <p className="mt-2 text-base text-muted-foreground">{artwork.topic}</p>

            {galleryMeta?.id && (
              <ProjectMetaBar
                table="galleries"
                rowId={galleryMeta.id}
                label={`פרויקט הגלריה ${galleryMeta.name}:`}
                projectName={galleryMeta.project_name}
                appUrl={galleryMeta.app_name}
                editable={isEditMode}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["artwork", id] })}
              />
            )}

            {categoryRow && (
              <ProjectMetaBar
                table="categories"
                rowId={categoryRow.id}
                label={`פרויקט הקטגוריה ${categoryRow.name}:`}
                projectName={categoryRow.project_name}
                appUrl={categoryRow.app_name}
                editable={isEditMode}
                onSaved={() =>
                  queryClient.invalidateQueries({ queryKey: ["category-meta", galleryMeta?.category] })
                }
              />
            )}
            <p className="mt-4 text-base leading-relaxed text-foreground/90">{artwork.post}</p>

            {(artwork.tags ?? []).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {(artwork.tags ?? []).map((tag: string) => (
                  <span
                    key={tag}
                    className="border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {artwork.style && (
                <span className="rounded-none bg-secondary px-3 py-1 text-xs text-muted-foreground">
                  סגנון: {artwork.style}
                </span>
              )}
              {artwork.concept && (
                <span className="rounded-none bg-secondary px-3 py-1 text-xs text-muted-foreground">
                  קונספט: {artwork.concept}
                </span>
              )}
            </div>

            {artwork.year && <p className="mt-3 text-sm text-muted-foreground">{artwork.year}</p>}

            {artwork.inspiration_url && (
              <a
                href={artwork.inspiration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
              >
                מקור השראה — {artwork.inspiration_label ?? "קישור"}
              </a>
            )}

            <div className="mt-8 border-t border-border pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleToggleFavorite}
                  className={`gap-2 border-muted-foreground/40 ${
                    isFavorited ? "border-primary text-primary" : "text-muted-foreground"
                  } hover:border-primary hover:text-primary`}
                >
                  {isFavorited ? "נבחרת" : "לנבחרות"}
                </Button>

                <ShareExport
                  title={artwork.title}
                  topic={artwork.topic ?? ""}
                  post={artwork.post ?? ""}
                  tags={artwork.tags ?? []}
                  imageUrl={artwork.image_url ?? ""}
                  style={artwork.style ?? ""}
                  concept={artwork.concept ?? ""}
                  year={artwork.year ?? undefined}
                  inspirationUrl={artwork.inspiration_url ?? ""}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (asModal) {
    return <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">{content}</div>;
  }

  return content;
};

export default ArtworkCard;
