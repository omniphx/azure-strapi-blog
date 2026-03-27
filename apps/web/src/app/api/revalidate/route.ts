import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Strapi webhook handler for on-demand revalidation.
 *
 * Configure in Strapi admin:
 *   Settings → Webhooks → Create webhook
 *   URL: https://your-web-app.azurewebsites.net/api/revalidate
 *   Headers: { "x-revalidate-secret": "<your secret>" }
 *   Events: entry.create, entry.update, entry.delete, entry.publish, entry.unpublish
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  let body: { model?: string; entry?: { slug?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const model = body?.model;

  if (model === "post") {
    revalidateTag("posts", "max" as Parameters<typeof revalidateTag>[1]);
    revalidateTag("post-slugs", "max" as Parameters<typeof revalidateTag>[1]);

    const slug = body?.entry?.slug;
    if (slug) {
      revalidateTag(`post:${slug}`, "max" as Parameters<typeof revalidateTag>[1]);
    }
  }

  return NextResponse.json({ revalidated: true, model });
}
