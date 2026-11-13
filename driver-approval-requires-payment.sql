-- Optional database-level guard (the admin screens already enforce this).
-- Blocks setting drivers.is_approved to true unless the driver has a paid
-- period that has not ended (drivers.paid_until >= today, Manila time).
-- Run once in the Supabase SQL Editor.

create or replace function public.require_payment_before_approval()
returns trigger
language plpgsql
as $$
begin
  if new.is_approved is true
     and (tg_op = 'INSERT' or old.is_approved is distinct from true) then
    if new.paid_until is null
       or new.paid_until::date < (now() at time zone 'Asia/Manila')::date then
      raise exception 'Payment must be completed before this driver can be approved';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists drivers_require_payment on public.drivers;
create trigger drivers_require_payment
  before insert or update of is_approved on public.drivers
  for each row execute function public.require_payment_before_approval();
