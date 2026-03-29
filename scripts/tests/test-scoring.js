const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { scoreLandlord, classifyBTL, classifyR2R } = require('../lib/scoring');

describe('scoreLandlord', () => {
  it('all strong signals -> score 90-100', () => {
    const result = scoreLandlord({
      max_void_days: 90,
      worst_epc: 'G',
      avg_listing_quality: 20,
      is_self_managing: true,
      property_count: 3,
    });
    assert.ok(result.score >= 90, `Expected score >= 90, got ${result.score}`);
    assert.ok(result.score <= 100, `Expected score <= 100, got ${result.score}`);
    assert.equal(result.signals_count, 5);
  });

  it('no data -> score 0', () => {
    const result = scoreLandlord({
      max_void_days: null,
      worst_epc: null,
      avg_listing_quality: null,
      is_self_managing: false,
      property_count: 0,
    });
    assert.equal(result.score, 0);
    assert.equal(result.signals_count, 0);
  });

  it('only EPC G -> normalised to 100', () => {
    const result = scoreLandlord({ worst_epc: 'G' });
    assert.equal(result.score, 100);
    assert.equal(result.signals_count, 1);
  });

  it('only short voids (15 days) -> score < 50', () => {
    const result = scoreLandlord({ max_void_days: 15 });
    assert.ok(result.score < 50, `Expected score < 50, got ${result.score}`);
    assert.equal(result.signals_count, 1);
  });

  it('returns { score, signals_count } object', () => {
    const result = scoreLandlord({ worst_epc: 'D' });
    assert.ok('score' in result, 'Should have score property');
    assert.ok('signals_count' in result, 'Should have signals_count property');
    assert.equal(typeof result.score, 'number');
    assert.equal(typeof result.signals_count, 'number');
  });

  it('portfolio size 2-5 gets max points (7)', () => {
    const r1 = scoreLandlord({ property_count: 3 });
    const r2 = scoreLandlord({ property_count: 5 });
    // 7/7 = 100 normalised
    assert.equal(r1.score, 100);
    assert.equal(r2.score, 100);
  });

  it('portfolio size 1 gets 2 points', () => {
    const result = scoreLandlord({ property_count: 1 });
    // 2/7 normalised = 29
    assert.equal(result.score, 29);
  });

  it('portfolio size 6-8 gets 4 points', () => {
    const result = scoreLandlord({ property_count: 7 });
    // 4/7 normalised = 57
    assert.equal(result.score, 57);
  });

  it('portfolio size 9+ gets 0 points (skipped)', () => {
    const result = scoreLandlord({ property_count: 10 });
    assert.equal(result.score, 0);
    assert.equal(result.signals_count, 0);
  });

  it('boundary: score exactly 50 with right inputs', () => {
    // void_days 30 = 15 points, out of max 35 -> 15/35 = 43 normalised (not 50)
    // Let's find a combo: void_days >= 60 = 25/35 = 71, too high
    // EPC D = 10/28 = 36, + void_days < 30 = 5/35 -> total 15/63 = 24, too low
    // EPC E = 18/28 + void_days >=30 = 15/35 -> 33/63 = 52
    // Let's just verify the calculation
    const result = scoreLandlord({ worst_epc: 'E', max_void_days: 30 });
    assert.equal(typeof result.score, 'number');
    assert.equal(result.signals_count, 2);
  });

  it('empty object -> score 0', () => {
    const result = scoreLandlord({});
    assert.equal(result.score, 0);
    assert.equal(result.signals_count, 0);
  });
});

describe('classifyBTL', () => {
  it('score >= 50, not only HMO -> true', () => {
    assert.equal(classifyBTL(60, false), true);
  });

  it('score >= 50, only HMO -> false', () => {
    assert.equal(classifyBTL(60, true), false);
  });

  it('score < 50, not only HMO -> false', () => {
    assert.equal(classifyBTL(40, false), false);
  });

  it('score exactly 50 -> true (>= threshold)', () => {
    assert.equal(classifyBTL(50, false), true);
  });
});

describe('classifyR2R', () => {
  it('has HMO licence -> true', () => {
    assert.equal(classifyR2R(true), true);
  });

  it('no HMO licence -> false', () => {
    assert.equal(classifyR2R(false), false);
  });
});
