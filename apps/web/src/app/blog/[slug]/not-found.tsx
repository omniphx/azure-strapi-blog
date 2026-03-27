import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold mb-2">Post not found</h1>
      <p className="text-foreground/60 mb-6">
        The post you are looking for does not exist or has been removed.
      </p>
      <Link href="/" className="text-sm hover:underline">
        ← Back to blog
      </Link>
    </main>
  );
}
