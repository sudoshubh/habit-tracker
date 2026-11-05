# Streaks — Habit Tracker

A simple, private habit tracker. Add habits, tick them off daily, build streaks, and note why you missed a day.

- **Live app:** https://sudoshubh.github.io/habit-tracker/
- **Install on phone:** open the link, then *Add to Home screen* (Chrome menu) or *Share → Add to Home Screen* (iOS Safari).
- **Your data** is stored only in your browser on that device (no account, no server). Each device has its own list.
- **Back up / move data:** menu `⋯` → Export JSON, then Import JSON on the other device.

## Develop
Plain HTML/CSS/JS, no build step.

```bash
python -m http.server 8765   # then open http://localhost:8765
node streak.test.js          # streak logic tests
```

When changing files, bump `CACHE` in `sw.js` so installed copies refresh.
