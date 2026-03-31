/**
 * Pull Google Street View images for company leads and save locally.
 * Classification is done separately by reviewing the images.
 *
 * Usage: node scripts/streetview-classify.js [--limit=N] [--offset=N]
 */
require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'streetview');
const INDIVIDUAL = /^(MR |MRS |MS |MISS |DR |PROF |REV |SIR |LADY |LORD )/i;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchImage(address) {
  return new Promise((resolve, reject) => {
    const url = `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function checkAvailability(address) {
  return new Promise((resolve, reject) => {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const args = process.argv.slice(2).reduce((acc, a) => {
    const m = a.match(/^--(\w[\w-]*)(?:=(.+))?$/);
    if (m) acc[m[1]] = m[2] || true;
    return acc;
  }, {});

  const limit = args.limit ? parseInt(args.limit) : undefined;
  const offset = args.offset ? parseInt(args.offset) : 0;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let sql = `SELECT id, name, mailing_address FROM landlords
    WHERE tired_score >= 50 AND mailing_address IS NOT NULL
    AND (match_group_id IS NULL OR is_primary_record = 1)
    ORDER BY tired_score DESC`;

  let leads = db.prepare(sql).all().filter(l => !INDIVIDUAL.test(l.name));

  if (offset) leads = leads.slice(offset);
  if (limit) leads = leads.slice(0, limit);

  console.log(`Processing ${leads.length} company leads (offset=${offset})...`);

  let downloaded = 0;
  let noImage = 0;

  for (let i = 0; i < leads.length; i++) {
    const l = leads[i];
    const safeFilename = l.id + '.jpg';
    const filepath = path.join(OUTPUT_DIR, safeFilename);

    // Skip if already downloaded
    if (fs.existsSync(filepath)) {
      downloaded++;
      continue;
    }

    try {
      // Check availability first (free, no image charge)
      const meta = await checkAvailability(l.mailing_address);
      if (meta.status !== 'OK') {
        noImage++;
        if ((i + 1) % 50 === 0) console.log(`Progress: ${i + 1}/${leads.length} | ${downloaded} images, ${noImage} no coverage`);
        await sleep(100);
        continue;
      }

      // Pull the image
      const imgBuffer = await fetchImage(l.mailing_address);
      fs.writeFileSync(filepath, imgBuffer);
      downloaded++;
    } catch (err) {
      noImage++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${leads.length} | ${downloaded} images, ${noImage} no coverage`);
    }
    await sleep(200); // ~5 req/s, well within limits
  }

  console.log(`\nDone: ${downloaded} images downloaded, ${noImage} no Street View coverage`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
