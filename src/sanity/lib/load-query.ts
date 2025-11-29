// ./src/sanity/lib/load-query.ts
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

  // Debug logging (verwijder dit later)
  console.log("loadQuery Debug:", {
    envVisualEditingEnabled,
    urlPreviewEnabled,
    visualEditingEnabled,
    hasToken: !!token,
    searchParams: searchParams ? Object.fromEntries(searchParams) : null,
  });

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
