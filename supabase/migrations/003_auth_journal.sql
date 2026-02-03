-- Add user ownership for executed trades
alter table executed_trades add column if not exists user_id uuid;

-- Replace policies
drop policy if exists "read_executed_trades" on executed_trades;

create policy "read_executed_trades" on executed_trades
  for select using (auth.uid() = user_id);

create policy "manage_executed_trades" on executed_trades
  for insert with check (auth.uid() = user_id);

create policy "update_executed_trades" on executed_trades
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
