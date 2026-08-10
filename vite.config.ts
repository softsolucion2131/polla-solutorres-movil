import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Desactiva la generación de SSR para compilar una SPA cliente estática
    ssr: false,
  },
  nitro: {
    preset: "static",
    prerender: {
      crawlLinks: false,
    },
  },
});