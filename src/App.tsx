import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import EditModeToggle from "@/components/EditModeToggle";
import AppHeader from "@/components/AppHeader";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import GalleryRoom from "./pages/GalleryRoom.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import FavoritesBoard from "./pages/FavoritesBoard.tsx";
import ArtworkPage from "./pages/ArtworkPage.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import ForbiddenPage from "./pages/ForbiddenPage.tsx";
import RoomPage from "./pages/RoomPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EditModeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppHeader />
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/gallery/:id" element={<GalleryRoom />} />
              <Route path="/gallery/:gallerySlug/room/:roomSlug" element={<RoomPage />} />
              <Route path="/artwork/:id" element={<ArtworkPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/403" element={<ForbiddenPage />} />

              {/* Protected: logged-in users */}
              <Route path="/favorites" element={<ProtectedRoute><FavoritesBoard /></ProtectedRoute>} />

              {/* Protected: admin only */}
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <EditModeToggle />
          </BrowserRouter>
        </EditModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
