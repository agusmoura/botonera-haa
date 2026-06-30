import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "logo.svg"],
      manifest: {
        name: "La Botonera",
        short_name: "Botonera",
        description: "Botonera de Hay Algo Ahí. Disparo instantáneo, offline. Combatí la licuadora.",
        lang: "es",
        theme_color: "#0e0e10",
        background_color: "#0e0e10",
        display: "standalone",
        orientation: "portrait",
        categories: ["entertainment", "music"],
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache only the app shell. Sounds are runtime-cached (CacheFirst); the app warms
        // them in idle on load, so they go offline without bloating the install.
        globPatterns: ["**/*.{html,css,js,json,svg,woff2,png}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/sounds/"),
            handler: "CacheFirst",
            options: {
              cacheName: "botonera-sounds",
              expiration: { maxEntries: 240, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
});
