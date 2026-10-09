create table if not exists public.events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event text not null check (event in ('page_visit','calculated','email_submitted','preorder_click',
                                           'a2hs_shown','a2hs_install_click','a2hs_dismissed','app_installed')),
  visitor_id text,
  source text,
  first_source text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  referrer_host text,
  page text,
  props jsonb
);
create table if not exists public.emails (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  email text not null check (position('@' in email) > 1 and length(email) < 255),
  visitor_id text,
  source text,
  product text
);
alter table public.events enable row level security;
alter table public.emails enable row level security;
drop policy if exists anon_insert_events on public.events;
create policy anon_insert_events on public.events for insert to anon with check (true);
drop policy if exists anon_insert_emails on public.emails;
create policy anon_insert_emails on public.emails for insert to anon with check (true);

create table if not exists public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;
insert into public.app_secrets(name, value) values ('read_key', '<SET_A_LONG_RANDOM_KEY_HERE>')
  on conflict (name) do update set value = excluded.value;

create or replace function public.daily_metrics(p_key text, p_days int default 14)
returns table(day date, source text, event text, events bigint, visitors bigint)
language plpgsql security definer set search_path = public as $$
begin
  if p_key is distinct from (select value from app_secrets where name='read_key') then
    raise exception 'unauthorized';
  end if;
  return query
    select (e.created_at at time zone 'Asia/Shanghai')::date, coalesce(e.source,'direct'), e.event,
           count(*), count(distinct e.visitor_id)
    from events e
    where e.created_at > now() - make_interval(days => p_days)
    group by 1,2,3 order by 1,2,3;
end $$;
revoke all on function public.daily_metrics(text,int) from public;
grant execute on function public.daily_metrics(text,int) to anon;
