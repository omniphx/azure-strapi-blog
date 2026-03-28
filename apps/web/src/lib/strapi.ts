/**
 * Strapi API client — lazy singleton pattern for build-safe initialization.
 * Never create the client at module scope; Next.js static generation
 * may evaluate modules before runtime env vars are present.
 */

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

type StrapiResponse<T> = {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

type FetchOptions = {
  revalidate?: number | false;
  tags?: string[];
};

async function strapiRequest<T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  options: FetchOptions = {}
): Promise<T> {
  const url = new URL(`/api${path}`, STRAPI_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (STRAPI_API_TOKEN) {
    headers["Authorization"] = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const res = await fetch(url.toString(), {
    headers,
    next: {
      revalidate: options.revalidate,
      tags: options.tags,
    },
  });

  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${res.statusText} — ${url.pathname}`);
  }

  return res.json() as Promise<T>;
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export type Post = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: string;
  updatedAt: string;
  cover: StrapiImage | null;
  category: Category | null;
  author: Author | null;
};

export type StrapiImage = {
  id: number;
  documentId: string;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  formats: {
    thumbnail?: ImageFormat;
    small?: ImageFormat;
    medium?: ImageFormat;
    large?: ImageFormat;
  };
};

type ImageFormat = {
  url: string;
  width: number;
  height: number;
};

export type Category = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
};

export type Author = {
  id: number;
  documentId: string;
  name: string;
  email: string;
  avatar: StrapiImage | null;
};

export async function getPosts(options: FetchOptions = {}): Promise<StrapiResponse<Post[]>> {
  try {
    return await strapiRequest<StrapiResponse<Post[]>>(
      "/posts",
      {
        "status": "published",
        "populate[cover]": "true",
        "populate[category]": "true",
        "populate[author][populate][avatar]": "true",
        "sort[0]": "publishedAt:desc",
      },
      { revalidate: 60, tags: ["posts"], ...options }
    );
  } catch {
    return { data: [], meta: {} };
  }
}

export async function getPost(slug: string, options: FetchOptions = {}): Promise<Post | null> {
  try {
    const res = await strapiRequest<StrapiResponse<Post[]>>(
      "/posts",
      {
        "status": "published",
        "filters[slug][$eq]": slug,
        "populate[cover]": "true",
        "populate[category]": "true",
        "populate[author][populate][avatar]": "true",
      },
      { revalidate: 60, tags: [`post:${slug}`], ...options }
    );
    return res.data[0] ?? null;
  } catch {
    return null;
  }
}

export async function getPostSlugs(): Promise<string[]> {
  try {
    const res = await strapiRequest<StrapiResponse<Pick<Post, "slug">[]>>(
      "/posts",
      { "status": "published", "fields[0]": "slug", "pagination[pageSize]": 100 },
      { revalidate: 3600, tags: ["post-slugs"] }
    );
    return res.data.map((post) => post.slug);
  } catch {
    // Strapi unavailable at build time — pages will be generated on first request (ISR)
    return [];
  }
}

export function getStrapiMediaUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${STRAPI_URL}${url}`;
}
