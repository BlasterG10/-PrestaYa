create extension if not exists pgcrypto;

create type public.app_role as enum ('customer','collector','supervisor','admin');
create type public.loan_status as enum ('pending','approved','rejected','active','completed','defaulted','cancelled');
create type public.payment_method as enum ('cash','transfer','zelle','other');

create sequence public.customer_number_seq start 1000;
create sequence public.loan_number_seq start 10000;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 role public.app_role not null default 'customer',
 phone text,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.customers (
 id uuid primary key default gen_random_uuid(),
 customer_number bigint not null unique default nextval('public.customer_number_seq'),
 profile_id uuid unique references public.profiles(id) on delete set null,
 full_name text not null,
 identification_type text,
 identification_number text,
 phone text,
 address text,
 notes text,
 status text not null default 'active' check (status in ('active','inactive','blocked')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.loans (
 id uuid primary key default gen_random_uuid(),
 loan_number bigint not null unique default nextval('public.loan_number_seq'),
 customer_id uuid not null references public.customers(id) on delete restrict,
 loan_type text not null check (loan_type in ('micro','flash')),
 principal numeric(14,2) not null check (principal > 0 and principal <= 10000),
 interest_rate numeric(8,5) not null check (interest_rate >= 0),
 total_due numeric(14,2) not null check (total_due >= principal),
 term_weeks integer not null check (term_weeks between 4 and 12),
 frequency text not null check (frequency in ('daily','weekly')),
 guarantee text,
 status public.loan_status not null default 'pending',
 requested_by uuid references public.profiles(id) on delete set null,
 approved_by uuid references public.profiles(id) on delete set null,
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.installments (
 id uuid primary key default gen_random_uuid(),
 loan_id uuid not null references public.loans(id) on delete cascade,
 installment_number integer not null check (installment_number > 0),
 due_date date not null,
 amount_due numeric(14,2) not null check (amount_due >= 0),
 amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
 status text not null default 'pending' check (status in ('pending','partial','paid','late')),
 created_at timestamptz not null default now(),
 unique (loan_id, installment_number)
);

create table public.payments (
 id uuid primary key default gen_random_uuid(),
 receipt_number text not null unique,
 loan_id uuid not null references public.loans(id) on delete restrict,
 installment_id uuid references public.installments(id) on delete set null,
 amount numeric(14,2) not null check (amount > 0),
 method public.payment_method not null,
 paid_at timestamptz not null default now(),
 registered_by uuid references public.profiles(id) on delete set null,
 notes text,
 created_at timestamptz not null default now()
);

create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.profiles(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id uuid,
 old_data jsonb,
 new_data jsonb,
 created_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path=public as $$
 select role from public.profiles where id=auth.uid() and active=true limit 1;
$$;
revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.loans enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated using (id=auth.uid());
create policy profiles_admin_manage on public.profiles for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');

create policy customers_staff_read on public.customers for select to authenticated using (public.current_app_role() in ('collector','supervisor','admin'));
create policy customers_self_read on public.customers for select to authenticated using (profile_id=auth.uid());
create policy customers_staff_insert on public.customers for insert to authenticated with check (public.current_app_role() in ('collector','supervisor','admin'));
create policy customers_staff_update on public.customers for update to authenticated using (public.current_app_role() in ('collector','supervisor','admin')) with check (public.current_app_role() in ('collector','supervisor','admin'));

create policy loans_staff_read on public.loans for select to authenticated using (public.current_app_role() in ('collector','supervisor','admin'));
create policy loans_customer_read on public.loans for select to authenticated using (exists(select 1 from public.customers c where c.id=customer_id and c.profile_id=auth.uid()));
create policy loans_staff_insert on public.loans for insert to authenticated with check (public.current_app_role() in ('collector','supervisor','admin') and requested_by=auth.uid());
create policy loans_staff_update on public.loans for update to authenticated using (public.current_app_role() in ('supervisor','admin')) with check (public.current_app_role() in ('supervisor','admin'));

create policy installments_staff_read on public.installments for select to authenticated using (public.current_app_role() in ('collector','supervisor','admin'));
create policy installments_customer_read on public.installments for select to authenticated using (exists(select 1 from public.loans l join public.customers c on c.id=l.customer_id where l.id=loan_id and c.profile_id=auth.uid()));
create policy installments_staff_manage on public.installments for all to authenticated using (public.current_app_role() in ('supervisor','admin')) with check (public.current_app_role() in ('supervisor','admin'));

create policy payments_staff_read on public.payments for select to authenticated using (public.current_app_role() in ('collector','supervisor','admin'));
create policy payments_customer_read on public.payments for select to authenticated using (exists(select 1 from public.loans l join public.customers c on c.id=l.customer_id where l.id=loan_id and c.profile_id=auth.uid()));
create policy payments_staff_insert on public.payments for insert to authenticated with check (public.current_app_role() in ('collector','supervisor','admin') and registered_by=auth.uid() and exists(select 1 from public.loans l where l.id=loan_id and l.status in ('approved','active')));

create policy audit_staff_read on public.audit_logs for select to authenticated using (public.current_app_role() in ('supervisor','admin'));
create policy audit_insert_authenticated on public.audit_logs for insert to authenticated with check (actor_id=auth.uid());

create index customers_customer_number_idx on public.customers(customer_number);
create index customers_identification_idx on public.customers(identification_number);
create index loans_loan_number_idx on public.loans(loan_number);
create index loans_customer_idx on public.loans(customer_id);
create index loans_status_idx on public.loans(status);
create index payments_loan_idx on public.payments(loan_id);
create index payments_paid_at_idx on public.payments(paid_at);
create index audit_entity_idx on public.audit_logs(entity_type,entity_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger loans_updated_at before update on public.loans for each row execute function public.set_updated_at();
