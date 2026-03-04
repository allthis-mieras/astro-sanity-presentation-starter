# Sanity Setup - Environment Variables & Configuratie

## Environment Variables

### Vereiste Variabelen

Maak een `.env.local` bestand in de root van je project met de volgende variabelen:

```env
# Public variables (worden geëxporteerd naar de client)
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production

# Private variable (alleen server-side, NIET public)
SANITY_API_READ_TOKEN=your-read-token
```

### Optionele Variabelen

```env
# Visual Editing (optioneel, default: false)
PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true
```

### Variabele Uitleg

- **`PUBLIC_SANITY_PROJECT_ID`**: Je Sanity project ID (vind je in sanity.io/manage)
- **`PUBLIC_SANITY_DATASET`**: De dataset naam (meestal `production` of `development`)
- **`SANITY_API_READ_TOKEN`**: Read token voor Visual Editing en draft mode (vind je in Sanity Studio → API → Tokens)
- **`PUBLIC_SANITY_VISUAL_EDITING_ENABLED`**: Zet op `true` om Visual Editing in te schakelen tijdens development

## Bestand Structuur

### `.env.local` (lokaal development)

- **NIET** committen naar git
- Gebruikt voor lokale development
- Overschrijft `.env` als die bestaat

### `.env` (optioneel, voor defaults)

- Kan worden gecommit met placeholder waarden
- Wordt overschreven door `.env.local`

### `.env.production` (optioneel)

- Voor productie builds
- Wordt gebruikt tijdens `npm run build` in productie

## .gitignore Configuratie

Zorg dat je `.gitignore` deze bestanden bevat:

```gitignore
# environment variables
.env
.env.production
.env.local
```

## Configuratie Bestanden

### 1. `sanity.config.ts`

```typescript
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schema } from "./src/sanity/schemaTypes";
import { presentationTool } from "sanity/presentation";
import { resolve } from "./src/sanity/lib/resolve";

export default defineConfig({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  plugins: [
    structureTool(),
    presentationTool({
      resolve,
      previewUrl: location.origin,
    }),
  ],
  schema,
});
```

### 2. `astro.config.mjs`

```javascript
import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import sanity from "@sanity/astro";
import react from "@astrojs/react";
import { loadEnv } from "vite";

// Load environment variables
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV || "production",
  process.cwd(),
  ""
);

export default defineConfig({
  adapter: netlify(),
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

  // Vite configuratie voor Sanity dependencies (optioneel)
  vite: {
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@sanity/astro",
        "sanity",
        "@sanity/client",
      ],
      exclude: [
        "@sanity/astro/dist/studio",
        "@sanity/visual-editing",
        "@sanity/presentation-comlink",
        "@sanity/preview-url-secret",
      ],
    },
    ssr: {
      noExternal: ["@sanity/astro"],
    },
    server: {
      fs: {
        allow: [".."],
      },
    },
  },
});
```

### 3. `src/sanity/lib/load-query.ts`

```typescript
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
  const urlPreviewEnabled = searchParams?.get("preview") === "true";
  const visualEditingEnabled = envVisualEditingEnabled || urlPreviewEnabled;

  if (visualEditingEnabled && !token) {
    throw new Error(
      "The `SANITY_API_READ_TOKEN` environment variable is required during Visual Editing."
    );
  }

  const perspective = visualEditingEnabled ? "previewDrafts" : "published";

  const { result, resultSourceMap } = await sanityClient.fetch<QueryResponse>(
    query,
    params ?? {},
    {
      filterResponse: false,
      perspective,
      resultSourceMap: visualEditingEnabled ? "withKeyArraySelector" : false,
      stega: visualEditingEnabled,
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

## NPM Scripts

### Development

```json
{
  "scripts": {
    "dev": "astro dev"
  }
}
```

**Hoe het werkt:**

- `npm run dev` start de Astro development server
- Astro laadt automatisch `.env.local` en `.env` bestanden
- Environment variables zijn beschikbaar via `import.meta.env.*`
- Visual Editing werkt als `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true` of `?preview=true` in de URL

### Build

```json
{
  "scripts": {
    "build": "astro build"
  }
}
```

**Hoe het werkt:**

- `npm run build` bouwt de productie versie
- Gebruikt environment variables van de build omgeving
- Voor Netlify: zet environment variables in Netlify dashboard

## Visual Editing Logica

Visual Editing wordt geactiveerd wanneer:

1. **Environment Variable**: `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true` in `.env.local`
2. **URL Parameter**: `?preview=true` toegevoegd aan de URL (werkt in productie)

**Prioriteit:**

- Als environment variable `true` is → altijd aan
- Als URL parameter `preview=true` is → aan (ook zonder env var)
- Anders → uit (alleen published content)

## Netlify Configuratie

### `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  # Exclude PUBLIC_* variables from secrets scanning
  SECRETS_SCAN_OMIT_KEYS = "PUBLIC_SANITY_DATASET,PUBLIC_SANITY_PROJECT_ID"
  SECRETS_SCAN_OMIT_PATHS = "dist/,.netlify/,.cursor/"
```

### Netlify Environment Variables

Zet deze in het Netlify dashboard (Site settings → Environment variables):

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`
- `SANITY_API_READ_TOKEN` (voor Visual Editing in productie)

## Vite Dependency Optimization

### Probleem: Vite versie conflicten en chunk errors

Soms krijg je errors zoals:

- `Failed to fetch dynamically imported module: PostMessagePreviewSnapshots-*.js`
- `The file does not exist at node_modules/.vite/deps/chunk-*.js`
- Meerdere Vite versies in dependency tree (6.x en 7.x)

### Oplossing: Vite versie forceren en configuratie toevoegen

#### Stap 1: Voeg `overrides` toe aan `package.json`

```json
{
  "devDependencies": {
    // ... je devDependencies
  },
  "overrides": {
    "vite": "^6.4.1"
  }
}
```

Dit forceert één Vite versie in de hele dependency tree.

#### Stap 2: Voeg Vite configuratie toe aan `astro.config.mjs`

Zie de `vite` sectie in de `astro.config.mjs` voorbeeld hierboven.

#### Stap 3: Herinstalleer dependencies

```bash
# Verwijder lock file en cache
rm -f package-lock.json
rm -rf node_modules/.vite

# Herinstalleer
npm install
```

#### Stap 4: Check Vite versies

```bash
npm list vite --all
```

Alle Vite versies zouden nu `6.4.1` moeten zijn.

## Belangrijke Punten

1. **PUBLIC\_ prefix**: Variabelen met `PUBLIC_` worden geëxporteerd naar de client-side code
2. **Zonder PUBLIC\_**: Variabelen zonder prefix zijn alleen beschikbaar server-side
3. **Token Security**: `SANITY_API_READ_TOKEN` heeft geen `PUBLIC_` prefix en is dus server-side only
4. **Development vs Production**: `.env.local` voor development, Netlify environment variables voor productie
5. **Visual Editing**: Werkt alleen met een read token, anders krijg je een error
6. **Vite Configuratie**: Voeg altijd de Vite configuratie toe om dependency optimization problemen te voorkomen

## Troubleshooting

### "PUBLIC_SANITY_PROJECT_ID is undefined"

- Check of `.env.local` bestaat en de juiste variabelen bevat
- Herstart de dev server na het aanmaken/wijzigen van `.env.local`

### "SANITY_API_READ_TOKEN is required during Visual Editing"

- Voeg `SANITY_API_READ_TOKEN` toe aan `.env.local`
- Of zet `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false` om Visual Editing uit te zetten

### Visual Editing werkt niet in productie

- Zet `SANITY_API_READ_TOKEN` in Netlify environment variables
- Gebruik `?preview=true` in de URL als fallback

### Vite dependency optimization errors

**Error**: `Failed to fetch dynamically imported module: PostMessagePreviewSnapshots-*.js` of `chunk-*.js does not exist`

**Oplossing**:

1. Voeg `overrides` toe aan `package.json` (zie Vite Dependency Optimization sectie)
2. Voeg Vite configuratie toe aan `astro.config.mjs` (zie voorbeeld hierboven)
3. Verwijder Vite cache: `rm -rf node_modules/.vite`
4. Herinstalleer: `rm -f package-lock.json && npm install`
5. Herstart dev server: `npm run dev`

**Als het probleem blijft**:

- Check of alle Vite versies hetzelfde zijn: `npm list vite --all`
- Voeg `force: true` toe aan `optimizeDeps` in Vite configuratie
