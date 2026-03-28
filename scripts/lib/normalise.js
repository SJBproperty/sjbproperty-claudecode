const { parse: parsePostcode } = require('postcode');

/**
 * Normalise a property address for deduplication matching.
 * Uppercases, abbreviates common road types, collapses whitespace.
 */
function normaliseAddress(address) {
  if (!address) return '';
  let result = address.toUpperCase();

  // Replace common road type words with abbreviations
  const replacements = [
    [/\bSTREET\b/g, 'ST'],
    [/\bROAD\b/g, 'RD'],
    [/\bAVENUE\b/g, 'AVE'],
    [/\bDRIVE\b/g, 'DR'],
    [/\bLANE\b/g, 'LN'],
    [/\bCRESCENT\b/g, 'CRES'],
    [/\bCLOSE\b/g, 'CL'],
    [/\bCOURT\b/g, 'CT'],
  ];

  for (const [pattern, abbr] of replacements) {
    result = result.replace(pattern, abbr);
  }

  // Collapse whitespace and trim
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Normalise a company/landlord name for deduplication matching.
 * Uppercases, replaces LIMITED->LTD, AND->&, strips special chars.
 */
function normaliseName(name) {
  if (!name) return '';
  let result = name.toUpperCase();

  // Replace common variants
  result = result.replace(/\bLIMITED\b/g, 'LTD');
  result = result.replace(/\bAND\b/g, '&');

  // Strip non-alphanumeric except & and space
  result = result.replace(/[^A-Z0-9& ]/g, '');

  // Collapse whitespace and trim
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Extract the outcode (first part) from a UK postcode string.
 * Returns null if the postcode is invalid.
 */
function extractPostcodeOutcode(postcodeStr) {
  if (!postcodeStr || typeof postcodeStr !== 'string') return null;
  const result = parsePostcode(postcodeStr.trim());
  if (result.valid) {
    return result.outcode;
  }
  return null;
}

module.exports = { normaliseAddress, normaliseName, extractPostcodeOutcode };
