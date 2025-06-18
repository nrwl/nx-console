#!/bin/bash
set -e

echo "🔄 Running update content command..."

# Enable yarn
corepack enable

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies with Yarn..."
yarn install --immutable

echo "✅ Update content command completed!" 