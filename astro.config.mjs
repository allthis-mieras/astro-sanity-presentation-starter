// @ts-check
import { defineConfig } from "astro/config";

import netlify from "@astrojs/netlify";
import sanity from "@sanity/astro";
import react from "@astrojs/react";

import { loadEnv } from "vite";
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  ""
);

// https://astro.build/config
export default defineConfig({
  adapter: netlify(),
  vite: {
    optimizeDeps: {
      exclude: ["refractor"],
      include: ["sanity > @sanity/ui", "sanity > @sanity/icons"],
    },
    ssr: {
      noExternal: ["@sanity/astro"],
    },
  },
  integrations: [
    sanity({
      projectId: "ithwpxsc",
      dataset: "production",
      useCdn: false,
      apiVersion: "2025-01-28",
      studioBasePath: "/studio",
      stega: {
        studioUrl: "/studio",
      },
    }),

    react(),
  ],
});
