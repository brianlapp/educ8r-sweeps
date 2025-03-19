
#!/bin/bash
# Performance optimized prebuild script with improved static page generation

# Print environment information for debugging
echo "Node version: $(node -v)"
echo "Running optimized static page generator..."

# Set permissions just in case
chmod +x "${BASH_SOURCE%/*}/prebuild.sh"

# Make sure VITE_ environment variables are available
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "Warning: VITE_SUPABASE_URL not set, using default"
fi
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "Warning: VITE_SUPABASE_ANON_KEY not set, using default"
fi

# Set NODE_ENV for proper production mode detection
export NODE_ENV="production"
echo "NODE_ENV set to: $NODE_ENV"

# Add build timestamp for cache busting
export VITE_BUILD_TIMESTAMP=$(date +%s)
echo "Build timestamp: $VITE_BUILD_TIMESTAMP"

# Create an initial dummy dist directory and manifest to support the generator
mkdir -p dist
echo "{}" > dist/asset-manifest.json
echo "Created initial asset manifest"

# Run a partial build first to generate the real asset manifest
echo "Running partial build to generate asset manifest..."
npx vite build --mode production --base / --outDir dist

# Check if the build succeeded and if manifest was generated properly
if [ $? -ne 0 ]; then
  echo "Error: Vite build failed, aborting static page generation"
  exit 1
fi

# Verify the manifest exists and has content
if [ ! -s dist/asset-manifest.json ]; then
  echo "Warning: Asset manifest is empty or doesn't exist, creating default"
  echo "{}" > dist/asset-manifest.json
fi

# Now run the static campaign page generator with the manifest
echo "Executing optimized static page generator..."
node src/utils/runStaticGenerator.js

# Check if generator ran successfully
if [ $? -eq 0 ]; then
  echo "Static campaign pages generated successfully!"
else
  echo "Error: Static campaign page generator failed"
  exit 1
fi

# Apply post-build optimizations
echo "Applying post-build performance optimizations..."

# Add build timestamp to index files for cache busting
find dist -name "*.html" -exec sed -i "s/<\/head>/<meta name=\"build-timestamp\" content=\"$VITE_BUILD_TIMESTAMP\"><\/head>/g" {} \;

# The full build will be run by Netlify after this script completes
echo "Prebuild completed, proceeding to main build..."
