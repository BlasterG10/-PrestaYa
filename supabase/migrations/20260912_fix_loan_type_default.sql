alter table public.loans alter column loan_type set default 'personal';

create or replace function public.set_loan_defaults()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.loan_type is null or btrim(new.loan_type) = '' then new.loan_type := 'personal'; end if;
  if new.frequency is null or btrim(new.frequency) = '' then new.frequency := 'weekly'; end if;
  if new.term_weeks is null or new.term_weeks < 1 then new.term_weeks := 1; end if;
  if new.interest_rate is null or new.interest_rate < 0 then new.interest_rate := 0; end if;
  if new.total_due is null or new.total_due < 0 then new.total_due := round(new.principal * (1 + new.interest_rate / 100), 2); end if;
  return new;
end;
$$;

drop trigger if exists set_loan_defaults_before_insert on public.loans;
create trigger set_loan_defaults_before_insert before insert on public.loans for each row execute function public.set_loan_defaults();
