/**
 * Script to update references to success factors to include descriptions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globby } from 'globby';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Regex pattern to find incorrect success factor object creation (missing description field)
const MISSING_DESCRIPTION_PATTERN = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*title:\s*['"]([^'"]+)['"]\s*,\s*tasks:/g;
const MISSING_DESCRIPTION_WITH_NEWLINES_PATTERN = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*title:\s*['"]([^'"]+)['"]\s*,\s*[\r\n\s]*tasks:/g;

async function updateFactorTypesInServer() {
  try {
    console.log('Scanning server files for missing success factor descriptions...');
    
    // Find all JavaScript and TypeScript files in the server directory
    const files = await globby(['server/**/*.js', 'server/**/*.ts'], { cwd: __dirname });
    
    let totalUpdates = 0;
    
    for (const filePath of files) {
      const fullPath = path.join(__dirname, filePath);
      
      // Read the file
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Check if there are missing descriptions
      let hasMissingDescriptions = MISSING_DESCRIPTION_PATTERN.test(content);
      MISSING_DESCRIPTION_PATTERN.lastIndex = 0; // Reset regex
      
      let hasMissingDescriptionsWithNewlines = MISSING_DESCRIPTION_WITH_NEWLINES_PATTERN.test(content);
      MISSING_DESCRIPTION_WITH_NEWLINES_PATTERN.lastIndex = 0; // Reset regex
      
      if (hasMissingDescriptions || hasMissingDescriptionsWithNewlines) {
        console.log(`Found missing descriptions in ${filePath}`);
        
        // Replace pattern with the right pattern that includes description
        let updatedContent = content;
        
        // Replace the standard pattern
        updatedContent = updatedContent.replace(
          MISSING_DESCRIPTION_PATTERN, 
          '{ id: "$1", title: "$2", description: "", tasks:'
        );
        
        // Replace the pattern with newlines
        updatedContent = updatedContent.replace(
          MISSING_DESCRIPTION_WITH_NEWLINES_PATTERN, 
          '{ id: "$1", title: "$2", description: "", \ntasks:'
        );
        
        if (content !== updatedContent) {
          // Write the updated content back to the file
          fs.writeFileSync(fullPath, updatedContent);
          
          totalUpdates++;
          console.log(`Updated ${filePath}`);
        }
      }
    }
    
    console.log(`Completed with ${totalUpdates} files updated.`);
  } catch (error) {
    console.error('Error updating factor types:', error);
  }
}

// Run the update
updateFactorTypesInServer().catch(console.error);