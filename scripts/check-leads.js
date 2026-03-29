const db = require('./lib/db');
const r = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) as with_email,
    SUM(CASE WHEN entity_type IN ('ltd','llp') THEN 1 ELSE 0 END) as companies,
    SUM(CASE WHEN director_names IS NOT NULL THEN 1 ELSE 0 END) as with_directors,
    SUM(CASE WHEN company_number IS NOT NULL THEN 1 ELSE 0 END) as with_company_num,
    SUM(CASE WHEN mailing_address IS NOT NULL THEN 1 ELSE 0 END) as with_address
  FROM landlords
  WHERE tired_score >= 50
    AND (match_group_id IS NULL OR is_primary_record = 1)
`).get();
console.log(JSON.stringify(r, null, 2));
