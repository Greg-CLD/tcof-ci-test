#!/bin/bash

# Find all files that might render SiteFooter
FOOTER_FILES=$(grep -l "<SiteFooter" client/src/pages/*.tsx)

for file in $FOOTER_FILES; do
  echo "Processing $file..."
  
  # Remove import statement
  sed -i '/import SiteFooter from/d' "$file"
  
  # Remove SiteFooter component
  sed -i 's/<SiteFooter\s*\/>//' "$file"
  
  # Fix any double newlines
  sed -i '/^\s*$/N;/^\s*\n\s*$/D' "$file"
done

echo "Done removing redundant footers"
