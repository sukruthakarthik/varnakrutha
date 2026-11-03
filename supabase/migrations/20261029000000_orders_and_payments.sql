-- Orders and payments. The site's mode is set by NEXT_PUBLIC_PAYMENTS_MODE (off | manual | razorpay);
-- this schema serves both payment modes. See docs/PAYMENTS.md.
--
-- Amounts are stored in paise (whole numbers). Orders are created and updated only by trusted server
-- code using the service role, after its own checks; the policies below just let signed-in admins
-- and artists read what they're allowed to.

-- ─── Artwork and artist settings ────────────────────────────────────
alter table public.artworks
  add column shipping_fee numeric(12, 2) check (shipping_fee >= 0);

alter table public.artists
  -- Overrides COMMISSION_RATE_BPS for this artist, e.g. 1000 = 10%. Set in the Table Editor.
  add column commission_rate_bps int check (commission_rate_bps between 0 and 5000),
  -- Razorpay Route linked account (acc_...). When set, buyers pay the full price online and the
  -- artist's share is transferred on hold; otherwise buyers reserve with a commission deposit.
  add column razorpay_account_id text check (razorpay_account_id ~ '^acc_[A-Za-z0-9]+$');

-- ─── Orders ─────────────────────────────────────────────────────────
create type public.order_status as enum (
  'pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded', 'expired', 'failed'
);
-- "full": the buyer pays price + shipping now. "deposit": the buyer pays the platform's commission
-- to reserve the work and pays the balance to the artist after being introduced.
create type public.order_kind as enum ('full', 'deposit');
create type public.order_method as enum ('upi_manual', 'razorpay', 'offline');

create sequence public.order_reference_seq start 1001;

create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique default ('VK-' || nextval('public.order_reference_seq')::text),
  -- Lets the buyer open their order page without an account; compared on the server only.
  access_token         text not null,
  artwork_id           uuid references public.artworks (id) on delete set null,
  artist_id            uuid not null references public.artists (id) on delete restrict,
  artwork_title        text not null,
  kind                 public.order_kind not null,
  method               public.order_method not null,
  status               public.order_status not null default 'pending',
  buyer_name           text not null check (char_length(buyer_name) between 2 and 100),
  buyer_email          text not null check (char_length(buyer_email) <= 200),
  buyer_phone          text not null check (char_length(buyer_phone) <= 30),
  shipping_address     text not null check (char_length(shipping_address) <= 600),
  price_paise          bigint not null check (price_paise >= 0),
  shipping_paise       bigint not null default 0 check (shipping_paise >= 0),
  -- What the buyer pays through Varnakrutha for this order.
  amount_paise         bigint not null check (amount_paise >= 0),
  commission_bps       int not null check (commission_bps between 0 and 5000),
  commission_paise     bigint not null check (commission_paise >= 0),
  -- The artist's part of price + shipping (paid by the buyer directly for deposits; transferred for full Route orders).
  artist_share_paise   bigint not null check (artist_share_paise >= 0),
  payment_reference    text check (char_length(payment_reference) <= 120),
  razorpay_order_id    text unique,
  razorpay_transfer_id text,
  tracking             text check (char_length(tracking) <= 200),
  admin_note           text check (char_length(admin_note) <= 2000),
  expires_at           timestamptz,
  paid_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_artist_idx on public.orders (artist_id, created_at desc);

-- One live order per artwork: two buyers can't pay for the same painting.
create unique index orders_one_active_per_artwork on public.orders (artwork_id)
  where status in ('pending', 'paid', 'shipped') and artwork_id is not null;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Append-only history for disputes and audits.
create table public.order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  type       text not null check (char_length(type) <= 60),
  detail     text check (char_length(detail) <= 1000),
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- Razorpay webhook event ids already handled, so retries are ignored.
create table public.payment_webhook_events (
  id          text primary key,
  received_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.payment_webhook_events enable row level security;

create policy "platform admins read orders" on public.orders
  for select using (public.is_platform_admin());
-- Artists see their own orders once paid; pending checkouts aren't theirs to see yet.
create policy "artists read own paid orders" on public.orders
  for select using (public.is_artist_admin(artist_id) and status not in ('pending', 'expired', 'failed'));
create policy "platform admins read order events" on public.order_events
  for select using (public.is_platform_admin());
-- payment_webhook_events: no policies; only the service role uses it.
