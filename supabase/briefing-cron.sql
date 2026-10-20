-- Applied to production. Documents the briefing schedule (the cron command itself contains a secret and is NOT stored here).
-- Two clearly named checks instead of six identical jobs. The function pushes the same text only once per day,
-- so the second check only notifies the phone when something changed or the first push failed.
--   briefing-early    04:50 UTC, Mon-Fri  (06:50 Berlin in summer time, 05:50 in winter time)
--   briefing-recheck  05:30 UTC, Mon-Fri
--   briefing-retention Sundays 03:15 UTC: delete stored briefings older than 90 days (events go with them)
select cron.schedule('briefing-retention', '15 3 * * 0', $$delete from public.briefing_runs where run_at < now() - interval '90 days'$$);
