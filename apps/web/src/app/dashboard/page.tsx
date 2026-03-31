import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/strapi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { data: posts } = await getPosts({ revalidate: 0 });

  const categories = new Map<string, number>();
  let latestPost = posts[0] ?? null;

  for (const post of posts) {
    const name = post.category?.name ?? "Uncategorized";
    categories.set(name, (categories.get(name) ?? 0) + 1);
    if (post.publishedAt > (latestPost?.publishedAt ?? "")) {
      latestPost = post;
    }
  }

  const authors = new Set(posts.map((p) => p.author?.name).filter(Boolean));

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-foreground/60">
          Live blog stats &mdash; rendered at{" "}
          <time className="font-mono text-sm">
            {new Date().toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "medium",
            })}
          </time>
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        <StatCard label="Total Posts" value={posts.length} />
        <StatCard label="Categories" value={categories.size} />
        <StatCard label="Authors" value={authors.size} />
      </div>

      {/* Posts by category */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Posts by Category</h2>
        {categories.size === 0 ? (
          <p className="text-foreground/60">No posts yet.</p>
        ) : (
          <ul className="space-y-2">
            {[...categories.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <li
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-foreground/10 px-4 py-3"
                >
                  <span>{name}</span>
                  <span className="text-sm font-mono text-foreground/60">
                    {count}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* Most recent post */}
      {latestPost && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Most Recent Post</h2>
          <Link
            href={`/blog/${latestPost.slug}`}
            className="block rounded-lg border border-foreground/10 px-4 py-4 hover:bg-foreground/5 transition-colors"
          >
            <p className="font-medium">{latestPost.title}</p>
            <p className="text-sm text-foreground/60 mt-1">
              {latestPost.author && `${latestPost.author.name} · `}
              {new Date(latestPost.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </Link>
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-foreground/10 px-4 py-5 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-foreground/60 mt-1">{label}</p>
    </div>
  );
}
