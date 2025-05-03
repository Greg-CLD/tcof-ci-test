import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Path to the Excel file
const excelPath = path.join(projectRoot, 'attached_assets', 'tcof_factors.xlsx.xlsx');
const outputPath = path.join(projectRoot, 'data', 'successFactors.json');

console.log(`Looking for Excel file at: ${excelPath}`);
console.log(`Will write JSON to: ${outputPath}`);

// Check if file exists
if (!fs.existsSync(excelPath)) {
  console.error(`❌ Excel file not found at ${excelPath}`);
  process.exit(1);
}

// Read and parse the Excel file
try {
  const wb = xlsx.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  
  // Extract header and data rows
  const [header, ...data] = rows;
  const [TITLE, IDN, DEF, DEL, CLO] = header;
  
  // Transform data to JSON structure
  const json = data.map(row => {
    const [title, idn, def, del, clo] = row;
    
    // Split the title to separate ID and title text
    const parts = title.split(' ');
    const id = parts[0];
    const titleText = parts.slice(1).join(' ').trim();
    
    return {
      id,
      title: titleText,
      tasks: {
        Identification: (idn || '').split('\n').filter(Boolean),
        Definition: (def || '').split('\n').filter(Boolean),
        Delivery: (del || '').split('\n').filter(Boolean),
        Closure: (clo || '').split('\n').filter(Boolean)
      }
    };
  });
  
  // Create data directory if it doesn't exist
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Write the JSON file
  fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
  console.log(`✅ ${outputPath} generated with ${json.length} entries`);
} catch (error) {
  console.error('❌ Error processing Excel file:', error);
  process.exit(1);
}