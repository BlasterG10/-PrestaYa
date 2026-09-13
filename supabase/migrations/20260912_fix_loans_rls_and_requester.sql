-- Ensure every new loan is attributed to the authenticated user before RLS evaluates it.
create or replace function public.set_loan_requester()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.requested_by is null then
    new.requested_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists loans_set_requester on public.loans;
create trigger loans_set_requester
before insert on public.loans
for each row execute function public.set_loan_requester();

drop policy if exists loans_staff_insert on public.loans;
drop policy if exists loans_customer_insert on public.loans;

create policy loans_staff_insert on public.loans
for insert to authenticated
with check (
  public.current_app_role() in ('collector','supervisor','admin')
  and requested_by = auth.uid()
);

create policy loans_customer_insert on public.loans
for insert to authenticated
with check (
  public.current_app_role() = 'customer'
  and requested_by = auth.uid()
  and exists (
    select 1 from public.customers c
    where c.id = customer_id
      and c.profile_id = auth.uid()
      and c.status = 'active'
  )
);

create index if not exists customers_profile_id_idx on public.customers(profile_id);
create index if not exists installments_loan_id_idx on public.installments(loan_id);
