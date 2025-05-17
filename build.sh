#!/bin/sh
echo "Building static site..."
# Copy files to output directory
mkdir -p .vercel/output/static
cp index.html .vercel/output/static/
cp main.js .vercel/output/static/
cp -r assets .vercel/output/static/
