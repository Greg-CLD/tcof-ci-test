import fs from 'fs';
import xlsx from 'xlsx';
import { Database } from '@replit/database';

const db = new Database();
const wb = xlsx.readFile('/mnt/data/tcof_factors.xlsx.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, {header:1, blankrows:false});
const [, ...data] = rows;          // skip header

const factors = data.map(row => {
  const [title, idn, def, del, clo] = row;
  if(!title) return null;
  const [id, ...rest] = title.trim().split(' ');
  return {
    id,
    title: rest.join(' ').trim(),
    tasks: {
      Identification: (idn || '').split('\n').filter(Boolean),
      Definition: (def || '').split('\n').filter(Boolean),
      Delivery: (del || '').split('\n').filter(Boolean),
      Closure: (clo || '').split('\n').filter(Boolean)
    }
  };
}).filter(Boolean);

await db.set('factors', factors);
console.log('✅ Migrated', factors.length, 'factors to Replit DB');