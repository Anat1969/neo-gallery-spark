import { lazy, Suspense } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DockProvider } from "@/contexts/DockContext";
import AppHeader from "@/components/AppHeader";
import Index from "./pages/Index.tsx";

// Routes beyond the home page load on demand, keeping the first paint light
const GalleryRoom = lazy(() => import("./pages/GalleryRoom.tsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.tsx"));
const FavoritesBoard = lazy(() => import("./pages/FavoritesBoard.tsx"));
const ArtworkPage = lazy(() => import("./pages/ArtworkPage.tsx"));
const SearchPage = lazy(() => import("./pages/SearchPage.tsx"));
const RoomPage = lazy(() => import("./pages/RoomPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const TrashPage = lazy(() => import("./pages/TrashPage.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Last-seen data is kept in the browser, so revisits paint instantly and refresh quietly behind
const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "neo-gallery-cache-v1",
  throttleTime: 2000,
});

const PageFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <span className="h-px w-24 animate-pulse bg-foreground/40" />
  </div>
);

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 7 * 24 * 60 * 60_000,
      buster: "media-v2",
      dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && q.queryKey[0] !== "quick-index" },
    }}
  >
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <EditModeProvider>
            <DockProvider>
              <Toaster />
              <Sonner position="top-center" />
              <BrowserRouter>
                <AppHeader />
                <main className="pt-16 pb-24">
                  <Suspense fallback={<PageFallback />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/gallery/:id" element={<GalleryRoom />} />
                      <Route path="/gallery/:gallerySlug/room/:roomSlug" element={<RoomPage />} />
                      <Route path="/artwork/:id" element={<ArtworkPage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/favorites" element={<FavoritesBoard />} />
                      <Route path="/admin" element={<AdminPanel />} />
                      <Route path="/trash" element={<TrashPage />} />
                      <Route path="/login" element={<Navigate to="/" replace />} />
                      <Route path="/403" element={<Navigate to="/" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </main>
              </BrowserRouter>
            </DockProvider>
          </EditModeProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;
