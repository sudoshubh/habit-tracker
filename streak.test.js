const assert = require('assert');
const S = require('./streak.js');

const H = (completions, extra = {}) => ({ createdAt: '2026-01-01', days: [0, 1, 2, 3, 4, 5, 6], completions, ...extra });

assert.strictEqual(S.currentStreak(H(['2026-01-08', '2026-01-09', '2026-01-10']), '2026-01-10'), 3);
// today still open does not break the streak
assert.strictEqual(S.currentStreak(H(['2026-01-08', '2026-01-09']), '2026-01-10'), 2);
// a missed day breaks it
assert.strictEqual(S.currentStreak(H(['2026-01-07', '2026-01-09']), '2026-01-10'), 1);
assert.strictEqual(S.currentStreak(H([]), '2026-01-10'), 0);
// weekday-only habit skips the weekend (01-10 Sat, 01-11 Sun)
const wk = H(['2026-01-08', '2026-01-09', '2026-01-12'], { days: [1, 2, 3, 4, 5] });
assert.strictEqual(S.currentStreak(wk, '2026-01-12'), 3);
// month/year boundary
assert.strictEqual(S.currentStreak(H(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'], { createdAt: '2025-12-30' }), '2026-01-02'), 4);
// DST boundary
assert.strictEqual(S.addDays('2026-03-07', 2), '2026-03-09');
assert.strictEqual(S.currentStreak(H(['2026-03-07', '2026-03-08', '2026-03-09']), '2026-03-09'), 3);
// best streak survives a later break
assert.strictEqual(S.bestStreak(H(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-05']), '2026-01-06'), 3);
// completion rate: 5 of 7 scheduled days
assert.strictEqual(S.completionRate(H(['2026-01-04', '2026-01-05', '2026-01-06', '2026-01-08', '2026-01-10']), '2026-01-10', 7), 71);
// missed-yesterday detection
assert.strictEqual(S.missedLastScheduled(H(['2026-01-08']), '2026-01-10'), true);
assert.strictEqual(S.missedLastScheduled(H(['2026-01-09']), '2026-01-10'), false);

console.log('all streak tests passed');
