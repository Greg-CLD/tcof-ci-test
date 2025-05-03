import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure the paths
const excelPath = path.join(__dirname, '../attached_assets/tcof_factors.xlsx');
const outputPath = path.join(__dirname, '../data/tcofFactors.json');

// Create the data directory if it doesn't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Read the Excel file
try {
  console.log(`Reading Excel file from: ${excelPath}`);
  const workbook = xlsx.readFile(excelPath);
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON (array of objects)
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Filter out empty rows
  const filteredData = data.filter(row => row.length > 0 && row[0]);
  
  // Process the data to the required format
  // Assuming Column A (index 0) has ID + title, Columns B-E have tasks for each stage
  const factors = [];
  
  // Skip the header row if it exists
  const startRow = (filteredData[0][0] && typeof filteredData[0][0] === 'string' && 
                  filteredData[0][0].toLowerCase().includes('factor')) ? 1 : 0;
  
  for (let i = startRow; i < filteredData.length; i++) {
    const row = filteredData[i];
    if (!row[0]) continue; // Skip rows without an ID/title
    
    // Parse ID and title (assuming format like "1.1 Ask Why")
    const idTitleMatch = row[0].match(/^(\d+\.\d+|\d+)\s+(.+)$/);
    const id = idTitleMatch ? idTitleMatch[1] : `F${i+1-startRow}`;
    const title = idTitleMatch ? idTitleMatch[2] : row[0];
    
    // Extract tasks for each stage
    const tasks = {
      "Identification": row[1] ? (Array.isArray(row[1]) ? row[1] : String(row[1]).split('\n').map(t => t.trim()).filter(t => t)) : [],
      "Definition": row[2] ? (Array.isArray(row[2]) ? row[2] : String(row[2]).split('\n').map(t => t.trim()).filter(t => t)) : [],
      "Delivery": row[3] ? (Array.isArray(row[3]) ? row[3] : String(row[3]).split('\n').map(t => t.trim()).filter(t => t)) : [],
      "Closure": row[4] ? (Array.isArray(row[4]) ? row[4] : String(row[4]).split('\n').map(t => t.trim()).filter(t => t)) : []
    };
    
    factors.push({
      id,
      title,
      tasks
    });
  }
  
  // Write the result to a JSON file
  fs.writeFileSync(outputPath, JSON.stringify(factors, null, 2));
  console.log(`Successfully wrote ${factors.length} TCOF success factors to ${outputPath}`);
} catch (error) {
  console.error('Error converting Excel to JSON:', error);
  process.exit(1);
}