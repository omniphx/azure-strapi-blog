import Link from "next/link";
import Image from "next/image";
import { getPosts, getStrapiMediaUrl } from "@/lib/strapi";

export default async function HomePage() {
  const { data: posts } = await getPosts();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <p className="mt-2 text-foreground/60">Latest articles and updates</p>
      </header>

      {posts.length === 0 ? (
        <p className="text-foreground/60">No posts yet. Add some content in the Strapi admin.</p>
      ) : (
        <ul className="space-y-10">
          {posts.map((post, index) => (
            <li key={post.documentId}>
              <article className="group grid gap-4 sm:grid-cols-[1fr_2fr]">
                {post.cover && (
                  <Link href={`/blog/${post.slug}`} className="overflow-hidden rounded-lg">
                    <Image
                      src={getStrapiMediaUrl(post.cover.formats?.medium?.url ?? post.cover.url)}
                      alt={post.cover.alternativeText ?? post.title}
                      width={post.cover.formats?.medium?.width ?? post.cover.width}
                      height={post.cover.formats?.medium?.height ?? post.cover.height}
                      className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 33vw"
                      priority={index < 2}
                    />
                  </Link>
                )}
                <div className="flex flex-col justify-center gap-2">
                  {post.category && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                      {post.category.name}
                    </span>
                  )}
                  <h2 className="text-xl font-semibold leading-snug">
                    <Link href={`/blog/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-foreground/70 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-foreground/50 mt-1">
                    {post.author && <span>{post.author.name}</span>}
                    <time dateTime={post.publishedAt}>
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
