-- Extensions
create extension if not exists pgcrypto;

-- Core reference tables
create table if not exists instruments (
  symbol text primary key,
  pip_size numeric(18,8) not null,
  digits int not null,
  contract_size int not null,
  base_ccy text not null,
  quote_ccy text not null,
  is_active boolean not null default true
);

create table if not exists timeframes (
  tf text primary key,
  seconds int not null
);

create table if not exists system_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  risk_per_trade numeric(10,6) not null default 0.005,
  max_total_risk numeric(10,6) not null default 0.015,
  max_open_trades int not null default 4,
  session_filter_enabled boolean not null default false,
  min_rr numeric(10,4) not null default 2.5,
  notify_email boolean not null default true,
  notify_telegram boolean not null default true,
  notify_push boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists account_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  equity numeric(18,2) not null,
  currency text not null,
  updated_at timestamptz not null default now()
);

-- Market data
create table if not exists bars_raw (
  symbol text not null references instruments(symbol),
  tf text not null references timeframes(tf),
  time timestamptz not null,
  open numeric(18,8) not null,
  high numeric(18,8) not null,
  low numeric(18,8) not null,
  close numeric(18,8) not null,
  volume numeric(18,2),
  source text not null,
  ingested_at timestamptz not null default now(),
  primary key (symbol, tf, time)
);

create table if not exists bars_clean (
  symbol text not null references instruments(symbol),
  tf text not null references timeframes(tf),
  time timestamptz not null,
  open numeric(18,8) not null,
  high numeric(18,8) not null,
  low numeric(18,8) not null,
  close numeric(18,8) not null,
  volume numeric(18,2),
  source text not null,
  quality_score int not null,
  validated_at timestamptz not null default now(),
  primary key (symbol, tf, time)
);

create table if not exists data_quality_events (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  tf text not null,
  time timestamptz,
  event_type text not null check (event_type in ('duplicate','gap','integrity_fail','outlier','late_bar')),
  severity text not null check (severity in ('info','warn','critical')),
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists data_quality_events_symbol_tf_created_at_idx on data_quality_events (symbol, tf, created_at desc);

-- Signal generation
create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  tf text not null,
  side text not null check (side in ('buy','sell')),
  setup text not null,
  entry_type text not null check (entry_type in ('market','limit','stop')),
  entry_price numeric(18,8) not null,
  stop_price numeric(18,8) not null,
  tp1_price numeric(18,8),
  tp2_price numeric(18,8),
  rr_expected numeric(10,4) not null,
  confidence numeric(6,4) not null default 1.0,
  bar_time timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists signals_created_at_idx on signals (created_at desc);
create index if not exists signals_symbol_tf_bar_time_idx on signals (symbol, tf, bar_time desc);

create table if not exists trade_intents (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references signals(id) on delete cascade,
  status text not null check (status in ('new','taken','skipped','expired','invalidated')),
  suggested_lots numeric(18,4) not null,
  suggested_entry numeric(18,8) not null,
  suggested_stop numeric(18,8) not null,
  suggested_tp1 numeric(18,8),
  suggested_tp2 numeric(18,8),
  risk_amount numeric(18,2) not null,
  stop_pips numeric(18,4) not null,
  created_at timestamptz not null default now()
);

create index if not exists trade_intents_status_created_at_idx on trade_intents (status, created_at desc);

-- Journaling
create table if not exists executed_trades (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references trade_intents(id) on delete cascade,
  filled_entry numeric(18,8) not null,
  filled_stop numeric(18,8) not null,
  lots numeric(18,4) not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  result_r numeric(10,4),
  pnl_amount numeric(18,2),
  notes text
);

create table if not exists open_positions (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  opened_at timestamptz not null,
  risk_amount numeric(18,2) not null,
  status text not null check (status in ('open','closed'))
);

-- Notifications
create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  dedupe_key text not null unique,
  payload jsonb not null,
  status text not null check (status in ('pending','partial','sent','failed')),
  created_at timestamptz not null default now()
);

create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references notification_events(id) on delete cascade,
  channel text not null check (channel in ('telegram','email','push')),
  status text not null check (status in ('sent','failed')),
  attempts int not null default 0,
  provider_message_id text,
  last_error text,
  sent_at timestamptz
);

create index if not exists notification_deliveries_event_channel_idx on notification_deliveries (event_id, channel);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Operations
create table if not exists job_runs (
  id uuid primary key default gen_random_uuid(),
  function_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_processed int not null default 0,
  error_summary text,
  credits_used int not null default 0
);

create table if not exists job_state (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Correlation grouping
create table if not exists correlation_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists correlation_members (
  group_id uuid not null references correlation_groups(id) on delete cascade,
  symbol text not null references instruments(symbol) on delete cascade,
  primary key (group_id, symbol)
);

-- RLS
alter table system_settings enable row level security;
alter table account_state enable row level security;
alter table trade_intents enable row level security;
alter table executed_trades enable row level security;
alter table push_subscriptions enable row level security;

-- Policies
create policy "read_settings" on system_settings
  for select using (auth.role() = 'authenticated');

create policy "manage_settings" on system_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read_account_state" on account_state
  for select using (auth.role() = 'authenticated');

create policy "manage_account_state" on account_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read_trade_intents" on trade_intents
  for select using (auth.role() = 'authenticated');

create policy "read_executed_trades" on executed_trades
  for select using (auth.role() = 'authenticated');

create policy "manage_push_subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed data
insert into timeframes (tf, seconds) values
  ('H1', 3600),
  ('H4', 14400)
  on conflict do nothing;

insert into instruments (symbol, pip_size, digits, contract_size, base_ccy, quote_ccy) values
  ('EURUSD', 0.0001, 5, 100000, 'EUR', 'USD'),
  ('GBPUSD', 0.0001, 5, 100000, 'GBP', 'USD'),
  ('USDJPY', 0.01, 3, 100000, 'USD', 'JPY'),
  ('EURJPY', 0.01, 3, 100000, 'EUR', 'JPY'),
  ('GBPJPY', 0.01, 3, 100000, 'GBP', 'JPY'),
  ('AUDUSD', 0.0001, 5, 100000, 'AUD', 'USD')
  on conflict do nothing;

insert into correlation_groups (name) values
  ('USD_MAJORS'),
  ('JPY_CROSSES')
  on conflict do nothing;

insert into correlation_members (group_id, symbol)
select cg.id, s.symbol
from correlation_groups cg
join (values
  ('USD_MAJORS','EURUSD'),
  ('USD_MAJORS','GBPUSD'),
  ('USD_MAJORS','AUDUSD'),
  ('JPY_CROSSES','USDJPY'),
  ('JPY_CROSSES','EURJPY'),
  ('JPY_CROSSES','GBPJPY')
) as s(group_name, symbol) on s.group_name = cg.name
on conflict do nothing;
