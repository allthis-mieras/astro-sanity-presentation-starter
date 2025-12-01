// @ts-check
import { defineConfig } from "astro/config";
import sanity from "@sanity/astro";
import react from "@astrojs/react";
// import netlify from "@astrojs/netlify";

import { loadEnv } from "vite";
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV || "production",
  process.cwd(),
  ""
);

// https://astro.build/config
export default defineConfig({
  integrations: [
    sanity({
     projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      useCdn: false,
      apiVersion: "2025-01-28",
      studioBasePath: "/studio",
      stega: {
        studioUrl: "/studio",
      },
    }),

    react(),
  ],
  // adapter: netlify(),

   // Vite configuratie voor Sanity dependencies
  vite: {
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@sanity/astro',
        'sanity',
        '@sanity/client',
      ],
      exclude: [
        '@sanity/astro/dist/studio',
        '@sanity/visual-editing',
        '@sanity/presentation-comlink',
        '@sanity/preview-url-secret',
      ],
    },
    ssr: {
      noExternal: ['@sanity/astro'],
    },
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
  
});
