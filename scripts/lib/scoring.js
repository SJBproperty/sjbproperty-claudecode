/**
 * Pure scoring and classification functions for landlord lead prioritisation.
 *
 * NO database dependency -- fully testable with plain objects.
 *
 * Scoring weights (stepped, not linear):
 * - Void periods:     35 points max
 * - EPC rating:       28 points max
 * - Listing quality:  18 points max (inverted -- lower quality = higher score)
 * - Self-managing:    12 points max
 * - Portfolio size:    7 points max
 *
 * Total possible: 100 points. Score normalised to available signals only.
 */

const EPC_SCORES = { G: 28, F: 24, E: 18, D: 10 };

/**
 * Score a landlord based on available signals.
 * Missing/null signals are skipped (contribute 0) and score normalises
 * to the max possible from available signals only.
 *
 * @param {Object} landlord
 * @param {number|null} landlord.max_void_days
 * @param {string|null} landlord.worst_epc - Letter grade A-G
 * @param {number|null} landlord.avg_listing_quality - 0-100 score
 * @param {boolean} landlord.is_self_managing
 * @param {number} landlord.property_count
 * @returns {{ score: number, signals_count: number }}
 */
function scoreLandlord(landlord = {}) {
  let rawScore = 0;
  let maxPossible = 0;
  let signalsCount = 0;

  const {
    max_void_days = null,
    worst_epc = null,
    avg_listing_quality = null,
    is_self_managing = false,
    property_count = 0,
  } = landlord;

  // Void periods (35 points max)
  if (max_void_days != null) {
    maxPossible += 35;
    signalsCount++;
    if (max_void_days >= 90) rawScore += 35;
    else if (max_void_days >= 60) rawScore += 25;
    else if (max_void_days >= 30) rawScore += 15;
    else rawScore += 5;
  }

  // EPC rating (28 points max)
  if (worst_epc != null && EPC_SCORES[worst_epc] != null) {
    maxPossible += 28;
    signalsCount++;
    rawScore += EPC_SCORES[worst_epc];
  }

  // Listing quality (18 points max, INVERTED -- lower quality = more tired)
  if (avg_listing_quality != null) {
    maxPossible += 18;
    signalsCount++;
    if (avg_listing_quality < 25) rawScore += 18;
    else if (avg_listing_quality < 50) rawScore += 12;
    else if (avg_listing_quality < 75) rawScore += 6;
    // >= 75: 0 points
  }

  // Self-managing (12 points max)
  if (is_self_managing === true) {
    maxPossible += 12;
    signalsCount++;
    rawScore += 12;
  }

  // Portfolio size (7 points max)
  if (property_count != null && property_count > 0) {
    if (property_count >= 9) {
      // Large portfolios = likely professional, skip (0 points, no signal)
    } else {
      maxPossible += 7;
      signalsCount++;
      if (property_count >= 2 && property_count <= 5) rawScore += 7;
      else if (property_count === 1) rawScore += 2;
      else if (property_count >= 6 && property_count <= 8) rawScore += 4;
    }
  }

  // Normalise to 0-100 based on available signals
  const score = maxPossible > 0 ? Math.round((rawScore / maxPossible) * 100) : 0;

  return { score, signals_count: signalsCount };
}

/**
 * Classify whether a landlord is suitable for BTL management outreach.
 * @param {number} score - Tired score 0-100
 * @param {boolean} hasOnlyHMO - True if landlord only has HMO properties
 * @returns {boolean}
 */
function classifyBTL(score, hasOnlyHMO) {
  return score >= 50 && !hasOnlyHMO;
}

/**
 * Classify whether a landlord is suitable for Rent-to-Rent (R2R) / guaranteed rent.
 * R2R only applies to HMO landlords.
 * @param {boolean} hasHMOLicence - True if landlord has any HMO licence
 * @returns {boolean}
 */
function classifyR2R(hasHMOLicence) {
  return hasHMOLicence === true;
}

module.exports = { scoreLandlord, classifyBTL, classifyR2R };
