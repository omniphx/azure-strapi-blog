**Title:** How to Configure Azure Front Door as a CDN for Next.js
**Slug:** configure-azure-front-door-cdn-nextjs
**Excerpt:** A step-by-step guide to setting up Azure Front Door as a CDN in front of a Next.js application hosted on Azure App Service, with custom caching rules and a flat TTL.

---

If you're running a Next.js site on Azure App Service, adding a CDN in front of it can dramatically improve load times for your visitors. Azure Front Door is Microsoft's global CDN and load balancer — and it takes just a few minutes to set up basic caching.

In this guide, we'll configure Azure Front Door with a simple 5-minute TTL cache for a Next.js app that uses static generation (SSG) and incremental static regeneration (ISR).

## Prerequisites

- A Next.js application deployed to Azure App Service
- An Azure subscription
- Access to the Azure Portal

## Why Azure Front Door?

Azure Front Door sits at the edge of Microsoft's global network, caching your content at points of presence (POPs) close to your users. For a statically generated Next.js site, this means:

- **Faster page loads** — cached HTML is served from the nearest edge location instead of hitting your App Service
- **Lower origin load** — your App Service handles fewer requests since the CDN absorbs repeat traffic
- **Built-in TLS** — Front Door provides free managed certificates for custom domains

## Step 1: Create an Azure Front Door Profile

1. In the Azure Portal, search for **Front Door and CDN profiles** and click **Create**
2. Select **Azure Front Door** (not classic) and choose **Custom create**
3. Pick your subscription and resource group
4. Give the profile a name
5. Select the **Standard** tier — this is sufficient for caching and costs very little for low-traffic sites

## Step 2: Configure the Endpoint and Origin

During creation (or afterwards via the Front Door Manager blade):

1. **Add an endpoint** — this gives you a hostname like `<name>.azurefd.net`
2. **Add a route** with the following settings:
   - **Domains**: your Front Door endpoint hostname
   - **Patterns to match**: `/*`
   - **Origin group**: create a new one pointing to your App Service (e.g., `my-nextjs-app.azurewebsites.net`)
   - **Origin type**: App Service
   - **Forwarding protocol**: HTTPS only
3. **Enable caching** on the route
   - **Query string caching behavior**: Ignore Query String (fine for SSG pages with clean URLs)

At this point, Front Door will proxy requests to your App Service and cache responses based on whatever `Cache-Control` headers your origin sends.

## Step 3: Override the TTL with a Rule Set

Next.js sends its own cache headers for ISR pages, but if you want a simple, uniform cache duration — say 5 minutes — you can override them with a Front Door Rule Set.

1. In your Front Door profile, go to **Rule Sets** and create a new one
2. Add a rule with the following configuration:
   - **Condition**: leave empty to match all requests (or set Request URL path matches `/*`)
   - **Action**: Route configuration override
     - **Caching**: Enabled
     - **Cache behavior**: Override always
     - **Cache duration**: 0 days, 0 hours, 5 minutes, 0 seconds
     - **Query string caching behavior**: Ignore Query String
     - **Compression**: Enabled
3. Attach this rule set to your route (edit the route and select the rule set under the Rule Sets tab)

The "Override always" setting tells Front Door to ignore the origin's `Cache-Control` headers and cache every response for exactly 5 minutes.

### Enabling compression

The Compression setting in the rule enables gzip and Brotli compression at the Front Door edge. This means cached responses are served compressed to visitors, resulting in smaller payloads and faster page loads — especially for HTML, CSS, and JavaScript.

## Step 4: Exclude Specific Paths from Caching

You may have pages or API routes that should never be cached. To handle this, add a higher-priority rule above your catch-all caching rule.

For example, to bypass the cache for a specific blog post or an API endpoint:

1. In the same Rule Set, add a new rule **above** the caching rule (order matters — Front Door evaluates rules top to bottom)
2. **Condition**: Request URL path — **Equals** — `/api/revalidate` (or whatever path you want to exclude)
3. **Action**: Route configuration override
   - **Caching**: Disabled

You can add multiple exclusion rules. Just make sure they appear before the catch-all caching rule in the list.

## Step 5: Point a Custom Domain (Optional)

If you have a custom domain:

1. Go to **Domains** in the Front Door blade
2. Click **Add a domain** and enter your domain name
3. Validate ownership with a TXT DNS record
4. Associate the domain with your route
5. Front Door will automatically provision a free managed TLS certificate

Update your DNS to point to the Front Door endpoint (`<name>.azurefd.net`) via a CNAME record.

## How It Works with Next.js SSG

Here's what happens when a visitor requests a page:

1. The request hits the nearest Azure Front Door POP
2. If the page is cached and the TTL hasn't expired, Front Door returns it immediately — your App Service is never contacted
3. If the cache has expired (or it's a first request), Front Door forwards the request to your App Service origin
4. Your Next.js server returns the statically generated HTML
5. Front Door caches the response for 5 minutes and serves it to the visitor

With a 5-minute TTL, your content is never more than 5 minutes stale. For a blog or marketing site, this is usually more than acceptable — and the performance improvement is significant.

## Cost Considerations

Azure Front Door Standard tier pricing is based on:

- **Base fee**: a small monthly charge per profile
- **Per-request fee**: very low cost per request at the edge
- **Data transfer**: charged per GB transferred from edge to client

For a low-traffic blog, the total cost is typically just a few dollars per month — well worth the performance improvement.

## Summary

Adding Azure Front Door to a Next.js application on Azure App Service is a quick way to improve performance without changing any application code. With a simple 5-minute TTL rule, your statically generated pages are served from edge locations worldwide, reducing latency and offloading traffic from your origin server.
