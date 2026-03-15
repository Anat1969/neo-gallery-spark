import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditModeProvider } from "@/contexts/EditModeContext";
import EditModeToggle from "@/components/EditModeToggle";
import Index from "./pages/Index.tsx";
import GalleryRoom from "./pages/GalleryRoom.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import FavoritesBoard from "./pages/FavoritesBoard.tsx";
import ArtworkPage from "./pages/ArtworkPage.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <EditModeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/gallery/:id" element={<GalleryRoom />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/favorites" element={<FavoritesBoard />} />
            <Route path="/artwork/:id" element={<ArtworkPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <EditModeToggle />
        </BrowserRouter>
      </EditModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
