
#!/bin/bash
# Print environment information for debugging
echo "Node version: $(node -v)"
echo "Running static page generator..."

# Set permissions just in case
chmod +x "${BASH_SOURCE%/*}/prebuild.sh"

# Make sure VITE_ environment variables are available
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "Warning: VITE_SUPABASE_URL not set, using default"
fi
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "Warning: VITE_SUPABASE_ANON_KEY not set, using default"
fi

# Run the static campaign page generator with Node's ES modules flag
echo "Executing static page generator with ES modules..."
node --experimental-vm-modules src/utils/runStaticGenerator.js

# Check if generator ran successfully
if [ $? -eq 0 ]; then
  echo "Static campaign pages generated successfully!"
else
  echo "Error: Static campaign page generator failed"
  exit 1
fi
