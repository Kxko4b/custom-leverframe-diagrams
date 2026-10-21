-- Applied to production. Documents the briefing schedule (the cron commands contain a secret and are NOT stored here).
-- All times are UTC. Berlin is UTC+2 in summer time and UTC+1 in winter time, so they shift by an hour on the clock change.
--   briefing-full      05:00 Mon-Fri  (07:00 Berlin in summer)  full briefing; pushed once per day (same text is never sent twice)
--   untis-watch        every 10 min, 04:00-05:50 Mon-Fri (06:00-07:50 Berlin)  ?mode=untis-watch: checks only WebUntis and pushes a short
--                                                              "TIMETABLE CHANGE" notice only when a lesson was cancelled / substituted.
--                                                              Nothing changed = nothing sent, nothing stored.
--   briefing-retention Sundays 03:15                            delete stored briefings older than 90 days (events go with them)
-- The dashboard "Let the AI try again" button re-runs the first job whose name starts with 'briefing-' (= briefing-full).
select cron.schedule('briefing-retention', '15 3 * * 0', $$delete from public.briefing_runs where run_at < now() - interval '90 days'$$);
