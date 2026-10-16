create extension if not exists pgcrypto with schema extensions;

create type public.agency_role as enum (
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'BOOKING_AGENT',
  'ACCOUNTS_OFFICER',
  'VISA_OFFICER'
);

create type public.booking_status as enum ('DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
create type public.package_status as enum ('DRAFT', 'ACTIVE', 'FULL', 'ARCHIVED');
create type public.visa_status as enum ('NOT_STARTED', 'DOCUMENTS_REQUIRED', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
create type public.payment_method as enum ('CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE', 'OTHER');
create type public.payment_status as enum ('PENDING', 'VERIFIED', 'FAILED', 'REFUNDED');
create type public.reservation_status as enum ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
create type public.ticket_status as enum ('NOT_TICKETED', 'RESERVED', 'TICKETED', 'CANCELLED');
create type public.refund_status as enum ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED');
create type public.invoice_status as enum ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.agency_role not null default 'BOOKING_AGENT',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (char_length(phone) between 6 and 30),
  email text,
  nationality text,
  address text,
  emergency_contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_email_unique on public.customers (lower(email)) where email is not null and email <> '';
create index customers_name_idx on public.customers using gin (to_tsvector('simple', full_name));
create index customers_phone_idx on public.customers (phone);

create table public.umrah_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(name) between 3 and 120),
  duration_days integer not null check (duration_days between 1 and 90),
  departure_date date not null,
  return_date date not null,
  makkah_hotel text,
  madinah_hotel text,
  room_type text,
  transport_details text,
  flight_details text,
  inclusions text,
  exclusions text,
  capacity integer not null check (capacity > 0),
  price_minor bigint not null check (price_minor >= 0),
  currency char(3) not null default 'PKR',
  status public.package_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_date > departure_date)
);
create index umrah_packages_departure_status_idx on public.umrah_packages (departure_date, status);
create index umrah_packages_name_idx on public.umrah_packages using gin (to_tsvector('simple', name));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  package_id uuid references public.umrah_packages(id) on delete restrict,
  departure_date date,
  return_date date,
  base_price_minor bigint not null check (base_price_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  additional_charges_minor bigint not null default 0 check (additional_charges_minor >= 0),
  total_payable_minor bigint not null check (total_payable_minor >= 0),
  currency char(3) not null default 'PKR',
  status public.booking_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_date is null or departure_date is null or return_date >= departure_date),
  check (total_payable_minor = base_price_minor - discount_minor + additional_charges_minor)
);
create index bookings_customer_created_idx on public.bookings (customer_id, created_at desc);
create index bookings_package_status_idx on public.bookings (package_id, status);
create index bookings_status_departure_idx on public.bookings (status, departure_date);

create table public.passengers (
  id uuid primary key default gen_random_uuid(),
  passport_name text not null,
  passport_number text not null,
  date_of_birth date not null,
  nationality text not null,
  passport_issue_date date,
  passport_expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index passengers_name_idx on public.passengers using gin (to_tsvector('simple', passport_name));
create index passengers_passport_expiry_idx on public.passengers (passport_expiry_date);

create table public.booking_passengers (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  passenger_id uuid not null references public.passengers(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (booking_id, passenger_id)
);
create index booking_passengers_passenger_idx on public.booking_passengers (passenger_id);

create table public.visa_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  passenger_id uuid not null references public.passengers(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  required_documents text not null default '',
  submitted_at date,
  status public.visa_status not null default 'NOT_STARTED',
  expiry_date date,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visa_applications_status_submitted_idx on public.visa_applications (status, submitted_at);
create index visa_applications_passenger_idx on public.visa_applications (passenger_id);
create index visa_applications_booking_idx on public.visa_applications (booking_id);

create table public.flights (
  id uuid primary key default gen_random_uuid(),
  airline text not null,
  flight_number text not null,
  departure_airport text not null,
  arrival_airport text not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  booking_id uuid references public.bookings(id) on delete restrict,
  passenger_id uuid references public.passengers(id) on delete restrict,
  pnr text,
  ticket_number text unique,
  ticket_status public.ticket_status not null default 'NOT_TICKETED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index flights_departure_idx on public.flights (departure_at);
create index flights_number_departure_idx on public.flights (flight_number, departure_at);
create index flights_booking_idx on public.flights (booking_id);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  services text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suppliers_name_idx on public.suppliers using gin (to_tsvector('simple', name));

create table public.hotel_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  hotel_name text not null,
  city text not null,
  room_type text not null,
  check_in date not null,
  check_out date not null,
  room_quantity integer not null check (room_quantity > 0),
  confirmation text,
  cost_minor bigint not null check (cost_minor >= 0),
  selling_minor bigint not null check (selling_minor >= 0),
  currency char(3) not null default 'PKR',
  status public.reservation_status not null default 'REQUESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index hotel_reservations_booking_idx on public.hotel_reservations (booking_id);
create index hotel_reservations_supplier_idx on public.hotel_reservations (supplier_id);
create index hotel_reservations_dates_idx on public.hotel_reservations (check_in, check_out);

create table public.transport_arrangements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  vehicle text not null,
  pickup text not null,
  destination text not null,
  travel_at timestamptz not null,
  passenger_count integer not null check (passenger_count > 0),
  cost_minor bigint not null check (cost_minor >= 0),
  selling_minor bigint not null check (selling_minor >= 0),
  currency char(3) not null default 'PKR',
  status public.reservation_status not null default 'REQUESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transport_booking_idx on public.transport_arrangements (booking_id);
create index transport_supplier_idx on public.transport_arrangements (supplier_id);
create index transport_travel_at_idx on public.transport_arrangements (travel_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'PKR',
  method public.payment_method not null,
  status public.payment_status not null default 'PENDING',
  reference text unique,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'VERIFIED') = (verified_at is not null))
);
create index payments_booking_status_idx on public.payments (booking_id, status);
create index payments_verified_at_idx on public.payments (verified_at);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete set null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'PKR',
  reason text not null,
  status public.refund_status not null default 'REQUESTED',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'PAID') = (paid_at is not null))
);
create index refunds_booking_status_idx on public.refunds (booking_id, status);

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'PKR',
  method public.payment_method not null,
  reference text,
  status public.payment_status not null default 'PENDING',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'VERIFIED') = (verified_at is not null))
);
create index supplier_payments_supplier_status_idx on public.supplier_payments (supplier_id, status);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'PKR',
  spent_at date not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text not null,
  attachment_path text,
  recorded_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_spent_category_idx on public.expenses (spent_at, category);
create index expenses_supplier_idx on public.expenses (supplier_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'PKR',
  issued_at date not null default current_date,
  due_at date,
  status public.invoice_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_booking_issued_idx on public.invoices (booking_id, issued_at);
create index invoices_status_due_idx on public.invoices (status, due_at);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid references public.passengers(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  document_type text not null check (document_type in ('passport', 'visa', 'other')),
  storage_path text not null unique,
  original_name text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  uploaded_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  check (passenger_id is not null or booking_id is not null)
);
create index documents_passenger_idx on public.documents (passenger_id);
create index documents_booking_idx on public.documents (booking_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('MISSING_DOCUMENT', 'UPCOMING_DEPARTURE', 'PASSPORT_EXPIRY', 'PENDING_VISA', 'OUTSTANDING_BALANCE', 'SYSTEM')),
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  due_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_unread_idx on public.notifications (recipient_id, read_at, created_at desc);
create index notifications_type_due_idx on public.notifications (type, due_at);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index activity_logs_entity_created_idx on public.activity_logs (entity_type, entity_id, created_at desc);
create index activity_logs_actor_created_idx on public.activity_logs (actor_id, created_at desc);

create table public.agency_settings (
  id boolean primary key default true check (id),
  agency_name text not null default 'Your Umrah Agency',
  email text,
  phone text,
  address text,
  logo_path text,
  default_currency char(3) not null default 'PKR',
  booking_number_prefix text not null default 'BKG',
  invoice_number_prefix text not null default 'INV',
  notification_settings jsonb not null default '{}'::jsonb,
  document_templates jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.agency_settings (id) values (true) on conflict (id) do nothing;

create or replace function public.current_agency_role()
returns public.agency_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.active = true
$$;

create or replace function public.has_any_agency_role(allowed_roles public.agency_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_agency_role() = any(allowed_roles), false)
$$;

create or replace function public.can_access(resource text, action text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r public.agency_role := public.current_agency_role();
begin
  if r is null then return false; end if;
  if r in ('SUPER_ADMIN', 'ADMIN') then return true; end if;
  if r = 'MANAGER' then
    return resource <> 'staff'
      and not (action = 'delete' and resource = any(array['payments','refunds','supplier_payments','expenses','invoices']));
  end if;
  if r = 'BOOKING_AGENT' then
    return resource = any(array['customers','packages','bookings','passengers','documents','flights','hotels','transport','suppliers','notifications'])
      or (resource = 'visas' and action = 'read');
  end if;
  if r = 'VISA_OFFICER' then
    return resource = any(array['visas','documents','notifications'])
      or (resource = any(array['bookings','passengers']) and action = 'read');
  end if;
  if r = 'ACCOUNTS_OFFICER' then
    return (resource = any(array['payments','refunds','supplier_payments','expenses','invoices','notifications'])
        and action <> 'delete')
      or resource = 'reports'
      or (resource = any(array['customers','bookings','suppliers']) and action = 'read');
  end if;
  return false;
end;
$$;

create or replace function public.prevent_unverified_online_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated'
     and new.method = 'ONLINE'
     and new.status = 'VERIFIED'
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.verified_at is distinct from new.verified_at) then
    raise exception 'Online payments require trusted provider verification.';
  end if;
  return new;
end;
$$;

create or replace function public.write_activity_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  record_id text;
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
    record_id := row_data ->> 'id';
  else
    row_data := to_jsonb(new);
    record_id := row_data ->> 'id';
  end if;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), lower(tg_table_name || '.' || tg_op), tg_table_name, coalesce(record_id, 'agency-settings'));

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
  resource_name text;
  rls_tables text[] := array[
    'customers','umrah_packages','bookings','passengers','booking_passengers',
    'visa_applications','flights','suppliers','hotel_reservations',
    'transport_arrangements','payments','refunds','supplier_payments','expenses',
    'invoices','documents','notifications','agency_settings'
  ];
begin
  foreach table_name in array rls_tables loop
    resource_name := case table_name
      when 'umrah_packages' then 'packages'
      when 'hotel_reservations' then 'hotels'
      when 'transport_arrangements' then 'transport'
      when 'documents' then 'documents'
      when 'booking_passengers' then 'bookings'
      when 'agency_settings' then 'settings'
      else table_name
    end;

    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_access(%L, %L))',
      table_name || '_read', table_name, resource_name, 'read'
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_access(%L, %L))',
      table_name || '_insert', table_name, resource_name, 'create'
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_access(%L, %L)) with check (public.can_access(%L, %L))',
      table_name || '_update', table_name, resource_name, 'update', resource_name, 'update'
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_access(%L, %L))',
      table_name || '_delete', table_name, resource_name, 'delete'
    );
    if table_name not in ('booking_passengers', 'notifications', 'documents') then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        table_name || '_set_updated_at', table_name
      );
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.write_activity_log()',
        table_name || '_audit', table_name
      );
    end if;
  end loop;
end;
$$;

alter table public.profiles enable row level security;
create policy profiles_read_self_or_admin on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or public.has_any_agency_role(array['SUPER_ADMIN','ADMIN']::public.agency_role[])
);
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.activity_logs enable row level security;
create policy activity_logs_read_admin on public.activity_logs
for select to authenticated
using (public.has_any_agency_role(array['SUPER_ADMIN','ADMIN','MANAGER']::public.agency_role[]));

create trigger payments_prevent_unverified_online
before insert or update on public.payments
for each row execute function public.prevent_unverified_online_payment();
create trigger supplier_payments_prevent_unverified_online
before insert or update on public.supplier_payments
for each row execute function public.prevent_unverified_online_payment();

create or replace function public.dashboard_finance_summary(target_currency text)
returns table (
  verified_payment_minor numeric,
  paid_refund_minor numeric,
  expenses_minor numeric,
  payable_minor numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce((select sum(p.amount_minor) from public.payments p
      where p.currency = target_currency and p.status = 'VERIFIED'), 0),
    coalesce((select sum(r.amount_minor) from public.refunds r
      where r.currency = target_currency and r.status = 'PAID'), 0),
    coalesce((select sum(e.amount_minor) from public.expenses e
      where e.currency = target_currency), 0),
    coalesce((select sum(b.total_payable_minor) from public.bookings b
      where b.currency = target_currency and b.status <> 'CANCELLED'), 0);
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'passenger-private',
  'passenger-private',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy passenger_documents_read on storage.objects
for select to authenticated
using (
  bucket_id = 'passenger-private'
  and (
    public.can_access('passengers', 'read')
    or public.can_access('visas', 'read')
  )
);
create policy passenger_documents_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'passenger-private'
  and (
    public.can_access('passengers', 'create')
    or public.can_access('visas', 'create')
  )
);
create policy passenger_documents_update on storage.objects
for update to authenticated
using (
  bucket_id = 'passenger-private'
  and (
    public.can_access('passengers', 'update')
    or public.can_access('visas', 'update')
  )
)
with check (
  bucket_id = 'passenger-private'
  and (
    public.can_access('passengers', 'update')
    or public.can_access('visas', 'update')
  )
);
create policy passenger_documents_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'passenger-private'
  and (
    public.can_access('passengers', 'delete')
    or public.can_access('visas', 'delete')
  )
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.profiles, public.agency_settings to authenticated;
grant execute on function public.current_agency_role() to authenticated;
grant execute on function public.has_any_agency_role(public.agency_role[]) to authenticated;
grant execute on function public.can_access(text, text) to authenticated;
grant execute on function public.dashboard_finance_summary(text) to authenticated;
