// ./src/sanity/lib/queries.ts

/**
 * Alle GROQ queries voor het project
 */

// Query om alle posts op te halen voor de index pagina
export const postsQuery = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage,
  "author": author->{
    _id,
    name
  },
  "categories": categories[]->{
    _id,
    title
  },
  publishedAt
}`;

// Query om alleen slugs op te halen voor getStaticPaths
export const postSlugsQuery = `*[_type == "post" && defined(slug.current)] {
  "slug": slug.current
}`;

// Query om een individuele post op te halen op basis van slug
export const postBySlugQuery = `*[_type == "post" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  mainImage,
  publishedAt,
  body,
  "author": author->{
    _id,
    name,
    image
  },
  "categories": categories[]->{
    _id,
    title
  }
}`;

