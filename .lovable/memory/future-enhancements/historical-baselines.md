---
name: Historical baselines (PARKED)
description: 30-day rolling averages for genuine "is this elevated?" context across panels
type: feature
---

Status: **PARKED** — revisit when ready for the backend lift.

## Goal

Compare current metrics to 30-day rolling averages so panels can show genuine "is this elevated?" context (not just raw numbers).

## Scope

- GDELT conflict article volume — per-week baseline
- GDACS disaster count — per-week baseline
- National US alerts volume — per-day baseline
- Space weather Kp events — per-week baseline

## Implementation sketch

Each edge function maintains a rolling 30-day array of daily counts, persisted (likely a small Supabase table per source). On each fetch:

1. Append today's count to the rolling array.
2. Trim entries older than 30 days.
3. Compute `avg` of the array.
4. Return `baseline_30d: { avg, current_vs_avg }` alongside live data.

Client displays "Nx above/below avg" or a trend arrow next to the headline number.

## Why parked

Requires backend storage + a daily aggregation cron. Out of scope for the current display-only quality pass.
