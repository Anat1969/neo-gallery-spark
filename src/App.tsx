import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import GalleryRoom from "./pages/GalleryRoom.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import FavoritesBoard from "./pages/FavoritesBoard.tsx";
import ArtworkPage from "./pages/ArtworkPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/gallery/:id" element={<GalleryRoom />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/favorites" element={<FavoritesBoard />} />
          <Route path="/artwork/:id" element={<ArtworkPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
