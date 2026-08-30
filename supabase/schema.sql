-- =====================================
-- Our Tiny Home - Supabase schema + RLS
-- =====================================

create extension if not exists pgcrypto;

-- ---------------------
-- Tables
-- ---------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Partner',
  avatar jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Home',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  code text not null unique,
  created_by uuid references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.house_worlds (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null unique references public.couples(id) on delete cascade,
  layout_id text not null default 'cozy_house',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.furniture (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.house_worlds(id) on delete cascade,
  type text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  rotation integer not null default 0,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- ---------------------
-- Indexes
-- ---------------------

create index if not exists couple_members_user_idx
  on public.couple_members(user_id);

create index if not exists invitations_code_idx
  on public.invitations(code);

create index if not exists furniture_house_idx
  on public.furniture(house_id);

create index if not exists messages_couple_created_idx
  on public.messages(couple_id, created_at desc);

-- ---------------------
-- Updated at helper
-- ---------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_couples_updated_at on public.couples;
create trigger set_couples_updated_at
before update on public.couples
for each row
execute function public.set_updated_at();

drop trigger if exists set_house_worlds_updated_at on public.house_worlds;
create trigger set_house_worlds_updated_at
before update on public.house_worlds
for each row
execute function public.set_updated_at();

drop trigger if exists set_furniture_updated_at on public.furniture;
create trigger set_furniture_updated_at
before update on public.furniture
for each row
execute function public.set_updated_at();

-- ---------------------
-- Security definer helpers
-- ---------------------

create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members
    where couple_id = p_couple_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.shares_couple_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members me
    join public.couple_members partner
      on me.couple_id = partner.couple_id
    where me.user_id = auth.uid()
      and partner.user_id = p_user_id
  );
$$;

create or replace function public.is_house_member(p_house_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.house_worlds hw
    where hw.id = p_house_id
      and public.is_couple_member(hw.couple_id)
  );
$$;

-- ---------------------
-- Membership constraints
-- ---------------------

create or replace function public.enforce_single_couple_per_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.couple_members
    where user_id = new.user_id
      and couple_id <> new.couple_id
  ) then
    raise exception 'A user can belong to only one couple.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_couple_max_two()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.couple_members
    where couple_id = new.couple_id
  ) >= 2 then
    raise exception 'A couple can contain exactly two members.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_couple_members_single on public.couple_members;
create trigger trg_couple_members_single
before insert on public.couple_members
for each row
execute function public.enforce_single_couple_per_user();

drop trigger if exists trg_couple_members_max_two on public.couple_members;
create trigger trg_couple_members_max_two
before insert on public.couple_members
for each row
execute function public.enforce_couple_max_two();

-- ---------------------
-- Row Level Security
-- ---------------------

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.invitations enable row level security;
alter table public.house_worlds enable row level security;
alter table public.furniture enable row level security;
alter table public.messages enable row level security;

-- profiles

drop policy if exists profiles_select_own_or_partner on public.profiles;
create policy profiles_select_own_or_partner
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.shares_couple_with(id)
);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- couples

drop policy if exists couples_select_member on public.couples;
create policy couples_select_member
on public.couples
for select
to authenticated
using (public.is_couple_member(id));

drop policy if exists couples_update_member on public.couples;
create policy couples_update_member
on public.couples
for update
to authenticated
using (public.is_couple_member(id))
with check (public.is_couple_member(id));

-- couple_members

drop policy if exists couple_members_select_member on public.couple_members;
create policy couple_members_select_member
on public.couple_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_couple_member(couple_id)
);

drop policy if exists couple_members_delete_own on public.couple_members;
create policy couple_members_delete_own
on public.couple_members
for delete
to authenticated
using (user_id = auth.uid());

-- invitations

drop policy if exists invitations_select_member on public.invitations;
create policy invitations_select_member
on public.invitations
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists invitations_insert_member on public.invitations;
create policy invitations_insert_member
on public.invitations
for insert
to authenticated
with check (
  public.is_couple_member(couple_id)
  and created_by = auth.uid()
);

drop policy if exists invitations_delete_creator on public.invitations;
create policy invitations_delete_creator
on public.invitations
for delete
to authenticated
using (created_by = auth.uid());

-- house_worlds

drop policy if exists house_worlds_select_member on public.house_worlds;
create policy house_worlds_select_member
on public.house_worlds
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists house_worlds_update_member on public.house_worlds;
create policy house_worlds_update_member
on public.house_worlds
for update
to authenticated
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

-- furniture

drop policy if exists furniture_select_member on public.furniture;
create policy furniture_select_member
on public.furniture
for select
to authenticated
using (public.is_house_member(house_id));

drop policy if exists furniture_insert_member on public.furniture;
create policy furniture_insert_member
on public.furniture
for insert
to authenticated
with check (public.is_house_member(house_id));

drop policy if exists furniture_update_member on public.furniture;
create policy furniture_update_member
on public.furniture
for update
to authenticated
using (public.is_house_member(house_id))
with check (public.is_house_member(house_id));

drop policy if exists furniture_delete_member on public.furniture;
create policy furniture_delete_member
on public.furniture
for delete
to authenticated
using (public.is_house_member(house_id));

-- messages

drop policy if exists messages_select_member on public.messages;
create policy messages_select_member
on public.messages
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists messages_insert_member on public.messages;
create policy messages_insert_member
on public.messages
for insert
to authenticated
with check (
  public.is_couple_member(couple_id)
  and sender_id = auth.uid()
);

drop policy if exists messages_update_recipient on public.messages;
create policy messages_update_recipient
on public.messages
for update
to authenticated
using (
  public.is_couple_member(couple_id)
  and sender_id <> auth.uid()
)
with check (
  public.is_couple_member(couple_id)
  and sender_id <> auth.uid()
);

-- ---------------------
-- App RPCs
-- ---------------------

create or replace function public.create_couple(
  p_name text,
  p_layout_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  insert into public.couples(name)
  values (coalesce(nullif(trim(p_name), ''), 'Our Home'))
  returning id into v_couple_id;

  insert into public.couple_members(couple_id, user_id)
  values (v_couple_id, v_uid);

  insert into public.house_worlds(couple_id, layout_id)
  values (v_couple_id, coalesce(nullif(trim(p_layout_id), ''), 'cozy_house'));

  return v_couple_id;
end;
$$;

create or replace function public.create_invitation(p_couple_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  if not public.is_couple_member(p_couple_id) then
    raise exception 'Not authorized for this couple.';
  end if;

  loop
    v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    begin
      insert into public.invitations(couple_id, code, created_by)
      values (p_couple_id, v_code, v_uid);

      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return v_code;
end;
$$;

create or replace function public.join_couple_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invitation public.invitations%rowtype;
  v_member_count integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_invitation
  from public.invitations
  where lower(code) = lower(trim(p_code))
    and used_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Invitation is invalid or expired.';
  end if;

  if exists (
    select 1
    from public.couple_members
    where couple_id = v_invitation.couple_id
      and user_id = v_uid
  ) then
    return v_invitation.couple_id;
  end if;

  select count(*)
  into v_member_count
  from public.couple_members
  where couple_id = v_invitation.couple_id;

  if v_member_count >= 2 then
    raise exception 'This home already has two members.';
  end if;

  insert into public.couple_members(couple_id, user_id)
  values (v_invitation.couple_id, v_uid);

  update public.invitations
  set used_by = v_uid,
      used_at = now()
  where id = v_invitation.id;

  return v_invitation.couple_id;
end;
$$;

create or replace function public.get_my_couple()
returns table (
  couple_id uuid,
  couple_name text,
  partner_id uuid,
  house_id uuid,
  layout_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as couple_id,
    c.name as couple_name,
    (
      select cm2.user_id
      from public.couple_members cm2
      where cm2.couple_id = c.id
        and cm2.user_id <> auth.uid()
      limit 1
    ) as partner_id,
    hw.id as house_id,
    hw.layout_id
  from public.couple_members cm
  join public.couples c
    on c.id = cm.couple_id
  left join public.house_worlds hw
    on hw.couple_id = c.id
  where cm.user_id = auth.uid()
  limit 1;
$$;

-- ---------------------
-- Grants
-- ---------------------

grant usage on schema public to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, update on public.couples to authenticated;
grant select, delete on public.couple_members to authenticated;
grant select, insert, delete on public.invitations to authenticated;
grant select, update on public.house_worlds to authenticated;
grant select, insert, update, delete on public.furniture to authenticated;
grant select, insert, update on public.messages to authenticated;

grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.shares_couple_with(uuid) to authenticated;
grant execute on function public.is_house_member(uuid) to authenticated;
grant execute on function public.create_couple(text, text) to authenticated;
grant execute on function public.create_invitation(uuid) to authenticated;
grant execute on function public.join_couple_by_code(text) to authenticated;
grant execute on function public.get_my_couple() to authenticated;

-- ---------------------
-- Realtime publications
-- ---------------------

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'furniture'
    ) then
      alter publication supabase_realtime add table public.furniture;
    end if;
  end if;
end;
$$;