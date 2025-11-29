# Visual Editing Implementatie Guide

Complete guide voor het implementeren of refactoren van Sanity Visual Editing in een Astro project.

## Overzicht

Visual Editing maakt het mogelijk om content direct vanuit Sanity Studio te bewerken terwijl je de live preview bekijkt. Deze guide beschrijft alle stappen en configuratie die nodig zijn.

## Vereisten

- Astro project met SSR (Server-Side Rendering)
- Sanity Studio v4 geconfigureerd
- `@sanity/astro` integratie geïnstalleerd
- React integratie (voor VisualEditing component)

## Stap 1: Dependencies Controleren

Zorg dat de volgende packages geïnstalleerd zijn:

```json
{
  "dependencies": {
    "@sanity/astro": "^3.2.10",
    "@sanity/client": "^7.13.1",
    "@astrojs/react": "^4.4.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "sanity": "^4.19.0"
  }
}
```

## Stap 2: Environment Variables Configureren

Voeg de volgende environment variables toe aan je `.env` bestand:

```env
# Public variables (worden geëxporteerd naar de client)
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false

# Private variable (alleen server-side)
SANITY_API_READ_TOKEN=your-read-token
```

**Belangrijk:**

- `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` moet `"true"` zijn om Visual Editing te activeren
- `SANITY_API_READ_TOKEN` is alleen nodig wanneer Visual Editing is ingeschakeld
- Zet `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false` in productie tenzij je Visual Editing actief wilt hebben

## Stap 3: Astro Config Aanpassen

Update `astro.config.mjs` om de Sanity integratie correct te configureren met stega support:

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import sanity from "@sanity/astro";
import react from "@astrojs/react";

export default defineConfig({
  vite: {
    ssr: {
      noExternal: ["@sanity/astro"],
    },
  },
  integrations: [
    sanity({
      projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
      dataset: import.meta.env.PUBLIC_SANITY_DATASET,
      useCdn: false, // Belangrijk: CDN uitschakelen voor Visual Editing
      apiVersion: "2025-01-28",
      studioBasePath: "/studio",
      stega: {
        studioUrl: "/studio", // URL naar je Sanity Studio
      },
    }),
    react(), // Vereist voor VisualEditing component
  ],
});
```

## Stap 4: Load Query Functie Aanpassen

Creëer of update `src/sanity/lib/load-query.ts` met Visual Editing support en URL parameter fallback:

```typescript
// src/sanity/lib/load-query.ts
import { type QueryParams } from "sanity";
import { sanityClient } from "sanity:client";

const envVisualEditingEnabled =
  import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true";
const token = import.meta.env.SANITY_API_READ_TOKEN;

export async function loadQuery<QueryResponse>({
  query,
  params,
  searchParams,
}: {
  query: string;
  params?: QueryParams;
  searchParams?: URLSearchParams;
}) {
  // Check URL parameter als fallback (voor productie)
  const urlPreviewEnabled = searchParams?.get("preview") === "true";

  // Visual editing enabled wanneer:
  // - Environment variable is true, OF
  // - URL parameter preview=true is aanwezig
  const visualEditingEnabled = envVisualEditingEnabled || urlPreviewEnabled;

  // Validatie: token is vereist wanneer Visual Editing is ingeschakeld
  if (visualEditingEnabled && !token) {
    throw new Error(
      "The `SANITY_API_READ_TOKEN` environment variable is required during Visual Editing."
    );
  }

  // Kies de juiste perspective: previewDrafts voor Visual Editing, published voor productie
  const perspective = visualEditingEnabled ? "previewDrafts" : "published";

  const { result, resultSourceMap } = await sanityClient.fetch<QueryResponse>(
    query,
    params ?? {},
    {
      filterResponse: false,
      perspective,
      // Source map is nodig voor Visual Editing om te weten waar content vandaan komt
      resultSourceMap: visualEditingEnabled ? "withKeyArraySelector" : false,
      // Stega encoding voegt metadata toe aan responses voor Visual Editing
      stega: visualEditingEnabled,
      // Token is alleen nodig voor previewDrafts perspective
      ...(visualEditingEnabled ? { token } : {}),
    }
  );

  return {
    data: result,
    sourceMap: resultSourceMap,
    perspective,
  };
}
```

**Belangrijke punten:**

- `perspective: "previewDrafts"` toont draft content tijdens Visual Editing
- `resultSourceMap: "withKeyArraySelector"` is vereist voor Visual Editing
- `stega: true` voegt metadata toe aan responses
- Token is alleen nodig voor previewDrafts perspective

## Stap 5: Sanity Config Aanpassen

Update `sanity.config.ts` om Presentation Tool te configureren:

```typescript
// sanity.config.ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { resolve } from "./src/sanity/lib/resolve";

export default defineConfig({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  plugins: [
    structureTool(),
    presentationTool({
      resolve, // Resolve configuratie (zie Stap 6)
      previewUrl: location.origin, // Base URL van je site
    }),
  ],
  schema: {
    // Je schema types
  },
});
```

## Stap 6: Resolve Configuratie

Creëer `src/sanity/lib/resolve.ts` om te definiëren hoe documenten worden gerouteerd:

```typescript
// src/sanity/lib/resolve.ts
import { defineLocations } from "sanity/presentation";
import type { PresentationPluginOptions } from "sanity/presentation";

export const resolve: PresentationPluginOptions["resolve"] = {
  locations: {
    // Voorbeeld: post document type
    post: defineLocations({
      select: {
        title: "title",
        slug: "slug.current",
      },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title || "Untitled",
            href: `/post/${doc?.slug}`,
          },
        ],
      }),
    }),
    // Voeg meer document types toe zoals nodig
    // page: defineLocations({ ... }),
    // article: defineLocations({ ... }),
  },
};
```

**Belangrijk:**

- Elke document type die je wilt previewen moet hier gedefinieerd zijn
- De `href` moet overeenkomen met je Astro routes
- De `select` fields moeten overeenkomen met je schema

## Stap 7: VisualEditing Component Toevoegen

Voeg de `VisualEditing` component toe aan je hoofd layout met URL parameter support:

```astro
---
// src/layouts/Layout.astro
import { VisualEditing } from "@sanity/astro/visual-editing";

// Check environment variable (eerste prioriteit)
const envVisualEditingEnabled =
  import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED == "true";

// Check URL parameter als fallback (voor productie)
// Gebruik Astro.request.url voor query parameters in SSR mode
const requestUrl = new URL(Astro.request.url);
const urlPreviewEnabled = requestUrl.searchParams.get("preview") === "true";

// Visual editing enabled wanneer:
// - Environment variable is true, OF
// - URL parameter preview=true is aanwezig
const visualEditingEnabled = envVisualEditingEnabled || urlPreviewEnabled;
---

<!doctype html>
<html lang="en">
  <head>
    <!-- head content -->
  </head>
  <body>
    <slot />
    <VisualEditing enabled={visualEditingEnabled} />
  </body>
</html>
```

**Belangrijk:**

- De component moet in de layout staan, niet in individuele pages
- Gebruik `Astro.request.url` voor query parameters in SSR mode
- Visual editing werkt nu via environment variable OF via `?preview=true` in de URL
- De component is alleen actief wanneer `enabled={true}`

## Stap 8: Data Fetching Aanpassen

Zorg dat alle Sanity queries via `loadQuery` gaan en geef query parameters door:

```astro
---
// src/pages/example.astro
// Zorg dat deze route SSR is (niet statisch)
export const prerender = false;

import { loadQuery } from "../sanity/lib/load-query";
import { myQuery } from "../sanity/lib/queries";

// Gebruik Astro.request.url voor query parameters in SSR mode
const requestUrl = new URL(Astro.request.url);
const { data } = await loadQuery({
  query: myQuery,
  params: {
    /* optioneel */
  },
  searchParams: requestUrl.searchParams,
});
---

<!-- Gebruik data in je template -->
```

**Belangrijk:**

- Gebruik ALTIJD `loadQuery` in plaats van direct `client.fetch()`
- Voeg `export const prerender = false` toe aan routes die preview mode moeten ondersteunen
- Geef `searchParams` door aan `loadQuery` zodat URL parameters worden herkend
- Draft content wordt automatisch getoond wanneer Visual Editing actief is (via env of URL parameter)
- Behoud preview parameter in links: `href={`/post/${slug}${requestUrl.searchParams.has('preview') ? '?preview=true' : ''}`}`

## Stap 9: Preview Mode via URL Parameter

Visual Editing kan worden geactiveerd via een URL parameter, wat handig is voor productie zonder environment variables aan te passen.

### Hoe het werkt:

1. **Environment Variable (eerste prioriteit):**
   - Zet `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true` in development
   - Visual editing is dan altijd actief

2. **URL Parameter (fallback voor productie):**
   - Voeg `?preview=true` toe aan elke URL
   - Bijvoorbeeld: `https://yoursite.com/post/example?preview=true`
   - Visual editing wordt automatisch geactiveerd
   - Werkt ook op de homepage: `https://yoursite.com/?preview=true`

### Implementatie Details:

- **Layout.astro**: Controleert zowel env variable als URL parameter
- **load-query.ts**: Accepteert `searchParams` en gebruikt deze voor preview detection
- **Pages**: Moeten `export const prerender = false` hebben voor SSR mode
- **Links**: Behoud preview parameter wanneer actief

### Voorbeeld voor Links:

```astro
// Behoud preview parameter in links const requestUrl = new
URL(Astro.request.url);
<a
  href={`/post/${slug}${requestUrl.searchParams.has("preview") ? "?preview=true" : ""}`}
>
  {title}
</a>
```

## Stap 10: Testing

### Lokaal Testen

1. Zet `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true` in je `.env` (optioneel)
2. Zorg dat `SANITY_API_READ_TOKEN` is ingesteld
3. Start je dev server: `npm run dev`
4. Test met environment variable: Visual editing zou automatisch actief moeten zijn
5. Test met URL parameter: `http://localhost:4321/post/example-post?preview=true`
6. Open Sanity Studio: `http://localhost:4321/studio`
7. Open Presentation tool in Studio
8. Selecteer een document en klik op "Open preview"
9. Je zou nu Visual Editing moeten zien werken

### Productie

- Zet `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false` in productie
- Visual editing kan nu geactiveerd worden via `?preview=true` in de URL
- Dit maakt het mogelijk om preview mode te gebruiken zonder environment variables aan te passen
- Zorg dat `SANITY_API_READ_TOKEN` beschikbaar is in productie (als environment variable)
- Gebruik: `https://yoursite.com/post/example?preview=true` om preview mode te activeren
- Links behouden automatisch de preview parameter wanneer je navigeert

## Stap 11: Troubleshooting

### Visual Editing werkt niet

1. **Check environment variables:**
   - `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` moet `"true"` zijn
   - `SANITY_API_READ_TOKEN` moet ingesteld zijn

2. **Check token permissions:**
   - Token moet "Viewer" of hoger hebben
   - Token moet toegang hebben tot het dataset

3. **Check resolve configuratie:**
   - Document types moeten gedefinieerd zijn in `resolve.ts`
   - Routes moeten overeenkomen met Astro routes

4. **Check loadQuery:**
   - Alle queries moeten via `loadQuery` gaan
   - `perspective: "previewDrafts"` moet gebruikt worden

5. **Check browser console:**
   - Zoek naar errors in de console
   - Check network requests naar Sanity API

### Draft content wordt niet getoond

- Zorg dat `perspective: "previewDrafts"` wordt gebruikt in `loadQuery`
- Check of de token correct is ingesteld
- Verifieer dat het document daadwerkelijk een draft is

### Routes matchen niet

- Check `resolve.ts` - de `href` moet overeenkomen met je Astro routes
- Verifieer dat slugs correct zijn geconfigureerd in je schema
- Check dat `getStaticPaths` (voor SSG) of routing (voor SSR) correct is

## Best Practices

1. **Draft-Aware Data Access:**
   - Gebruik ALTIJD `loadQuery` voor Sanity queries
   - Nooit direct `client.fetch()` aanroepen

2. **Environment Management:**
   - Visual Editing alleen inschakelen wanneer nodig
   - Gebruik verschillende configuraties voor dev/prod

3. **Token Security:**
   - `SANITY_API_READ_TOKEN` is server-side only
   - Nooit committen naar git
   - Gebruik read-only tokens waar mogelijk

4. **Performance:**
   - `useCdn: false` is vereist voor Visual Editing
   - Houd rekening met extra latency tijdens preview

5. **Routing Discipline:**
   - Routes in Astro zijn de "source of truth"
   - Resolve configuratie moet routes matchen
   - Houd routes en CMS configuratie gesynchroniseerd

## Checklist voor Implementatie

- [ ] Dependencies geïnstalleerd (`@sanity/astro`, `@astrojs/react`, `react`, `react-dom`)
- [ ] Environment variables geconfigureerd
- [ ] `astro.config.mjs` aangepast met stega configuratie
- [ ] `load-query.ts` geïmplementeerd met Visual Editing support
- [ ] `sanity.config.ts` heeft `presentationTool` geconfigureerd
- [ ] `resolve.ts` heeft alle document types gedefinieerd
- [ ] `VisualEditing` component toegevoegd aan layout
- [ ] Alle queries gebruiken `loadQuery`
- [ ] Getest lokaal met Visual Editing enabled
- [ ] Productie configuratie gecontroleerd (Visual Editing disabled)

## Referenties

- [Sanity Visual Editing Docs](https://www.sanity.io/docs/visual-editing)
- [Sanity Presentation Tool](https://www.sanity.io/docs/presentation-tool)
- [Astro Sanity Integration](https://www.sanity.io/docs/astro-integration)
