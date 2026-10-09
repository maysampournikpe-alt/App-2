-- Students under 13 use Rumbo as guests only (no account, no email), so the parent-consent
-- flow is not needed. Remove its table, column, and guard.
drop trigger if exists profiles_guard_consent on public.profiles;
drop function if exists public.guard_consent_status();
drop table if exists public.parent_consents;
alter table public.profiles drop column if exists consent_status;
