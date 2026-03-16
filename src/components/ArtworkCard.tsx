import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ShareExport from "@/components/ShareExport";
import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Heart,
  ExternalLink,
  ImageIcon,
  X,
  Pencil,
} from "lucide-react";

interface ArtworkCardProps {
  asModal?: boolean;
  onClose?: () => void;
}

const ArtworkCard = ({ asModal = false, onClose }: ArtworkCardProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEditMode } = useEditMode();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    data: artwork,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["artwork", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select(
          "id, title, topic, post, tags, style, concept, year, image_url, inspiration_url, inspiration_label, gallery_id, gallery:galleries(name, slug)",
        )
        .eq("id", id!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: favoriteRow } = useQuery({
    queryKey: ["favorite", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites" as any)
        .select("id")
        .eq("user_id", user!.id)
        .eq("artwork_id", id!)
        .maybeSingle();

      if (error) throw error;
      return data as { id: string } | null;
    },
    enabled: !!id && !!user,
  });

  const isFavorited = !!favoriteRow?.id;

  const handleToggleFavorite = async () => {
    if (!id) return;

    if (!user) {
      toast({ title: "צריך להתחבר כדי לשמור למועדפים", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (isFavorited && favoriteRow?.id) {
      const { error } = await supabase
        .from("favorites" as any)
        .delete()
        .eq("id", favoriteRow.id)
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "הוסר מהמועדפים" });
    } else {
      const { error } = await supabase
        .from("favorites" as any)
        .insert({ user_id: user.id, artwork_id: id });

      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "נשמר במועדפים" });
    }

    queryClient.invalidateQueries({ queryKey: ["favorite", id, user.id] });
    queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
  };

  const imageMissing = useMemo(() => !artwork?.image_url, [artwork?.image_url]);

  const content = (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-sm md:px-8">
        {asModal ? (
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Button>
        )}

        {isEditMode && artwork?.gallery?.slug && (
          <Button
            variant="outline"
            onClick={() => navigate(`/gallery/${artwork.gallery.slug}`)}
            className="gap-2 border-primary text-primary hover:bg-primary/10"
          >
            <Pencil className="h-4 w-4" />
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
          {imageMissing ? (
            <div className="mx-auto flex aspect-[3/2] max-h-[60vh] max-w-4xl items-center justify-center rounded-lg bg-secondary">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-12 w-12" />
                <span className="text-sm">אין תמונה</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl">
              <img
                src={artwork.image_url}
                alt={artwork.title}
                className="mx-auto max-h-[60vh] w-full rounded-lg object-contain"
              />
            </div>
          )}

          <div className="mx-auto mt-6 max-w-3xl">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">{artwork.title}</h1>
            <p className="mt-2 text-base text-muted-foreground">{artwork.topic}</p>
            <p className="mt-4 text-base leading-relaxed text-foreground/90">{artwork.post}</p>

            {(artwork.tags ?? []).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {(artwork.tags ?? []).map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {artwork.style && (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                  סגנון: {artwork.style}
                </span>
              )}
              {artwork.concept && (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
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
                <ExternalLink className="h-3.5 w-3.5" />
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
                  <Heart className={`h-4 w-4 ${isFavorited ? "fill-primary" : ""}`} />
                  שמור למועדפים
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
