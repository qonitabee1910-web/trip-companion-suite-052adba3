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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core", "react-leaflet", "@radix-ui"],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("/scheduler/") ||
            id.includes("/react-router") ||
            id.includes("/react-router-dom/")
          ) {
            return "react-vendor";
          }
          if (id.includes("leaflet") && !id.includes("react-leaflet")) return "leaflet-vendor";
          if (id.includes("react-leaflet") || id.includes("@react-leaflet") || id.includes("@radix-ui")) return "react-vendor";
          if (id.includes("@supabase") || id.includes("@tanstack/react-query") || id.includes("@tanstack/query-core")) {
            return "supabase-vendor";
          }
          if (id.includes("lucide-react")) return "icons-vendor";
          if (id.includes("recharts") || id.includes("/d3-")) return "charts-vendor";
          if (id.includes("embla-carousel")) return "carousel-vendor";
          if (id.includes("date-fns") || id.includes("react-day-picker")) return "date-vendor";
          return "vendor";
        },
      },
    },
  },
}));
