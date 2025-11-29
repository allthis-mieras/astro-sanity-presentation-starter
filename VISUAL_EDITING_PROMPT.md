# Visual Editing Implementatie Prompt

Gebruik deze prompt om Visual Editing te implementeren in een Astro + Sanity project:

---

## Prompt voor AI Assistant

"Implementeer Sanity Visual Editing in dit Astro project. Volg deze stappen:

### 1. Dependencies Controleren
- Verifieer dat `@sanity/astro`, `@astrojs/react`, `react`, en `react-dom` geïnstalleerd zijn
- Installeer ontbrekende packages indien nodig

### 2. Environment Variables
Voeg toe aan `.env`:
- `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=false` (zet op `true` voor testing)
- `SANITY_API_READ_TOKEN=your-read-token` (server-side only)

### 3. Astro Config (`astro.config.mjs`)
- Zorg dat `@sanity/astro` integratie `stega: { studioUrl: "/studio" }` heeft
- Zet `useCdn: false` in de Sanity configuratie
- Voeg `react()` integratie toe als die nog niet bestaat
- Zet `ssr.noExternal: ["@sanity/astro"]` in vite config

### 4. Load Query Functie (`src/sanity/lib/load-query.ts`)
Creëer of update met:
- Check voor `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` environment variable
- Valideer dat `SANITY_API_READ_TOKEN` bestaat wanneer Visual Editing enabled is
- Gebruik `perspective: "previewDrafts"` wanneer Visual Editing enabled is, anders `"published"`
- Voeg toe aan fetch options:
  - `resultSourceMap: visualEditingEnabled ? "withKeyArraySelector" : false`
  - `stega: visualEditingEnabled`
  - `token` alleen wanneer Visual Editing enabled is
- Return `{ data: result, sourceMap: resultSourceMap, perspective }`

### 5. Sanity Config (`sanity.config.ts`)
- Voeg `presentationTool` toe aan plugins array
- Configureer met `resolve` import en `previewUrl: location.origin`

### 6. Resolve Configuratie (`src/sanity/lib/resolve.ts`)
Creëer bestand met:
- Import `defineLocations` van `"sanity/presentation"`
- Definieer `resolve` object met `locations` voor elk document type
- Voor elk type: gebruik `defineLocations` met `select` (title, slug) en `resolve` functie die `href` retourneert die matcht met Astro routes

### 7. VisualEditing Component
- Import `{ VisualEditing }` van `"@sanity/astro/visual-editing"` in hoofd layout
- Check `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` environment variable
- Voeg `<VisualEditing enabled={visualEditingEnabled} />` toe aan layout (binnen `<body>` maar na `<slot />`)

### 8. Data Fetching
- Zorg dat alle Sanity queries via `loadQuery` functie gaan
- Vervang alle directe `client.fetch()` calls met `loadQuery`
- Gebruik de return waarde `{ data }` in plaats van direct result

### 9. Verificatie
- Controleer dat alle routes in `resolve.ts` overeenkomen met Astro routes
- Verifieer dat alle document types die gepreviewd moeten worden gedefinieerd zijn
- Test dat draft content wordt getoond wanneer Visual Editing enabled is

### Belangrijke Regels:
- Gebruik ALTIJD `loadQuery` voor Sanity queries, nooit direct `client.fetch()`
- `SANITY_API_READ_TOKEN` is server-side only, nooit naar client sturen
- `useCdn: false` is vereist voor Visual Editing
- Routes in Astro zijn de source of truth, resolve config moet deze matchen
- Visual Editing alleen inschakelen wanneer nodig (niet in productie tenzij gewenst)

Implementeer dit stap voor stap en verifieer elke stap voordat je doorgaat naar de volgende."

---

## Snelle Checklist

Gebruik deze checklist om te verifiëren dat alles correct is geïmplementeerd:

- [ ] Dependencies: `@sanity/astro`, `@astrojs/react`, `react`, `react-dom`
- [ ] Env vars: `PUBLIC_SANITY_VISUAL_EDITING_ENABLED`, `SANITY_API_READ_TOKEN`
- [ ] Astro config: `stega` configuratie, `useCdn: false`, `react()` integratie
- [ ] `load-query.ts`: perspective switching, resultSourceMap, stega encoding
- [ ] `sanity.config.ts`: `presentationTool` plugin
- [ ] `resolve.ts`: alle document types met correcte routes
- [ ] Layout: `VisualEditing` component met enabled prop
- [ ] Alle queries gebruiken `loadQuery` functie
- [ ] Routes in resolve matchen Astro routes

---

## Troubleshooting Tips

Als Visual Editing niet werkt:

1. Check browser console voor errors
2. Verifieer environment variables zijn correct ingesteld
3. Check dat token correcte permissions heeft
4. Verifieer dat `resolve.ts` routes correct zijn
5. Check dat alle queries via `loadQuery` gaan
6. Verifieer dat `perspective: "previewDrafts"` wordt gebruikt

