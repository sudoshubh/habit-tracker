// Pure streak/stat logic. Dates are local "YYYY-MM-DD" strings; arithmetic is done in UTC to be DST-safe.
(function (root) {
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const fmt = (ms) => new Date(ms).toISOString().slice(0, 10);
  const addDays = (s, n) => fmt(parse(s) + n * 86400000);
  const dow = (s) => new Date(parse(s)).getUTCDay();
  const todayStr = (now = new Date()) =>
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const isScheduled = (h, date) => (h.days && h.days.length ? h.days : ALL_DAYS).includes(dow(date));
  const startOf = (h) => {
    const first = [h.createdAt, ...(h.completions || [])].filter(Boolean).sort()[0];
    return first || null;
  };

  // Consecutive scheduled days completed, ending today (today stays open until midnight).
  function currentStreak(h, today) {
    const done = new Set(h.completions || []);
    const start = startOf(h);
    if (!start) return 0;
    let streak = 0, d = today;
    while (d >= start) {
      if (isScheduled(h, d)) {
        if (done.has(d)) streak++;
        else if (d !== today) break;
      }
      d = addDays(d, -1);
    }
    return streak;
  }

  function bestStreak(h, today) {
    const done = new Set(h.completions || []);
    const start = startOf(h);
    if (!start) return 0;
    let best = 0, run = 0;
    for (let d = start; d <= today; d = addDays(d, 1)) {
      if (!isScheduled(h, d)) continue;
      if (done.has(d)) { run++; best = Math.max(best, run); }
      else if (d !== today) run = 0;
    }
    return best;
  }

  // Share of scheduled days completed in the last n days (an open today is not penalised).
  function completionRate(h, today, n) {
    const done = new Set(h.completions || []);
    const start = startOf(h);
    if (!start) return 0;
    let sched = 0, hit = 0;
    for (let i = 0; i < n; i++) {
      const d = addDays(today, -i);
      if (d < start || !isScheduled(h, d)) continue;
      if (done.has(d)) { sched++; hit++; }
      else if (d !== today) sched++;
    }
    return sched ? Math.round((hit / sched) * 100) : 0;
  }

  // True if the most recent scheduled day before today was missed ("never miss twice" nudge).
  function missedLastScheduled(h, today) {
    const done = new Set(h.completions || []);
    const start = startOf(h);
    let d = addDays(today, -1);
    while (start && d >= start) {
      if (isScheduled(h, d)) return !done.has(d);
      d = addDays(d, -1);
    }
    return false;
  }

  root.Streak = { parse, fmt, addDays, dow, todayStr, isScheduled, currentStreak, bestStreak, completionRate, missedLastScheduled };
  if (typeof module !== 'undefined') module.exports = root.Streak;
})(typeof window !== 'undefined' ? window : globalThis);
