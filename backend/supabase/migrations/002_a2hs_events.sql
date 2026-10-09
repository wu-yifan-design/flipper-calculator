-- Allow Add-to-Home-Screen events in public.events (run once in the Supabase SQL editor).
-- Then add the 4 names to SITE_CONFIG.analytics.serverEvents in js/site-config.js.
alter table public.events drop constraint if exists events_event_check;
alter table public.events add constraint events_event_check check (event in (
  'page_visit','calculated','email_submitted','preorder_click',
  'a2hs_shown','a2hs_install_click','a2hs_dismissed','app_installed'
));
