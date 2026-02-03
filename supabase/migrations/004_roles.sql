-- Role model
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'trader' check (role in ('admin','trader','viewer')),
  created_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "read_own_profile" on user_profiles
  for select using (auth.uid() = id);

-- Ensure profiles exist on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, role)
  values (new.id, 'trader')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
