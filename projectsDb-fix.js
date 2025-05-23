/**
 * Server-Side Fix for projectsDb.ts Syntax Issues
 * 
 * This script provides a direct fix for the projectsDb.ts file syntax error at line 1281.
 * 
 * The issue is a missing `catch` or `finally` block in a try statement.
 * Run this script before attempting to start the server.
 */

const fs = require('fs');
const path = require('path');

// Path to the problematic file
const filePath = path.join(__dirname, 'server', 'projectsDb.ts');

function fixProjectsDbFile() {
  try {
    console.log(`Attempting to fix syntax error in ${filePath}...`);
    
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Extract the specific section with syntax error
    const errorSectionStart = Math.max(0, 1270 - 10);
    const errorSectionEnd = Math.min(lines.length, 1290 + 10);
    const errorSection = lines.slice(errorSectionStart, errorSectionEnd).join('\n');
    
    console.log(`Problematic code section (lines ${errorSectionStart}-${errorSectionEnd}):`);
    console.log(errorSection);
    
    // Check if the specific pattern at line 1281 exists
    const errorLineIndex = 1281 - 1; // 0-based index
    const errorLine = lines[errorLineIndex];
    
    if (errorLine && errorLine.includes('console.log') && !errorLine.trim().startsWith('try {')) {
      console.log(`\nFound issue at line 1281: ${errorLine}`);
      
      // Fix: wrap the section in a try-catch block
      // Find the start of the try block (likely around line 1283)
      const tryStartIndex = lines.findIndex((line, idx) => idx > errorLineIndex && line.trim() === 'try {');
      
      if (tryStartIndex !== -1) {
        // Move the console.log line inside the try block 
        const consoleLogLine = lines[errorLineIndex];
        lines.splice(errorLineIndex, 1); // Remove the original console.log
        
        // Insert the console.log inside the try block
        lines.splice(tryStartIndex + 1, 0, consoleLogLine);
        
        console.log(`\nFixed by moving line 1281 into the try block at line ${tryStartIndex + 1}`);
      } else {
        // If we can't find the exact try block, wrap the console.log in its own try-catch
        const newLine = `try {\n${errorLine}\n} catch (error) {\n  console.error("Error logging task update:", error);\n}`;
        lines[errorLineIndex] = newLine;
        
        console.log(`\nFixed by wrapping line 1281 in its own try-catch block`);
      }
      
      // Write the fixed content back to the file
      const fixedContent = lines.join('\n');
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      
      console.log(`\nFile has been fixed successfully!`);
      return true;
    } else {
      console.log(`\nCouldn't find the expected pattern at line 1281. Manual inspection needed.`);
      return false;
    }
  } catch (error) {
    console.error(`Error fixing the file: ${error.message}`);
    return false;
  }
}

// Execute the fix
fixProjectsDbFile();