(() => {
  const S = window.Streak;
  const KEY = 'habits.v1', THEME_KEY = 'habits.theme';
  const EMOJIS = ['💧', '📖', '🏃', '🧘', '💪', '🥗', '😴', '✍️', '🎸', '💻', '🧹', '🙏'];
  const COLORS = ['#6366f1', '#ec4899', '#f97316', '#10b981', '#0ea5e9', '#a855f7', '#eab308', '#ef4444'];
  const MILESTONES = [3, 7, 21, 30, 66, 100];
  const REASONS = ['😴 Tired', '🤒 Sick', '💼 Busy', '🙈 Forgot', '😶 Unmotivated', '✈️ Away'];
  const DAY_LABELS =['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const $ = (id) => document.getElementById(id);

  let habits = [];
  let editingId = null;
  let form = { emoji: EMOJIS[0], color: COLORS[0], days: [0, 1, 2, 3, 4, 5, 6] };

  // ---------- storage ----------
  function load() {
    try { habits = JSON.parse(localStorage.getItem(KEY)) || []; } catch { habits = []; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(habits)); }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => S.todayStr();

  // ---------- theme ----------
  function applyTheme() {
    const t = localStorage.getItem(THEME_KEY);
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  }
  $('themeBtn').onclick = () => {
    const dark = document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    localStorage.setItem(THEME_KEY, dark ? 'light' : 'dark');
    applyTheme();
  };

  // ---------- rendering ----------
  function activeHabits() { return habits.filter((h) => !h.archived); }

  function render() {
    const t = today();
    const now = new Date();
    const hr = now.getHours();
    $('greeting').textContent = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    $('date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    const list = activeHabits();
    const due = list.filter((h) => S.isScheduled(h, t));
    const rest = list.filter((h) => !S.isScheduled(h, t));
    const doneCount = due.filter((h) => h.completions.includes(t)).length;
    const pct = due.length ? Math.round((doneCount / due.length) * 100) : 0;

    $('ring').style.setProperty('--p', pct);
    $('ringText').textContent = `${doneCount}/${due.length}`;
    const { title, sub } = summaryText(due, doneCount, t);
    $('summaryTitle').textContent = title;
    $('summarySub').textContent = sub;

    $('empty').hidden = list.length > 0;
    $('list').innerHTML = [...due, ...rest].map((h) => cardHTML(h, t)).join('');
  }

  function summaryText(due, doneCount, t) {
    if (!due.length) return { title: 'Nothing scheduled today', sub: 'Add a habit or enjoy your rest day.' };
    if (doneCount === due.length) return { title: 'All done today! 🎉', sub: pick(['You showed up. That is the whole game.', 'Consistency beats intensity.', 'Another brick in the wall.']) };
    const missed = due.filter((h) => !h.completions.includes(t) && S.missedLastScheduled(h, t));
    if (missed.length) return { title: 'Never miss twice', sub: `Get "${missed[0].name}" done today to get back on track.` };
    const left = due.length - doneCount;
    const evening = new Date().getHours() >= 18;
    const atRisk = due.filter((h) => !h.completions.includes(t) && S.currentStreak(h, t) >= 3);
    if (evening && atRisk.length) return { title: `Streak at risk 🔥`, sub: `"${atRisk[0].name}" has a ${S.currentStreak(atRisk[0], t)}-day streak. Keep it alive.` };
    return { title: `${left} to go today`, sub: pick(['Start with the easiest one.', 'Two minutes is enough to begin.', 'Small steps, every day.']) };
  }
  const pick = (a) => a[new Date().getDate() % a.length];

  function cardHTML(h, t) {
    const sched = S.isScheduled(h, t);
    const done = h.completions.includes(t);
    const streak = S.currentStreak(h, t);
    const dots = Array.from({ length: 7 }, (_, i) => {
      const d = S.addDays(t, i - 6);
      const cls = h.completions.includes(d) ? 'on' : S.isScheduled(h, d) ? '' : 'off';
      return `<i class="dot ${cls} ${d === t ? 'today' : ''}" title="${d}"></i>`;
    }).join('');
    return `<article class="card ${sched ? '' : 'rest'}" style="--c:${esc(h.color)}" data-id="${h.id}">
      <div class="emoji" aria-hidden="true">${esc(h.emoji)}</div>
      <button class="info" data-act="detail" aria-label="Details for ${esc(h.name)}">
        <span class="name">${esc(h.name)}</span>
        <span class="meta"><span>🔥 ${streak}</span><span class="dots">${dots}</span>${sched ? '' : '<span>Rest day</span>'}</span>
      </button>
      <button class="check ${done ? 'done' : ''}" data-act="toggle" ${sched ? '' : 'disabled'}
        aria-pressed="${done}" aria-label="${done ? 'Mark not done' : 'Mark done'}: ${esc(h.name)}">${done ? '✓' : ''}</button>
    </article>`;
  }

  // ---------- actions ----------
  $('list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('.card').dataset.id;
    if (btn.dataset.act === 'toggle') toggle(id, btn); else openDetail(id);
  });

  function toggle(id, btn) {
    const h = habits.find((x) => x.id === id);
    const t = today();
    const i = h.completions.indexOf(t);
    if (i >= 0) { h.completions.splice(i, 1); } else {
      h.completions.push(t); h.completions.sort();
      const s = S.currentStreak(h, t);
      if (navigator.vibrate) navigator.vibrate(20);
      const r = btn.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2, MILESTONES.includes(s) ? 140 : 40);
      if (MILESTONES.includes(s)) toast(`🏆 ${s}-day streak on "${h.name}"!`);
      else if (activeHabits().filter((x) => S.isScheduled(x, t)).every((x) => x.completions.includes(t))) toast('All habits done today 🎉');
    }
    save(); render();
  }

  // ---------- add / edit form ----------
  function buildFormControls() {
    $('emojiRow').innerHTML = EMOJIS.map((e) => `<button type="button" data-e="${e}" aria-label="Icon ${e}">${e}</button>`).join('');
    $('colorRow').innerHTML = COLORS.map((c) => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('');
    $('dayRow').innerHTML = DAY_LABELS.map((l, i) => `<button type="button" data-d="${i}" aria-label="Day ${i}">${l}</button>`).join('');
  }
  function syncForm() {
    $('emojiRow').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.e === form.emoji));
    $('colorRow').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.c === form.color));
    $('dayRow').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', form.days.includes(+b.dataset.d)));
  }
  $('emojiRow').onclick = (e) => { const b = e.target.closest('button'); if (b) { form.emoji = b.dataset.e; syncForm(); } };
  $('colorRow').onclick = (e) => { const b = e.target.closest('button'); if (b) { form.color = b.dataset.c; syncForm(); } };
  $('dayRow').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = +b.dataset.d;
    form.days = form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d];
    syncForm();
  };

  function openForm(h) {
    editingId = h ? h.id : null;
    form = h ? { emoji: h.emoji, color: h.color, days: [...h.days] } : { emoji: EMOJIS[0], color: COLORS[0], days: [0, 1, 2, 3, 4, 5, 6] };
    $('formTitle').textContent = h ? 'Edit habit' : 'New habit';
    $('fName').value = h ? h.name : '';
    $('fReminder').value = h && h.reminder ? h.reminder : '';
    syncForm();
    $('formSheet').showModal();
    $('fName').focus();
  }
  $('addBtn').onclick = () => openForm(null);
  $('cancelForm').onclick = () => $('formSheet').close();

  $('habitForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('fName').value.trim();
    if (!name) return;
    if (!form.days.length) { toast('Pick at least one day'); return; }
    const reminder = $('fReminder').value || null;
    if (editingId) {
      Object.assign(habits.find((x) => x.id === editingId), { name, emoji: form.emoji, color: form.color, days: [...form.days].sort(), reminder });
    } else {
      habits.push({ id: uid(), name, emoji: form.emoji, color: form.color, days: [...form.days].sort(), reminder, createdAt: today(), archived: false, completions: [] });
    }
    if (reminder && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    save(); render();
    $('formSheet').close();
  });

  // ---------- detail sheet ----------
  function openDetail(id) {
    const h = habits.find((x) => x.id === id);
    const t = today();
    const best = S.bestStreak(h, t), cur = S.currentStreak(h, t);
    const cells = [];
    const dowToday = S.dow(t);
    const startDate = S.addDays(t, -(12 * 7 - 1) - dowToday); // align columns to Sunday
    const total = 12 * 7 + dowToday;
    for (let i = 0; i < total; i++) {
      const d = S.addDays(startDate, i);
      const cls = d > t ? 'future' : h.completions.includes(d) ? 'on' : S.isScheduled(h, d) ? '' : 'skip';
      cells.push(`<i class="cell ${cls}" title="${d}"></i>`);
    }
    const notes = h.notes || {};
    const startD = h.createdAt;
    const misses = [];
    for (let i = 1; i <= 14; i++) {
      const d = S.addDays(t, -i);
      if (d >= startD && S.isScheduled(h, d) && !h.completions.includes(d)) misses.push(d);
    }
    const tagCounts = {};
    Object.values(notes).forEach((n) => { if (n.tag) tagCounts[n.tag] = (tagCounts[n.tag] || 0) + 1; });
    const top = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];
    const missesHTML = misses.length ? `<h3 class="sub">Missed days</h3>
      ${top ? `<p class="muted insight">Most common reason: ${esc(top[0])} (${top[1]}×)</p>` : ''}
      ${misses.map((d) => {
        const n = notes[d] || {};
        const label = new Date(S.parse(d)).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
        return `<div class="miss" data-d="${d}"><b>${label}</b>
          <div class="tags">${REASONS.map((r) => `<button type="button" class="tag ${n.tag === r ? 'sel' : ''}" data-tag="${r}">${r}</button>`).join('')}</div>
          <input class="note" maxlength="80" placeholder="What got in the way? (optional)" value="${esc(n.text || '')}" aria-label="Note for ${label}"></div>`;
      }).join('')}` : '';
    const badges = MILESTONES.map((m) => `<span class="badge ${best >= m ? 'got' : ''}">${best >= m ? '🏆' : '🔒'} ${m} days</span>`).join('');
    $('detailBody').innerHTML = `<div style="--c:${esc(h.color)}">
      <h2>${esc(h.emoji)} ${esc(h.name)}</h2>
      <div class="stats">
        <div class="stat"><b>🔥 ${cur}</b><span>Current streak</span></div>
        <div class="stat"><b>🏅 ${best}</b><span>Best streak</span></div>
        <div class="stat"><b>${S.completionRate(h, t, 7)}%</b><span>Last 7 days</span></div>
        <div class="stat"><b>${S.completionRate(h, t, 30)}%</b><span>Last 30 days</span></div>
      </div>
      <div class="heat" aria-label="Last 12 weeks">${cells.join('')}</div>
      <div class="badges">${badges}</div>
      ${missesHTML}
      <div class="actions">
        <button class="btn" data-a="edit">Edit</button>
        <button class="btn" data-a="archive">Archive</button>
        <button class="btn danger" data-a="delete">Delete</button>
      </div>
      <div class="actions"><button class="btn ghost" data-a="close">Close</button></div>
    </div>`;
    const saveNote = (row, patch) => {
      h.notes = h.notes || {};
      const n = { ...(h.notes[row.dataset.d] || {}), ...patch };
      if (!n.tag && !n.text) delete h.notes[row.dataset.d]; else h.notes[row.dataset.d] = n;
      save();
    };
    $('detailBody').onchange = (e) => {
      if (e.target.classList.contains('note')) saveNote(e.target.closest('.miss'), { text: e.target.value.trim() });
    };
    $('detailBody').onclick = (e) => {
      const tagBtn = e.target.closest('[data-tag]');
      if (tagBtn) {
        const row = tagBtn.closest('.miss');
        const same = tagBtn.classList.contains('sel');
        row.querySelectorAll('.tag').forEach((b) => b.classList.remove('sel'));
        if (!same) tagBtn.classList.add('sel');
        saveNote(row, { tag: same ? '' : tagBtn.dataset.tag });
        return;
      }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      $('detailSheet').close();
      if (a === 'edit') openForm(h);
      if (a === 'archive') { h.archived = true; save(); render(); toast(`Archived "${h.name}"`, () => { h.archived = false; save(); render(); }); }
      if (a === 'delete') {
        const idx = habits.indexOf(h); habits.splice(idx, 1); save(); render();
        toast(`Deleted "${h.name}"`, () => { habits.splice(idx, 0, h); save(); render(); });
      }
    };
    $('detailSheet').showModal();
  }

  // close sheets on backdrop click
  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  // ---------- backup ----------
  $('menuBtn').onclick = () => $('menuSheet').showModal();
  $('closeMenu').onclick = () => $('menuSheet').close();
  $('exportBtn').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, habits }, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `habits-${today()}.json` });
    a.click(); URL.revokeObjectURL(url);
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.habits)) throw new Error('bad file');
      habits = data.habits.map((h) => ({
        id: String(h.id || uid()), name: String(h.name || 'Habit').slice(0, 40), emoji: String(h.emoji || '✅'),
        color: COLORS.includes(h.color) ? h.color : COLORS[0],
        days: Array.isArray(h.days) && h.days.length ? h.days.filter((d) => d >= 0 && d <= 6) : [0, 1, 2, 3, 4, 5, 6],
        reminder: /^\d\d:\d\d$/.test(h.reminder) ? h.reminder : null,
        createdAt: /^\d{4}-\d\d-\d\d$/.test(h.createdAt) ? h.createdAt : today(), archived: !!h.archived,
        notes: Object.fromEntries(Object.entries(h.notes && typeof h.notes === 'object' ? h.notes : {})
          .filter(([d, n]) => /^\d{4}-\d\d-\d\d$/.test(d) && n && typeof n === 'object')
          .map(([d, n]) => [d, { tag: REASONS.includes(n.tag) ? n.tag : '', text: String(n.text || '').slice(0, 80) }])),
        completions: (h.completions || []).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)).sort(),
      }));
      save(); render(); $('menuSheet').close(); toast('Imported');
    } catch { toast('Could not read that file'); }
    e.target.value = '';
  };

  // ---------- toast ----------
  let toastTimer;
  function toast(msg, undo) {
    const el = $('toast');
    el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button>Undo</button>' : ''}`;
    el.hidden = false;
    if (undo) el.querySelector('button').onclick = () => { undo(); el.hidden = true; };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, undo ? 5000 : 3000);
  }

  // ---------- confetti ----------
  function confetti(x, y, n) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('confetti'), ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const ps = Array.from({ length: n }, () => ({
      x, y, vx: (Math.random() - .5) * 10, vy: -Math.random() * 10 - 3, r: Math.random() * 5 + 3,
      c: COLORS[Math.floor(Math.random() * COLORS.length)], life: 1,
    }));
    (function frame() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.life -= .014; ctx.globalAlpha = Math.max(p.life, 0); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.r, p.r * 1.6); });
      if (ps.some((p) => p.life > 0)) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }

  // ---------- reminders (fire while the app is open) ----------
  const notified = new Set();
  function checkReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date(), t = today();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    activeHabits().forEach((h) => {
      const k = h.id + t;
      if (h.reminder === hhmm && S.isScheduled(h, t) && !h.completions.includes(t) && !notified.has(k)) {
        notified.add(k);
        new Notification(`${h.emoji} ${h.name}`, { body: `Keep your ${S.currentStreak(h, t)}-day streak going.`, icon: 'icon.svg' });
      }
    });
  }
  setInterval(checkReminders, 30000);

  // ---------- init ----------
  applyTheme(); load(); buildFormControls(); render();
  setInterval(render, 60000); // refresh greeting/day rollover
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
