#!/bin/bash

# Create a backup of the routes.ts file
cp server/routes.ts server/routes.ts.bak

# Replace all instances of Replit Auth claims with direct ID references
sed -i 's|// Get user ID from Replit Auth claims (sub) or fallback to legacy id property|// Get user ID directly from the user object (local auth)|g' server/routes.ts
sed -i 's|(req.user as any).claims?.sub || (req.user as any).id|(req.user as any).id|g' server/routes.ts

echo "Replaced Replit Auth references in routes.ts"

# Now restart the workflow
echo "Done replacing Replit Auth references"
