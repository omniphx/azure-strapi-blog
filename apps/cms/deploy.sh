#!/bin/bash
# Azure App Service deployment script for Strapi v5
# This script runs after Azure copies your files.

set -e

echo "--- Installing dependencies ---"
npm install --production=false

echo "--- Building Strapi admin panel ---"
NODE_ENV=production npm run build

echo "--- Deployment complete ---"
