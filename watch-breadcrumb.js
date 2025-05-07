/**
 * Simple file watcher for Breadcrumb.tsx
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const breadcrumbPath = path.resolve(__dirname, 'client/src/components/Breadcrumb.tsx');

console.log(`Watching for changes in: ${breadcrumbPath}`);

// Track file modification time
let lastMtime = null;

// Watch the file
fs.watchFile(breadcrumbPath, { interval: 1000 }, (curr, prev) => {
  // Only log if mtime has changed
  if (lastMtime !== curr.mtime.getTime()) {
    console.log('\n🔍 BREADCRUMB WATCHER: File changed at', new Date().toISOString());
    console.log(`Previous modified time: ${prev.mtime}`);
    console.log(`Current modified time: ${curr.mtime}`);

    try {
      const content = fs.readFileSync(breadcrumbPath, 'utf8');
      console.log(`📄 File size: ${content.length} bytes`);
      console.log('📝 First 150 characters:', content.substring(0, 150).replace(/\n/g, '\\n'));
    } catch (err) {
      console.error('Error reading file:', err);
    }

    // Update last modification time
    lastMtime = curr.mtime.getTime();
  }
});

console.log('File watcher started. Press Ctrl+C to exit.');