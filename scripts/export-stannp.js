/**
 * Stannp-format CSV export — pulls top-scored BTL landlord leads from the
 * database, applies suppression and address selection logic, and outputs a
 * file ready for Stannp's bulk recipient import.
 *
 * Usage:
 *   node scripts/export-stannp.js [batchSize]
 *
 * Output:
 *   data/exports/stannp-btl-YYYY-MM-DD.csv
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const { suppressionFilter } = require('./lib/export-filters');

/**
 * Extract a UK postcode from the end of an address string.
 * @param {string} address
 * @returns {string|null}
 */
function extractPostcode(address) {
  if (!address) return null;
  const match = address.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/i);
  return match ? match[1].toUpperCase().replace(/\s+/, ' ') : null;
}

/**
 * Parse a full address string into line1, line2, city, postcode components.
 * @param {string} fullAddress
 * @returns {{ line1: string, line2: string, city: string, postcode: string }}
 */
function parseAddress(fullAddress) {
  if (!fullAddress) return { line1: '', line2: '', city: '', postcode: '' };

  const postcode = extractPostcode(fullAddress) || '';
  // Remove postcode from address for further parsing
  let remaining = fullAddress;
  if (postcode) {
    remaining = remaining.replace(/,?\s*[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\s*$/i, '').trim();
  }

  const parts = remaining.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    return { line1: '', line2: '', city: '', postcode };
  }
  if (parts.length === 1) {
    return { line1: parts[0], line2: '', city: '', postcode };
  }
  if (parts.length === 2) {
    return { line1: parts[0], line2: '', city: parts[1], postcode };
  }

  // 3+ parts: first = line1, last = city, middle joined = line2
  const line1 = parts[0];
  const city = parts[parts.length - 1];
  const line2 = parts.slice(1, -1).join(', ');
  return { line1, line2, city, postcode };
}

/**
 * Select the best mailing address for a lead using the waterfall:
 * owner_address > mailing_address > property address
 * @param {object} lead - Database row with address fields
 * @returns {{ line1: string, line2: string, city: string, postcode: string, source: string }}
 */
function selectMailingAddress(lead) {
  if (lead.owner_address) {
    return { ...parseAddress(lead.owner_address), source: 'owner' };
  }
  if (lead.mailing_address) {
    return { ...parseAddress(lead.mailing_address), source: 'mailing' };
  }
  if (lead.first_property_address) {
    const propAddr = lead.first_postcode
      ? `${lead.first_property_address}, ${lead.first_postcode}`
      : lead.first_property_address;
    return { ...parseAddress(propAddr), source: 'property' };
  }
  return { line1: '', line2: '', city: '', postcode: '', source: 'none' };
}

/**
 * Format name fields based on entity type and available data.
 * @param {object} lead - Database row
 * @returns {{ firstname: string, lastname: string, company: string }}
 */
function formatName(lead) {
  if ((lead.entity_type === 'ltd' || lead.entity_type === 'llp') && lead.director_names) {
    // Take the first director name (comma-separated list)
    const firstDirector = lead.director_names.split(',')[0].trim();
    const parts = firstDirector.split(/\s+/);
    const firstname = parts[0] || '';
    const lastname = parts.slice(1).join(' ') || '';
    return { firstname, lastname, company: lead.name || '' };
  }

  if (lead.entity_type === 'ltd' || lead.entity_type === 'llp') {
    // No director names available
    return { firstname: '', lastname: '', company: lead.name || '' };
  }

  // Individual or unknown
  const parts = (lead.name || '').split(/\s+/);
  const firstname = parts[0] || '';
  const lastname = parts.slice(1).join(' ') || '';
  return { firstname, lastname, company: '' };
}

/**
 * Export Stannp-format CSV from the database.
 * @param {import('better-sqlite3').Database} db
 * @param {string} exportsDir - Output directory
 * @param {number} [batchSize=30] - Max rows to export
 * @returns {{ rowCount: number, filePath: string, addressSources: object }}
 */
function exportStannp(db, exportsDir, batchSize = 30) {
  fs.mkdirSync(exportsDir, { recursive: true });

  const rows = db.prepare(`
    SELECT l.id, l.name, l.entity_type, l.owner_address, l.mailing_address,
      l.director_names, l.tired_score, l.btl_suitable,
      GROUP_CONCAT(DISTINCT p.address) as property_addresses,
      MIN(p.current_energy_rating) as worst_epc,
      COUNT(DISTINCT p.id) as property_count,
      MIN(p.address) as first_property_address,
      MIN(p.postcode) as first_postcode
    FROM landlords l
    LEFT JOIN properties p ON p.landlord_id = l.id
    WHERE (l.match_group_id IS NULL OR l.is_primary_record = 1)
      AND ${suppressionFilter()}
      AND l.btl_suitable = 1
      AND (l.owner_address IS NOT NULL OR l.mailing_address IS NOT NULL
           OR EXISTS (SELECT 1 FROM properties p2 WHERE p2.landlord_id = l.id))
    GROUP BY l.id
    ORDER BY l.tired_score DESC
    LIMIT ?
  `).all(batchSize);

  const addressSources = { owner: 0, mailing: 0, property: 0, none: 0 };

  const csvData = rows.map(row => {
    const nameResult = formatName(row);
    const addr = selectMailingAddress(row);
    addressSources[addr.source]++;

    return {
      title: '',
      firstname: nameResult.firstname,
      lastname: nameResult.lastname,
      company: nameResult.company,
      address1: addr.line1,
      address2: addr.line2,
      city: addr.city,
      postcode: addr.postcode,
      country: 'GB',
      epc_rating: row.worst_epc || '',
      property_count: row.property_count || 0,
      property_address: row.first_property_address || '',
    };
  });

  const csv = stringify(csvData, { header: true });

  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `stannp-btl-${dateStamp}.csv`;
  const filePath = path.join(exportsDir, fileName);
  fs.writeFileSync(filePath, csv);

  console.log(`Stannp export complete:`);
  console.log(`  Leads: ${rows.length}`);
  console.log(`  File: ${filePath}`);
  console.log(`  Address sources: owner=${addressSources.owner}, mailing=${addressSources.mailing}, property=${addressSources.property}`);

  return { rowCount: rows.length, filePath, addressSources };
}

module.exports = { exportStannp, extractPostcode, parseAddress, selectMailingAddress, formatName };

// CLI entry point
if (require.main === module) {
  const db = require('./lib/db');
  const { EXPORTS_DIR } = require('./lib/config');
  const batchSize = parseInt(process.argv[2]) || 30;
  exportStannp(db, EXPORTS_DIR, batchSize);
}
