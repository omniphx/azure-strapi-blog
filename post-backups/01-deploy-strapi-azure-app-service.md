**Title:** How to Deploy Strapi on Azure App Service
**Slug:** deploy-strapi-azure-app-service
**Excerpt:** A step-by-step guide to deploying Strapi v5 on Azure App Service using the Oryx build system, PostgreSQL, and GitHub Actions with OIDC authentication.

---

Azure App Service is a fully managed platform for hosting web applications, and it works great with Strapi v5. In this guide, we walk through deploying Strapi on Azure using the Oryx build system, a PostgreSQL database, and a keyless CI/CD pipeline with GitHub Actions.

## Prerequisites

- An Azure subscription
- Azure CLI installed locally
- A GitHub repository for your project
- Node.js 22 and pnpm installed

## Step 1: Create an Azure App Service

Start by creating a new App Service using the Azure CLI. Choose the Linux platform with the `NODE|22-lts` runtime stack — this matches Strapi's supported Node.js version.

```bash
az webapp create \
  --resource-group my-resource-group \
  --plan my-app-service-plan \
  --name my-strapi-app \
  --runtime "NODE:22-lts"
```

Enable Oryx to build your application during deployment. This tells Azure to run `npm install` and `strapi build` automatically after your code is uploaded.

```bash
az webapp config appsettings set \
  --name my-strapi-app \
  --resource-group my-resource-group \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

## Step 2: Provision a PostgreSQL Database

Strapi uses SQLite by default, which works for local development but is not suitable for production (the filesystem on Azure App Service is ephemeral). Provision an Azure Database for PostgreSQL — Flexible Server instead.

```bash
az postgres flexible-server create \
  --name my-strapi-db \
  --resource-group my-resource-group \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --admin-user strapi \
  --admin-password "<YourSecurePassword>" \
  --database-name strapi
```

Then add the database connection details to your App Service configuration. Strapi picks these up via environment variables at runtime.

```bash
az webapp config appsettings set \
  --name my-strapi-app \
  --resource-group my-resource-group \
  --settings \
    DATABASE_CLIENT=postgres \
    DATABASE_HOST=my-strapi-db.postgres.database.azure.com \
    DATABASE_PORT=5432 \
    DATABASE_NAME=strapi \
    DATABASE_USERNAME=strapi \
    DATABASE_PASSWORD="<YourSecurePassword>" \
    DATABASE_SSL=true
```

## Step 3: Configure Strapi for Azure

Your `config/database.ts` should handle both SQLite (local) and PostgreSQL (Azure) based on the `DATABASE_CLIENT` environment variable:

```typescript
export default ({ env }) => {
  const client = env("DATABASE_CLIENT", "sqlite");
  if (client === "postgres") {
    return {
      connection: {
        client: "postgres",
        connection: {
          host: env("DATABASE_HOST"),
          port: env.int("DATABASE_PORT", 5432),
          database: env("DATABASE_NAME"),
          user: env("DATABASE_USERNAME"),
          password: env("DATABASE_PASSWORD"),
          ssl: { rejectUnauthorized: false },
        },
      },
    };
  }
  return {
    connection: {
      client: "sqlite",
      connection: { filename: env("DATABASE_FILENAME", ".tmp/data.db") },
      useNullAsDefault: true,
    },
  };
};
```

## Step 4: Set Up GitHub Actions with OIDC

Rather than storing Azure credentials as GitHub secrets, use OpenID Connect (OIDC) federated identity. This is more secure — no long-lived secrets, and tokens are scoped to individual workflow runs.

Create an Azure AD app registration and service principal, then grant it Contributor access to your resource group:

```bash
# Create app registration
az ad app create --display-name "github-actions-strapi"

# Create service principal
az ad sp create --id <appId>

# Assign Contributor role
az role assignment create \
  --assignee <appId> \
  --role Contributor \
  --scope /subscriptions/<subscriptionId>/resourceGroups/my-resource-group
```

Add `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` as GitHub repository secrets. Then create a workflow:

```yaml
name: Deploy CMS
on:
  push:
    branches: [main]
    paths: ["apps/cms/**"]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Build deployment zip
        run: |
          cd apps/cms
          zip -r ${{ runner.temp }}/cms.zip . \
            --exclude "node_modules/*" --exclude ".env"
      - uses: azure/webapps-deploy@v3
        with:
          app-name: my-strapi-app
          package: ${{ runner.temp }}/cms.zip
```

## Step 5: Configure the Startup Command

Azure App Service needs to know how to start Strapi after the Oryx build. Set the startup command to `npm start`, which maps to `strapi start` in your `package.json`:

```bash
az webapp config set \
  --name my-strapi-app \
  --resource-group my-resource-group \
  --startup-file "npm start"
```

## How Oryx Builds Your App

When you deploy a zip file with `SCM_DO_BUILD_DURING_DEPLOYMENT=true` set, Azure's Oryx build system automatically detects your Node.js application and:

1. Runs `npm install` to restore dependencies
2. Runs `npm run build` (which calls `strapi build`) to compile the admin panel and TypeScript
3. Creates a `node_modules.tar.gz` archive to speed up future container restarts
4. Sets up the container to run `npm start` on incoming requests

This means you never need to commit `node_modules` or `dist` to your repository — Oryx handles everything on the Azure side.

## Wrapping Up

With this setup you get a production-ready Strapi deployment on Azure with zero stored credentials, automatic builds on every push, and a PostgreSQL backend that persists across container restarts. The full source code for this blog — including the Next.js frontend and both GitHub Actions workflows — is available on GitHub.
