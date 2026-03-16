import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, Share2, X, ArrowRight, LogIn } from "lucide-react";

interface FavoriteItem {
  id: string;
  artworkId: string;
  title: string;
  galleryName: string;
  gallerySlug: string;
  imageUrl: string;
}

const FavoritesBoard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const {
    data: favorites = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites" as any)
        .select("id, artwork_id, artwork:artworks(id, title, image_url, gallery:galleries(name, slug))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as any[])
        .map((item) => ({
          id: item.id,
          artworkId: item.artwork?.id ?? item.artwork_id,
          title: item.artwork?.title ?? "",
          galleryName: item.artwork?.gallery?.name ?? "",
          gallerySlug: item.artwork?.gallery?.slug ?? "",
          imageUrl: item.artwork?.image_url ?? "",
        }))
        .filter((item) => item.artworkId);
    },
    enabled: !!user,
  });

  const removeFavorite = useCallback(
    async (id: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("favorites" as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "הוסר מהמועדפים" });
      queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
    },
    [queryClient, toast, user],
  );

  const handleShareList = async () => {
    if (navigator.share) {
      await navigator.share({ title: "המועדפים שלי — ART-AI", url: window.location.href });
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    toast({ title: "הקישור הועתק" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
        <div className="mb-8">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לגלריות
        </Button>

        <div className="flex flex-col items-center justify-center gap-5 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <LogIn className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">התחברי כדי לשמור מועדפים</p>
          <Button onClick={() => navigate("/login")} className="gap-2">
            <LogIn className="h-4 w-4" />
            התחברי / הירשמי
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה לגלריות
      </Button>

      {isLoading && (
        <>
          <div className="mb-8">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg bg-card">
                <Skeleton className="aspect-square w-full" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא ניתן לטעון מועדפים</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {!isLoading && !isError && favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-5 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">עדיין לא שמרת יצירות</p>
          <Button onClick={() => navigate("/")} className="gap-2">
            גלשי בגלריות
          </Button>
        </div>
      )}

      {!isLoading && !isError && favorites.length > 0 && (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">המועדפים שלי</h1>
              <span className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">
                {favorites.length}
              </span>
            </div>
            <Button variant="ghost" onClick={handleShareList} className="gap-2 text-muted-foreground hover:text-primary">
              <Share2 className="h-4 w-4" />
              שתפי רשימה
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
              >
                <button
                  onClick={() => removeFavorite(fav.id)}
                  className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-destructive opacity-100 backdrop-blur-sm transition-opacity md:opacity-0 md:group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>

                <button onClick={() => navigate(`/artwork/${fav.artworkId}`)} className="w-full text-right">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={fav.imageUrl}
                      alt={fav.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-foreground">{fav.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{fav.galleryName}</p>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FavoritesBoard;
