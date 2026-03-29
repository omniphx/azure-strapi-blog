import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { marked } from "marked";
import { getPost, getPostSlugs, getStrapiMediaUrl } from "@/lib/strapi";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: post.cover
      ? {
          images: [
            {
              url: getStrapiMediaUrl(post.cover.url),
              width: post.cover.width,
              height: post.cover.height,
              alt: post.cover.alternativeText ?? post.title,
            },
          ],
        }
      : undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-8">
        <Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
          ← Back to blog
        </Link>
      </nav>

      <article>
        <header className="mb-8">
          {post.category && (
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
              {post.category.name}
            </span>
          )}
          <h1 className="mt-2 text-3xl font-bold tracking-tight leading-tight">{post.title}</h1>
          <div className="flex items-center gap-3 mt-4 text-sm text-foreground/60">
            {post.author && (
              <div className="flex items-center gap-2">
                {post.author.avatar && (
                  <Image
                    src={getStrapiMediaUrl(
                      post.author.avatar.formats?.thumbnail?.url ?? post.author.avatar.url
                    )}
                    alt={post.author.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span>{post.author.name}</span>
              </div>
            )}
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>
        </header>

        {post.cover && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <Image
              src={getStrapiMediaUrl(post.cover.formats?.large?.url ?? post.cover.url)}
              alt={post.cover.alternativeText ?? post.title}
              width={post.cover.formats?.large?.width ?? post.cover.width}
              height={post.cover.formats?.large?.height ?? post.cover.height}
              className="w-full object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        )}

        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: marked.parse(post.content) }}
        />
      </article>
    </main>
  );
}
