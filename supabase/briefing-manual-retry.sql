-- "Let the AI try to fix it" button on the admin dashboard.
-- Re-runs the stored daily-briefing cron command server-side, so the secret never reaches the browser.
-- The re-run is the normal self-check run: retries, safe text repairs, AI review. It cannot change keys, secrets or settings.
-- Only the admin account may call it, at most once every 3 minutes (each run sends a push notification).

create or replace function public.request_briefing_retry()
returns jsonb
language plpgsql
security definer
set search_path = public, cron, net, pg_temp
as $$
declare
  cmd text;
  last_manual timestamptz;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'haleannson@gmail.com' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select max(created_at) into last_manual from public.briefing_events where component = 'manual-retry';
  if last_manual is not null and last_manual > now() - interval '3 minutes' then
    return jsonb_build_object('started', false, 'reason', 'A retry was already started less than 3 minutes ago. Give it a moment.');
  end if;

  select command into cmd from cron.job where jobname = 'daily-briefing' limit 1;
  if cmd is null then
    return jsonb_build_object('started', false, 'reason', 'The scheduled briefing job was not found, so there is nothing to re-run.');
  end if;

  insert into public.briefing_events (run_id, kind, component, severity, outcome, found, action, details)
  values (null, 'repair', 'manual-retry', 'info', 'ok',
          'You asked for a manual retry from the dashboard.',
          'Re-ran the whole briefing (retries, safe text repairs, AI review). Nothing else was changed.',
          jsonb_build_object('approved_by', 'admin'));

  execute cmd;
  return jsonb_build_object('started', true);
end;
$$;

revoke all on function public.request_briefing_retry() from public, anon;
grant execute on function public.request_briefing_retry() to authenticated;
