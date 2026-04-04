/**
 * Stannp-format CSV export — pulls leads from the Notion "SJB Leads Pipeline"
 * database (the curated source of truth) and outputs a file ready for Stannp's
 * bulk recipient import.
 *
 * Usage:
 *   node scripts/export-stannp.js [--owner-only] [--min-score=N] [--exclude-mixed-use]
 *
 * Options:
 *   --owner-only         Only include leads with an Owner Address (default: include all with any address)
 *   --min-score=N        Minimum score threshold (default: 0)
 *   --exclude-mixed-use  Exclude leads with Priority "Mixed Use" (default: excluded)
 *
 * Output:
 *   data/exports/stannp-YYYY-MM-DD.csv
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = '5543ca79-9d90-401b-844d-f490423e354a';
const EXPORTS_DIR = path.join(__dirname, '..', 'data', 'exports');

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
  let remaining = fullAddress;
  if (postcode) {
    const pcEscaped = postcode.replace(/\s+/g, '\\s*');
    remaining = remaining.replace(new RegExp(',?\\s*' + pcEscaped, 'gi'), '').trim();
    remaining = remaining.replace(/,\s*$/, '').trim();
  }

  const parts = remaining.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) return { line1: '', line2: '', city: '', postcode };
  if (parts.length === 1) return { line1: parts[0], line2: '', city: '', postcode };
  if (parts.length === 2) return { line1: parts[0], line2: '', city: parts[1], postcode };

  const line1 = parts[0];
  const city = parts[parts.length - 1];
  const line2 = parts.slice(1, -1).join(', ');
  return { line1, line2, city, postcode };
}

/**
 * Format name fields. Extracts titles (Mr, Mrs, Dr, etc.) into a separate field.
 * Detects company names by suffix and routes them to the company field.
 * @param {string} leadName - The lead name from Notion
 * @param {string} contactName - The contact name from Notion (director/individual)
 * @param {string} company - The company field from Notion
 * @returns {{ title: string, firstname: string, lastname: string, company: string }}
 */
function formatName(leadName, contactName, company) {
  const TITLES = ['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF', 'REV', 'SIR', 'LADY', 'LORD'];

  function extractTitle(nameParts) {
    if (nameParts.length > 1 && TITLES.includes(nameParts[0].toUpperCase())) {
      return { title: nameParts[0], remaining: nameParts.slice(1) };
    }
    return { title: '', remaining: nameParts };
  }

  // If there's a contact name, use it for first/last
  // Contact names may be in "SURNAME, FirstName MiddleName" format or have multiple directors
  if (contactName && contactName.trim()) {
    // Take just the first person if multiple directors listed (split on repeated SURNAME patterns)
    let firstPerson = contactName.trim().split(/,\s*(?=[A-Z]{2,})/)[0].trim();
    // Handle "SURNAME, FirstName" format
    if (firstPerson.includes(',')) {
      const [surname, ...rest] = firstPerson.split(',').map(s => s.trim());
      const firstNames = rest.join(' ').trim();
      const allParts = firstNames ? `${firstNames} ${surname}` : surname;
      const parts = allParts.split(/\s+/);
      const { title, remaining } = extractTitle(parts);
      return {
        title,
        firstname: remaining[0] || '',
        lastname: remaining.slice(1).join(' ') || '',
        company: company || '',
      };
    }
    const parts = firstPerson.split(/\s+/);
    const { title, remaining } = extractTitle(parts);
    return {
      title,
      firstname: remaining[0] || '',
      lastname: remaining.slice(1).join(' ') || '',
      company: company || '',
    };
  }

  // If lead name looks like a company, put it in company field
  const nameUpper = (leadName || '').toUpperCase();
  if (/\b(LTD|LIMITED|LLP|PLC|HOLDINGS|TRUSTEES|TRUST|CIO)\b/.test(nameUpper)) {
    return { title: '', firstname: '', lastname: '', company: leadName || '' };
  }

  // Individual name
  const parts = (leadName || '').split(/\s+/);
  const { title, remaining } = extractTitle(parts);
  return {
    title,
    firstname: remaining[0] || '',
    lastname: remaining.slice(1).join(' ') || '',
    company: company || '',
  };
}

/**
 * Get plain text from a Notion rich_text property.
 */
function getText(prop) {
  if (!prop || !prop.rich_text || !prop.rich_text.length) return '';
  return prop.rich_text.map(t => t.plain_text).join('');
}

/**
 * Get title text from a Notion title property.
 */
function getTitle(prop) {
  if (!prop || !prop.title || !prop.title.length) return '';
  return prop.title.map(t => t.plain_text).join('');
}

/**
 * Fetch all pages from Notion database with pagination.
 * Uses the REST API directly (data source IDs require POST to /databases/{id}/query).
 */
async function fetchAllLeads() {
  const allResults = [];
  let cursor;
  let page = 0;

  do {
    page++;
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Notion API error: ${err.message}`);
    }

    const data = await res.json();
    allResults.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
    process.stderr.write(`  Fetched page ${page}: ${data.results.length} leads (${allResults.length} total)\n`);
  } while (cursor);

  return allResults;
}

/**
 * Export Stannp-format CSV from Notion database.
 */
async function exportStannp(options = {}) {
  const { ownerOnly = false, minScore = 0, excludeMixedUse = true } = options;
  const ALLOWED_LEAD_TYPES = ['BTL', 'R2R', 'BTL + R2R'];
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });

  console.log('Fetching leads from Notion...');
  const allLeads = await fetchAllLeads();
  console.log(`  Total leads in Notion: ${allLeads.length}`);

  const addressSources = { owner: 0, mailing: 0, property: 0, none: 0 };
  let skippedNoAddress = 0;
  let skippedScore = 0;
  let skippedLeadType = 0;
  let skippedMixedUse = 0;

  const csvData = [];

  for (const page of allLeads) {
    const props = page.properties;
    const leadName = getTitle(props.Lead);
    if (!leadName) continue;

    // Lead type filter — only BTL, R2R, BTL+R2R
    const leadType = props['Lead Type']?.select?.name || '';
    if (!ALLOWED_LEAD_TYPES.includes(leadType)) { skippedLeadType++; continue; }

    // Mixed use filter — exclude properties flagged as mixed use
    const priority = props.Priority?.select?.name || '';
    if (excludeMixedUse && priority.includes('Mixed Use')) { skippedMixedUse++; continue; }

    const score = props.Score?.number ?? 0;
    if (score < minScore) { skippedScore++; continue; }

    const ownerAddress = getText(props['Owner Address']);
    const mailingAddress = getText(props['Mailing Address']);
    const properties = getText(props.Properties);
    const firstProperty = properties ? properties.split('\n')[0] : '';

    // Address selection: owner > mailing > property
    let addr, source;
    if (ownerAddress) {
      addr = parseAddress(ownerAddress);
      source = 'owner';
    } else if (!ownerOnly && mailingAddress) {
      addr = parseAddress(mailingAddress);
      source = 'mailing';
    } else if (!ownerOnly && firstProperty) {
      addr = parseAddress(firstProperty);
      source = 'property';
    } else {
      skippedNoAddress++;
      continue;
    }
    addressSources[source]++;

    const contactName = getText(props['Contact Name']);
    const company = getText(props.Company);
    const nameResult = formatName(leadName, contactName, company);

    const epcRating = props['EPC Rating']?.select?.name || '';
    const propertyCount = props['Property Count']?.number || 0;

    csvData.push({
      title: nameResult.title,
      firstname: nameResult.firstname,
      lastname: nameResult.lastname,
      company: nameResult.company,
      address1: addr.line1,
      address2: addr.line2,
      city: addr.city,
      postcode: addr.postcode,
      country: 'GB',
      epc_rating: epcRating === 'N/A' ? '' : epcRating,
      property_count: propertyCount,
      property_address: firstProperty,
    });
  }

  const csv = stringify(csvData, { header: true });
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `stannp-${dateStamp}.csv`;
  const filePath = path.join(EXPORTS_DIR, fileName);
  fs.writeFileSync(filePath, csv);

  console.log(`\nStannp export complete:`);
  console.log(`  Leads exported: ${csvData.length}`);
  console.log(`  Skipped (no address): ${skippedNoAddress}`);
  console.log(`  Skipped (lead type not BTL/R2R): ${skippedLeadType}`);
  console.log(`  Skipped (mixed use): ${skippedMixedUse}`);
  console.log(`  Skipped (below min score ${minScore}): ${skippedScore}`);
  console.log(`  Address sources: owner=${addressSources.owner}, mailing=${addressSources.mailing}, property=${addressSources.property}`);
  console.log(`  File: ${filePath}`);

  return { rowCount: csvData.length, filePath, addressSources };
}

module.exports = { exportStannp, extractPostcode, parseAddress, formatName };

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const ownerOnly = args.includes('--owner-only');
  const includeMixedUse = args.includes('--include-mixed-use');
  const scoreArg = args.find(a => a.startsWith('--min-score='));
  const minScore = scoreArg ? parseInt(scoreArg.split('=')[1]) : 0;

  exportStannp({ ownerOnly, minScore, excludeMixedUse: !includeMixedUse }).catch(err => {
    console.error('Export failed:', err.message);
    process.exit(1);
  });
}
