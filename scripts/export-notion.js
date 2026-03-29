require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { stringify } = require('csv-stringify/sync');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ============================================================
// Pure data transformation functions (exported for testing)
// ============================================================

/**
 * Derive lead type from BTL/R2R suitability flags.
 * @param {number} btlSuitable - 1 or 0
 * @param {number} r2rSuitable - 1 or 0
 * @returns {string}
 */
function deriveLeadType(btlSuitable, r2rSuitable) {
  if (btlSuitable && r2rSuitable) return 'BTL + R2R';
  if (btlSuitable) return 'BTL';
  if (r2rSuitable) return 'R2R';
  return 'Unclassified';
}

/**
 * Find the worst EPC rating from a comma-separated string.
 * G is worst, A is best.
 * @param {string|null} epcRatings - e.g. "C,D,G,B"
 * @returns {string|null}
 */
function worstEPC(epcRatings) {
  if (!epcRatings || epcRatings.trim() === '') return null;
  const order = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];
  const ratings = epcRatings.split(',').map(r => r.trim()).filter(Boolean);
  for (const grade of order) {
    if (ratings.includes(grade)) return grade;
  }
  return ratings[0] || null;
}

/**
 * Calculate follow-up date as 3 days from now in YYYY-MM-DD format.
 * @returns {string}
 */
function calculateFollowUpDate() {
  return new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
}

/**
 * Build Notion page properties object from a landlord row.
 * @param {object} landlord - Row from queryLeads
 * @returns {object} Notion properties object
 */
function buildNotionProperties(landlord) {
  const leadType = deriveLeadType(landlord.btl_suitable, landlord.r2r_suitable);
  const worst = worstEPC(landlord.epc_ratings);
  const followUpDate = calculateFollowUpDate();

  const props = {
    'Name': { title: [{ text: { content: landlord.name } }] },
    'Score': { number: landlord.tired_score },
    'Pipeline Stage': { select: { name: 'New Lead' } },
    'Lead Type': { select: { name: leadType } },
    'BTL Suitable': { checkbox: Boolean(landlord.btl_suitable) },
    'R2R Suitable': { checkbox: Boolean(landlord.r2r_suitable) },
    'Entity Type': { select: { name: landlord.entity_type || 'unknown' } },
    'Property Count': { number: landlord.property_count || 0 },
    'Void Days': { number: landlord.max_void_days || 0 },
    'Email': { email: landlord.email || null },
    'Phone': { phone_number: landlord.phone || null },
    'Mailing Address': { rich_text: [{ text: { content: landlord.mailing_address || '' } }] },
    'Data Sources': { rich_text: [{ text: { content: landlord.enrichment_source || landlord.source || '' } }] },
    'Director Names': { rich_text: [{ text: { content: landlord.director_names || '' } }] },
    'Follow Up Date': { date: { start: followUpDate } },
    'Company Number': { rich_text: [{ text: { content: landlord.company_number || '' } }] },
    'LinkedIn': { url: landlord.linkedin_url || null },
  };

  // Only add EPC Rating if we have one (Notion rejects null select)
  if (worst) {
    props['EPC Rating'] = { select: { name: worst } };
  } else {
    props['EPC Rating'] = { select: { name: 'N/A' } };
  }

  return props;
}

// ============================================================
// Database query
// ============================================================

/**
 * Query landlords with tired_score >= minScore, aggregating property data.
 * @param {import('better-sqlite3').Database} db
 * @param {number} minScore
 * @returns {object[]}
 */
function queryLeads(db, minScore) {
  return db.prepare(`
    SELECT l.*,
      COUNT(DISTINCT p.id) as property_count,
      GROUP_CONCAT(DISTINCT p.current_energy_rating) as epc_ratings,
      MAX(p.void_days) as max_void_days
    FROM landlords l
    LEFT JOIN properties p ON p.landlord_id = l.id
    WHERE l.tired_score >= ?
      AND (l.match_group_id IS NULL OR l.is_primary_record = 1)
    GROUP BY l.id
    ORDER BY l.tired_score DESC
  `).all(minScore);
}

// ============================================================
// Notion API interaction
// ============================================================

/**
 * POST a single page to the Notion API.
 * @param {object} pageData - Full Notion page creation payload
 * @returns {Promise<object>} API response
 */
function createNotionPage(pageData) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(pageData);
    const req = https.request({
      hostname: 'api.notion.com',
      path: '/v1/pages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Notion API ${res.statusCode}: ${parsed.message || data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Notion response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Main export function
// ============================================================

/**
 * Export scored leads to Notion database.
 *
 * @param {import('better-sqlite3').Database} db - Database instance
 * @param {object} options
 * @param {number} [options.minScore=50] - Minimum tired landlord score
 * @param {boolean} [options.dryRun=false] - If true, write JSON instead of calling API
 * @param {number} [options.batchSize=10] - Progress log interval
 * @param {string} [options.exportsDir] - Override exports directory
 * @returns {Promise<object>} Summary stats
 */
async function exportToNotion(db, options = {}) {
  const {
    minScore = 50,
    dryRun = false,
    batchSize = 10,
    exportsDir: customExportsDir,
  } = options;

  const exportsDir = customExportsDir || path.join(__dirname, '..', 'data', 'exports');
  fs.mkdirSync(exportsDir, { recursive: true });

  const dateStamp = new Date().toISOString().split('T')[0];

  // Query leads
  const leads = queryLeads(db, minScore);
  console.log(`Found ${leads.length} leads with score >= ${minScore}`);

  if (leads.length === 0) {
    console.log('No leads to export.');
    return { total: 0, success: 0, failed: 0, dryRunFile: null, csvBackupFile: null };
  }

  // Build Notion page objects
  const pageObjects = leads.map(landlord => ({
    parent: { database_id: NOTION_DATABASE_ID || 'dry-run-placeholder' },
    properties: buildNotionProperties(landlord),
  }));

  // CSV backup — always produce this
  const csvRows = leads.map(l => ({
    'Name': l.name,
    'Score': l.tired_score,
    'Lead Type': deriveLeadType(l.btl_suitable, l.r2r_suitable),
    'BTL Suitable': l.btl_suitable ? 'Yes' : 'No',
    'R2R Suitable': l.r2r_suitable ? 'Yes' : 'No',
    'Entity Type': l.entity_type || 'unknown',
    'Property Count': l.property_count || 0,
    'EPC Rating': worstEPC(l.epc_ratings) || 'N/A',
    'Void Days': l.max_void_days || 0,
    'Email': l.email || '',
    'Phone': l.phone || '',
    'Mailing Address': l.mailing_address || '',
    'Data Sources': l.enrichment_source || l.source || '',
    'Director Names': l.director_names || '',
    'Company Number': l.company_number || '',
    'LinkedIn': l.linkedin_url || '',
    'Follow Up Date': calculateFollowUpDate(),
  }));

  const csvBackupFile = path.join(exportsDir, `notion-backup-${dateStamp}.csv`);
  fs.writeFileSync(csvBackupFile, stringify(csvRows, { header: true }));
  console.log(`CSV backup written to ${csvBackupFile}`);

  // Dry run mode
  if (dryRun) {
    const dryRunFile = path.join(exportsDir, `notion-dry-run-${dateStamp}.json`);
    fs.writeFileSync(dryRunFile, JSON.stringify(pageObjects, null, 2));
    console.log(`Dry run: ${leads.length} page objects written to ${dryRunFile}`);
    return {
      total: leads.length,
      success: leads.length,
      failed: 0,
      dryRunFile,
      csvBackupFile,
    };
  }

  // Live push to Notion API
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    console.error('Error: NOTION_API_KEY and NOTION_DATABASE_ID must be set in .env');
    console.error('Run with --dry-run to test data transformation without API access.');
    return { total: leads.length, success: 0, failed: leads.length, dryRunFile: null, csvBackupFile };
  }

  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < pageObjects.length; i++) {
    try {
      await createNotionPage(pageObjects[i]);
      success++;
    } catch (err) {
      failed++;
      const leadName = leads[i].name;
      console.error(`Failed to push "${leadName}": ${err.message}`);
      errors.push({ name: leadName, error: err.message });
    }

    // Progress logging
    if ((i + 1) % batchSize === 0 || i === pageObjects.length - 1) {
      console.log(`Pushed ${i + 1}/${pageObjects.length} leads to Notion...`);
    }

    // Rate limiting: 3 requests/second = 333ms between requests
    if (i < pageObjects.length - 1) {
      await sleep(350);
    }
  }

  console.log(`\nNotion export complete: ${success} success, ${failed} failed out of ${leads.length} total`);
  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }

  return {
    total: leads.length,
    success,
    failed,
    errors,
    dryRunFile: null,
    csvBackupFile,
  };
}

// ============================================================
// CLI entry point
// ============================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const minScoreArg = args.find(a => a.startsWith('--min-score='));
  const minScore = minScoreArg ? parseInt(minScoreArg.split('=')[1], 10) : 50;
  const batchSizeArg = args.find(a => a.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 10;

  const db = require('./lib/db');

  exportToNotion(db, { minScore, dryRun, batchSize })
    .then(result => {
      console.log('\nDone.', result);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = {
  exportToNotion,
  queryLeads,
  buildNotionProperties,
  deriveLeadType,
  worstEPC,
  calculateFollowUpDate,
};
