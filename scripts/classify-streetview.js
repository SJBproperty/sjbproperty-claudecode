/**
 * Classify Street View images using Claude Haiku via API.
 * Sends each image and gets back: RESIDENTIAL, MIXED_USE, or COMMERCIAL.
 *
 * Usage: node scripts/classify-streetview.js
 * Cost: ~£0.40 for 800 images
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const db = require('./lib/db');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const IMAGE_DIR = path.join(__dirname, '..', 'data', 'streetview');
const RESULTS_FILE = path.join(IMAGE_DIR, 'classifications.json');

const COMPANY = /\b(LTD|LIMITED|LLP|PLC|CIC)\b/i;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function classifyImage(imageBase64) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
          },
          {
            type: 'text',
            text: 'Classify this Google Street View image of a UK property. Reply with EXACTLY one word:\n- RESIDENTIAL (houses, flats, terraces, semi-detached, apartment blocks)\n- MIXED_USE (shop front with flats above, commercial ground floor with residential upper floors, shuttered retail units on residential streets)\n- COMMERCIAL (industrial units, warehouses, offices, retail parks, car parks, land, commercial-only buildings)\n\nReply with one word only.'
          }
        ]
      }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.content && parsed.content[0]) {
            const text = parsed.content[0].text.trim().toUpperCase();
            if (text.includes('MIXED')) resolve('MIXED_USE');
            else if (text.includes('COMMERCIAL')) resolve('COMMERCIAL');
            else resolve('RESIDENTIAL');
          } else if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            resolve('RESIDENTIAL'); // default
          }
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  // Load existing results if resuming
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    console.log(`Resuming: ${Object.keys(results).length} already classified`);
  }

  // Get company leads with images
  const leads = db.prepare(`SELECT id, name, mailing_address FROM landlords
    WHERE tired_score >= 50 AND mailing_address IS NOT NULL
    AND (match_group_id IS NULL OR is_primary_record = 1)`).all()
    .filter(l => COMPANY.test(l.name));

  const toClassify = leads.filter(l =>
    fs.existsSync(path.join(IMAGE_DIR, l.id + '.jpg')) && !results[l.id]
  );

  console.log(`To classify: ${toClassify.length} (${leads.length} total, ${Object.keys(results).length} done)`);

  let classified = 0;
  let errors = 0;
  const counts = { RESIDENTIAL: 0, MIXED_USE: 0, COMMERCIAL: 0 };

  for (let i = 0; i < toClassify.length; i++) {
    const l = toClassify[i];
    const imgPath = path.join(IMAGE_DIR, l.id + '.jpg');

    try {
      const imageBase64 = fs.readFileSync(imgPath).toString('base64');
      const classification = await classifyImage(imageBase64);
      results[l.id] = classification;
      counts[classification]++;
      classified++;
    } catch (err) {
      console.error(`  Error classifying ${l.name}: ${err.message}`);
      errors++;
      if (err.message.includes('rate')) {
        console.log('  Rate limited, waiting 30s...');
        await sleep(30000);
        i--; // retry
        continue;
      }
    }

    // Save progress every 50 images
    if ((classified + errors) % 50 === 0) {
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      console.log(`Progress: ${classified}/${toClassify.length} | R:${counts.RESIDENTIAL} MU:${counts.MIXED_USE} C:${counts.COMMERCIAL} | ${errors} errors`);
    }

    await sleep(200); // ~5 req/s
  }

  // Final save
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  // Count totals including previously classified
  const allCounts = { RESIDENTIAL: 0, MIXED_USE: 0, COMMERCIAL: 0 };
  for (const cls of Object.values(results)) allCounts[cls]++;

  console.log(`\nDone: ${classified} classified this run, ${errors} errors`);
  console.log(`Total classifications: ${Object.keys(results).length}`);
  console.log(`  Residential: ${allCounts.RESIDENTIAL}`);
  console.log(`  Mixed Use: ${allCounts.MIXED_USE}`);
  console.log(`  Commercial: ${allCounts.COMMERCIAL}`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
