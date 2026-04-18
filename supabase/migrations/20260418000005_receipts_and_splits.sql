-- CRAVE: receipt pipeline tables per docs/supabase.md §6.6

create table public.receipt_captures (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  image_s3_url text not null,
  ocr_raw jsonb,
  merchant_matched_restaurant_id uuid references public.restaurants (id),
  subtotal_cents integer,
  tax_cents integer,
  total_cents integer,
  status public.receipt_capture_status not null default 'uploaded',
  s3_etag text,
  created_at timestamptz not null default now()
);

-- Idempotent OCR processing when S3 retries the same object version.
create unique index receipt_captures_s3_etag_unique
  on public.receipt_captures (s3_etag)
  where s3_etag is not null;

create table public.receipt_line_items (
  id uuid primary key default gen_random_uuid (),
  receipt_id uuid not null references public.receipt_captures (id) on delete cascade,
  raw_text text not null,
  raw_price_cents integer not null,
  quantity numeric(10, 2) not null default 1,
  matched_menu_item_id uuid references public.menu_items (id),
  match_confidence double precision,
  match_method public.match_method,
  assigned_to_user_id uuid references public.users (id)
);

create index receipt_line_items_receipt on public.receipt_line_items (receipt_id);

create table public.bill_splits (
  id uuid primary key default gen_random_uuid (),
  receipt_id uuid not null references public.receipt_captures (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  subtotal_cents integer not null,
  tax_share_cents integer not null,
  tip_share_cents integer not null,
  total_cents integer not null,
  payment_link text,
  payment_method public.payment_method not null,
  marked_paid boolean not null default false,
  created_at timestamptz not null default now()
);
