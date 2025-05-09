const fs = require('fs');
const path = require('path');

// Path to the routes.ts file
const routesFilePath = path.join(__dirname, 'server', 'routes.ts');

// Read the file
let content = fs.readFileSync(routesFilePath, 'utf8');

// Replace Replit Auth claim references with direct ID access
content = content.replace(/\/\/ Get user ID from Replit Auth claims \(sub\) or fallback to legacy id property/g, 
                          '// Get user ID directly from the user object (local auth)');

content = content.replace(/\(req\.user as any\)\.claims\?\.sub \|\| \(req\.user as any\)\.id/g, 
                          '(req.user as any).id');

// Write the modified content back to the file
fs.writeFileSync(routesFilePath, content);

console.log('Replaced all Replit Auth claim references in routes.ts');
