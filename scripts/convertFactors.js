import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

/**
 * Converts success factors data from Excel to JSON
 * @param {string} excelPath - Path to the Excel file
 * @param {string} outputPath - Path to save the JSON output
 * @returns {Promise<Array>} - Parsed factor data
 */
async function convertExcelToJson(excelPath, outputPath) {
  try {
    console.log(`Reading Excel file from: ${excelPath}`);
    
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file not found at ${excelPath}`);
    }
    
    // Read the Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    
    // First row contains headers
    const headers = data[0];
    
    // Find index of important columns (adjust as needed)
    const idIndex = headers.findIndex(h => h.includes('Factor ID') || h.includes('ID'));
    const titleIndex = headers.findIndex(h => h.includes('Title') || h.includes('Factor'));
    const identificationIndex = headers.findIndex(h => h.includes('Identification'));
    const definitionIndex = headers.findIndex(h => h.includes('Definition'));
    const deliveryIndex = headers.findIndex(h => h.includes('Delivery'));
    const closureIndex = headers.findIndex(h => h.includes('Closure'));
    
    if (idIndex === -1 || titleIndex === -1) {
      throw new Error('Required columns (ID and Title) not found in Excel sheet');
    }
    
    // Parse data rows (starting from row 2)
    const factors = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[idIndex] && !row[titleIndex]) continue;
      
      // Extract tasks from each stage, splitting by newlines
      const extractTasks = (cellValue) => {
        if (!cellValue) return [];
        return cellValue.toString()
          .split(/\n|\r\n|\r/)
          .map(task => task.trim())
          .filter(task => task.length > 0);
      };
      
      const factor = {
        id: row[idIndex].toString(),
        title: row[titleIndex],
        tasks: {
          Identification: identificationIndex > -1 ? extractTasks(row[identificationIndex]) : [],
          Definition: definitionIndex > -1 ? extractTasks(row[definitionIndex]) : [],
          Delivery: deliveryIndex > -1 ? extractTasks(row[deliveryIndex]) : [],
          Closure: closureIndex > -1 ? extractTasks(row[closureIndex]) : []
        }
      };
      
      factors.push(factor);
    }
    
    // Save to JSON file if outputPath is provided
    if (outputPath) {
      const jsonData = JSON.stringify(factors, null, 2);
      fs.writeFileSync(outputPath, jsonData);
      console.log(`Saved ${factors.length} factors to ${outputPath}`);
    }
    
    return factors;
  } catch (error) {
    console.error('Error converting Excel to JSON:', error);
    throw error;
  }
}

// Run conversion if script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  const excelPath = args[0] || 'attached_assets/tcof_factors.xlsx';
  const jsonPath = args[1] || 'data/tcof_factors.json';
  
  convertExcelToJson(excelPath, jsonPath)
    .then(factors => {
      console.log(`Successfully converted ${factors.length} factors`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Conversion failed:', error);
      process.exit(1);
    });
}

export default convertExcelToJson;