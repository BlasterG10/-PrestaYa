-- Keep a single RPC signature for PostgREST/Supabase client calls.
-- The frontend sends p_method as text; the function validates/casts it to payment_method.
drop function if exists public.record_payment_transaction(uuid, numeric, public.payment_method, uuid, text);

create or replace function public.record_payment_transaction(
  p_loan_id uuid,
  p_amount numeric,
  p_method text,
  p_installment_id uuid default null,
  p_notes text default null
) returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_payment public.payments;
  v_remaining numeric := p_amount;
  r record;
  v_status loan_status;
  v_method public.payment_method;
begin
  select role into v_role
  from profiles
  where id = auth.uid() and active = true;

  if v_role not in ('collector','supervisor','admin') then
    raise exception 'No autorizado';
  end if;

  if p_amount <= 0 then
    raise exception 'Monto inválido';
  end if;

  begin
    v_method := p_method::public.payment_method;
  exception when invalid_text_representation then
    raise exception 'Método de pago inválido';
  end;

  select status into v_status
  from loans
  where id = p_loan_id
  for update;

  if v_status not in ('approved','active') then
    raise exception 'El préstamo no está habilitado para pagos';
  end if;

  if p_installment_id is not null then
    select * into r
    from installments
    where id = p_installment_id and loan_id = p_loan_id
    for update;

    if not found then raise exception 'Cuota no encontrada'; end if;
    if p_amount > (r.amount_due - r.amount_paid) then
      raise exception 'El pago excede el saldo de la cuota';
    end if;

    update installments
    set amount_paid = amount_paid + p_amount,
        status = case when amount_paid + p_amount >= amount_due then 'paid' else 'partial' end
    where id = r.id;
  else
    for r in
      select * from installments
      where loan_id = p_loan_id and amount_paid < amount_due
      order by installment_number
      for update
    loop
      exit when v_remaining <= 0;
      declare v_apply numeric := least(v_remaining, r.amount_due - r.amount_paid);
      begin
        update installments
        set amount_paid = amount_paid + v_apply,
            status = case when amount_paid + v_apply >= amount_due then 'paid' else 'partial' end
        where id = r.id;
        v_remaining := v_remaining - v_apply;
      end;
    end loop;

    if v_remaining > 0 then
      raise exception 'El pago excede el saldo pendiente';
    end if;
  end if;

  insert into payments(
    receipt_number, loan_id, installment_id, amount, method, registered_by, notes
  )
  values(
    'REC-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') || '-' || substr(gen_random_uuid()::text,1,6),
    p_loan_id, p_installment_id, p_amount, v_method, auth.uid(), p_notes
  )
  returning * into v_payment;

  if not exists (
    select 1 from installments
    where loan_id = p_loan_id and amount_paid < amount_due
  ) then
    update loans set status = 'completed', updated_at = now() where id = p_loan_id;
  elsif v_status = 'approved' then
    update loans set status = 'active', updated_at = now() where id = p_loan_id;
  end if;

  insert into audit_logs(actor_id, action, entity_type, entity_id, new_data)
  values(auth.uid(), 'record_payment', 'payment', v_payment.id, to_jsonb(v_payment));

  return v_payment;
end;
$$;
