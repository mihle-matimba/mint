create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_bank_account_id uuid references public.linked_bank_accounts(id) on delete set null,
  amount numeric(18, 2) not null,
  direction text not null check (direction in ('credit', 'debit')),
  currency text not null default 'ZAR',
  name text not null,
  description text,
  category text,
  status text not null default 'posted' check (status in ('pending', 'posted', 'failed', 'reversed')),
  merchant_name text,
  external_reference text,
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_date_idx on public.transactions (transaction_date desc);

create table if not exists public.mint_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null default 'ZAR',
  investment_balance numeric(18, 2) not null default 0,
  credit_limit numeric(18, 2) not null default 0,
  total_balance numeric(18, 2) generated always as (investment_balance + credit_limit) stored,
  snapshot_date date not null default current_date,
  daily_change numeric(18, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create index if not exists mint_balances_user_id_idx on public.mint_balances (user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'system',
  read_at timestamptz,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  source text,
  headline text not null,
  summary text,
  url text not null,
  image_url text,
  published_at timestamptz not null,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  risk_level text,
  time_horizon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  asset_class text,
  security_id uuid references public.security_universe(id) on delete set null,
  target_weight numeric(8, 4),
  actual_weight numeric(8, 4),
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists allocations_user_id_idx on public.allocations (user_id);

create table if not exists public.strategy_metrics (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies(id) on delete cascade,
  as_of_date date not null,
  return_1m numeric(8, 4),
  return_1y numeric(8, 4),
  volatility numeric(8, 4),
  sharpe_ratio numeric(8, 4),
  max_drawdown numeric(8, 4),
  created_at timestamptz not null default now(),
  unique (strategy_id, as_of_date)
);

create table if not exists public.allocation_metrics (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.allocations(id) on delete cascade,
  as_of_date date not null,
  current_weight numeric(8, 4),
  drift numeric(8, 4),
  contribution_to_return numeric(8, 4),
  created_at timestamptz not null default now(),
  unique (allocation_id, as_of_date)
);

create table if not exists public.security_universe (
  id uuid primary key default gen_random_uuid(),
  ticker text,
  isin text,
  name text not null,
  exchange text,
  currency text,
  security_type text,
  sector text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  security_id uuid not null references public.security_universe(id) on delete cascade,
  quantity numeric(18, 6) not null default 0,
  average_cost numeric(18, 4),
  market_value numeric(18, 4),
  unrealized_pnl numeric(18, 4),
  as_of_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, security_id, as_of_date)
);

create index if not exists stock_holdings_user_id_idx on public.stock_holdings (user_id);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  avatar_url text,
  phone_number text,
  date_of_birth date,
  gender text,
  address text,
  biometrics_enabled boolean not null default false,
  notifications_enabled boolean not null default true,
  preferred_currency text default 'ZAR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.required_actions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kyc_verified boolean not null default false,
  bank_linked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points_balance numeric(18, 2) not null default 0,
  points_delta numeric(18, 2) not null default 0,
  transaction_type text not null check (transaction_type in ('earned', 'redeemed', 'expired', 'adjustment')),
  source text,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'reversed')),
  created_at timestamptz not null default now()
);

create index if not exists rewards_user_id_idx on public.rewards (user_id);

create table if not exists public.linked_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  branch_code text,
  account_holder text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'failed')),
  verification_provider text,
  verified_at timestamptz,
  is_default_payout boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists linked_bank_accounts_user_id_idx on public.linked_bank_accounts (user_id);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  amount numeric(18, 2) not null,
  currency text not null default 'ZAR',
  status text not null default 'active' check (status in ('active', 'inactive', 'canceled', 'past_due')),
  current_period_start date,
  current_period_end date,
  next_due date,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

create table if not exists public.paystack_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null,
  amount numeric(18, 2) not null,
  currency text not null default 'ZAR',
  status text not null,
  paid_at timestamptz,
  channel text,
  fees numeric(18, 2),
  authorization_code text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paystack_transactions_user_id_idx on public.paystack_transactions (user_id);
