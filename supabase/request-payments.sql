-- Request prices for the admin dashboard ("how much have I made").
-- Additive only. Deliberately NOT a column on public.requests: that table has a public
-- SELECT policy ("Allow request confirmation"), so a price column there would be readable by every visitor.
-- This table is readable and writable by the admin account only.

create table if not exists public.request_payments (
  request_id bigint primary key references public.requests(id) on delete cascade,
  amount     numeric(10,2) not null check (amount >= 0),
  updated_at timestamptz not null default now()
);

alter table public.request_payments enable row level security;

revoke all on public.request_payments from anon, authenticated;
grant select, insert, update, delete on public.request_payments to authenticated;

create policy "Admin manages request payments"
  on public.request_payments
  for all
  to authenticated
  using      (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com');
