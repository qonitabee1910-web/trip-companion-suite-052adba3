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
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
      "react-leaflet",
      "@radix-ui",
      "react-hook-form",
      "sonner",
      "recharts",
      "embla-carousel-react",
      "react-day-picker",
      "react-barcode",
      "cmdk",
      "next-themes",
      "react-resizable-panels",
      "@hookform/resolvers",
      "qrcode.react",
      "@yudiel/react-qr-scanner",
      "input-otp",
      "react-router-dom",
    ],
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
          if (
            id.includes("react-leaflet") ||
            id.includes("@react-leaflet") ||
            id.includes("@radix-ui") ||
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("sonner") ||
            id.includes("recharts") ||
            id.includes("embla-carousel") ||
            id.includes("react-day-picker") ||
            id.includes("react-barcode") ||
            id.includes("cmdk") ||
            id.includes("next-themes") ||
            id.includes("react-resizable-panels") ||
            id.includes("qrcode.react") ||
            id.includes("@yudiel/react-qr-scanner") ||
            id.includes("input-otp")
          )
            return "react-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          if (id.includes("html-to-image") || id.includes("jspdf")) return "export-vendor";
          return "vendor";
        },
      },
    },
  },
}));
