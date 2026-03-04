// ./src/sanity/lib/queries.ts
// GROQ queries voor draft-aware data via loadQuery

export const postsQuery = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage,
  "author": author->{ name },
  "categories": categories[]->{ title }
}`;

export const postSlugsQuery = `*[_type == "post"]{ "slug": slug.current }`;

export const postBySlugQuery = `*[_type == "post" && slug.current == $slug][0]{
  _id,
  title,
  body
}`;
