/**
 * Extract proprietor (landlord/company) correspondence addresses from CCOD data
 * and update the landlords table with a separate owner_address column.
 *
 * The CCOD "Proprietor (1) Address" fields contain the landlord's home/office address
 * registered with Land Registry — distinct from the rental property address.
 */
require('dotenv').config();
const fs = require('fs');
const { parse } = require('csv-parse');
const db = require('./lib/db');

// Add owner_address column if not exists
try {
  db.exec('ALTER TABLE landlords ADD COLUMN owner_address TEXT');
  console.log('Added owner_address column');
} catch (e) {
  if (!e.message.includes('duplicate column')) throw e;
  console.log('owner_address column already exists');
}

// Build a set of landlord names we need to match (for fast lookup)
const landlords = db.prepare(`
  SELECT id, name, mailing_address
  FROM landlords
  WHERE tired_score >= 50
    AND owner_address IS NULL
    AND (match_group_id IS NULL OR is_primary_record = 1)
`).all();

const landlordMap = new Map();
for (const l of landlords) {
  landlordMap.set(l.name, l);
}

console.log(`Landlords to match: ${landlordMap.size}`);

const csvPath = 'data/CCOD_FULL_2026_03.csv';
console.log(`Streaming CCOD from: ${csvPath}`);

const updateStmt = db.prepare('UPDATE landlords SET owner_address = ? WHERE id = ?');
let rowCount = 0;
let matched = 0;
let different = 0;
const matchedAddresses = new Map(); // name -> longest address

const parser = fs.createReadStream(csvPath).pipe(parse({
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
}));

parser.on('data', (row) => {
  rowCount++;
  if (rowCount % 500000 === 0) process.stdout.write(`  ${rowCount} rows scanned...\r`);

  const name = (row['Proprietor Name (1)'] || '').trim();
  if (!name || !landlordMap.has(name)) return;

  const addr1 = (row['Proprietor (1) Address (1)'] || '').trim();
  const addr2 = (row['Proprietor (1) Address (2)'] || '').trim();
  const addr3 = (row['Proprietor (1) Address (3)'] || '').trim();
  if (!addr1) return;

  const fullAddr = [addr1, addr2, addr3].filter(Boolean).join(', ');

  // Keep the longest (most complete) address per landlord
  const existing = matchedAddresses.get(name);
  if (!existing || fullAddr.length > existing.length) {
    matchedAddresses.set(name, fullAddr);
  }
});

parser.on('end', () => {
  console.log(`\nScanned ${rowCount} CCOD rows`);
  console.log(`Found addresses for ${matchedAddresses.size} landlords`);

  // Write to DB
  const tx = db.transaction(() => {
    for (const [name, addr] of matchedAddresses) {
      const landlord = landlordMap.get(name);
      if (!landlord) continue;

      updateStmt.run(addr, landlord.id);
      matched++;

      // Check if different from property/mailing address
      if (landlord.mailing_address) {
        const mailingStart = landlord.mailing_address.substring(0, 15).toLowerCase();
        if (!addr.toLowerCase().includes(mailingStart)) {
          different++;
        }
      }
    }
  });
  tx();

  console.log(`\nResults:`);
  console.log(`  Matched: ${matched} landlords with proprietor addresses`);
  console.log(`  Different from property address: ${different}`);
  console.log(`  Unmatched: ${landlords.length - matched}`);

  // Show samples
  const samples = db.prepare(`
    SELECT name, mailing_address, owner_address
    FROM landlords
    WHERE tired_score >= 50 AND owner_address IS NOT NULL
    ORDER BY tired_score DESC
    LIMIT 5
  `).all();

  console.log('\nSamples:');
  samples.forEach(s => {
    console.log(`  ${s.name}`);
    console.log(`    Property addr: ${s.mailing_address || 'none'}`);
    console.log(`    Owner addr:    ${s.owner_address}`);
    console.log('');
  });
});

parser.on('error', (err) => {
  console.error('CSV parse error:', err.message);
  process.exit(1);
});
