**Title:** How to Deploy a Next.js App on Azure with Docker
**Slug:** deploy-nextjs-azure-docker
**Excerpt:** Learn how to containerize a Next.js application and deploy it to Azure App Service using Docker, Azure Container Registry, and GitHub Actions for CI/CD.

---

Deploying a Next.js application to Azure doesn't have to be complicated. In this guide, we'll walk through containerizing a Next.js app with Docker and deploying it to Azure App Service with a full CI/CD pipeline using GitHub Actions.

## Prerequisites

- An Azure account with an active subscription
- A GitHub repository with your Next.js project
- Azure CLI installed locally
- Docker installed locally (for testing)

## Step 1: Configure Next.js for Standalone Output

Next.js supports a `standalone` output mode that bundles your application into a self-contained folder — perfect for Docker containers.

Update your `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

This tells Next.js to produce a minimal `standalone` directory during the build, including only the files needed for production. The result is a much smaller Docker image.

## Step 2: Write the Dockerfile

Create a multi-stage Dockerfile at the root of your project (or in your app directory if using a monorepo):

```dockerfile
# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Production ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Key points about this Dockerfile:

- **Multi-stage build** keeps the final image small by discarding build-time dependencies
- **Non-root user** (`nextjs`) follows security best practices
- **Standalone output** means we only copy the minimal files needed to run

### Monorepo considerations

If your Next.js app lives in a monorepo (e.g., under `apps/web/`), adjust the paths accordingly. For pnpm workspaces, copy the `pnpm-lock.yaml` and `pnpm-workspace.yaml` at the root level and use `pnpm install --frozen-lockfile` instead.

## Step 3: Create an Azure Container Registry

Azure Container Registry (ACR) is where you'll store your Docker images.

```bash
# Create a resource group
az group create --name my-blog --location westus2

# Create the container registry
az acr create \
  --resource-group my-blog \
  --name myappacr \
  --sku Basic
```

## Step 4: Create an Azure App Service

```bash
# Create an App Service plan (Linux, B1 tier)
az appservice plan create \
  --name my-app-plan \
  --resource-group my-blog \
  --is-linux \
  --sku B1

# Create the web app configured for containers
az webapp create \
  --resource-group my-blog \
  --plan my-app-plan \
  --name my-nextjs-app \
  --container-image-name myappacr.azurecr.io/web:latest

# Enable managed identity and grant ACR pull access
az webapp identity assign \
  --resource-group my-blog \
  --name my-nextjs-app

az webapp config set \
  --resource-group my-blog \
  --name my-nextjs-app \
  --generic-configurations '{"acrUseManagedIdentityCreds": true}'
```

Don't forget to grant the App Service's managed identity the **AcrPull** role on your container registry:

```bash
PRINCIPAL_ID=$(az webapp identity show \
  --resource-group my-blog \
  --name my-nextjs-app \
  --query principalId -o tsv)

ACR_ID=$(az acr show --name myappacr --query id -o tsv)

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role AcrPull \
  --scope $ACR_ID
```

## Step 5: Set Up GitHub Actions CI/CD

Create a workflow file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy Next.js

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  REGISTRY: myappacr.azurecr.io
  IMAGE_NAME: web

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Log in to ACR
        run: az acr login --name myappacr

      - name: Build and push image
        run: |
          docker build \
            -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest \
            .
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }} --all-tags

      - name: Deploy to App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: my-nextjs-app
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### Setting up OIDC authentication

Using OIDC (OpenID Connect) is more secure than storing credentials as secrets. You'll need to create a service principal and configure federated credentials for your GitHub repository. See the Azure documentation on GitHub Actions OIDC for the full setup steps.

## Step 6: Configure Environment Variables

Set any runtime environment variables on the App Service:

```bash
az webapp config appsettings set \
  --resource-group my-blog \
  --name my-nextjs-app \
  --settings \
    NODE_ENV=production \
    WEBSITES_PORT=3000
```

For variables needed at **build time** (like `NEXT_PUBLIC_*` variables), pass them as Docker build args in your workflow:

```yaml
docker build \
  --build-arg NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }} \
  -t myimage .
```

And declare them in your Dockerfile:

```dockerfile
ARG NEXT_PUBLIC_API_URL
```

## Troubleshooting Tips

- **Container won't start?** Check that `WEBSITES_PORT` matches your `EXPOSE` port (usually 3000).
- **Image pull failures?** Verify the managed identity has the `AcrPull` role and that `acrUseManagedIdentityCreds` is enabled.
- **Stale startup command?** If you previously used a zip-based deployment, clear any leftover startup command: `az webapp config set --startup-file ""`.
- **Build-time vs runtime env vars:** Remember that `NEXT_PUBLIC_*` variables are inlined at build time. Changes require a new Docker build — they can't be updated via App Service settings alone.

## Summary

With Docker and Azure App Service, you get a reproducible, portable deployment that avoids common pitfalls like dependency resolution issues. The full pipeline — push to GitHub, build a Docker image, push to ACR, deploy to App Service — runs automatically on every merge to main.
