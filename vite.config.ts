import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: cached across deploys and downloaded in parallel
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          data: ["@supabase/supabase-js", "@tanstack/react-query", "@tanstack/react-query-persist-client", "@tanstack/query-sync-storage-persister"],
          motion: ["framer-motion"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select", "@radix-ui/react-alert-dialog", "@radix-ui/react-tooltip", "@radix-ui/react-toast", "cmdk", "sonner"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
