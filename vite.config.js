import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@ikijs/")) return "iki-engine";
          if (id.includes("/node_modules/ag-psd/")) return "psd-import";
          if (id.includes("/node_modules/@supabase/")) return "supabase";
          if (id.includes("/node_modules/lucide-react/")) return "icons";
        }
      }
    }
  }
});