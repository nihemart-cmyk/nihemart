-- Migration: fix notifications to use rider.user_id as recipient_user_id

-- Replace notify_on_order_assignments to resolve rider -> user mapping
create or replace function public.notify_on_order_assignments() returns trigger language plpgsql as $$
declare
  v_rider_user_id uuid;
begin
  -- try to get the auth user id for the rider
  if (new.rider_id is not null) then
    select user_id into v_rider_user_id from public.riders where id = new.rider_id limit 1;
  else
    v_rider_user_id := null;
  end if;

  if (TG_OP = 'INSERT') then
    -- Notify the rider assigned. Include delivery details by selecting the order
    -- so the rider sees address and delivery notes in the notification meta/body.
    declare v_order record;
    begin
      select id, order_number, delivery_address, delivery_notes, delivery_city
      into v_order
      from public.orders
      where id = new.order_id
      limit 1;
    exception when others then
      v_order := null;
    end;

    if v_rider_user_id is not null then
      perform public.insert_notification(
        v_rider_user_id,
        null,
        'assignment_created',
        'New delivery assigned',
        format('Deliver order %s to %s', coalesce(v_order.order_number::text, new.order_id::text), coalesce(v_order.delivery_address, 'address not provided')),
        (to_jsonb(new) || jsonb_build_object('order', to_jsonb(v_order)))
      );
    else
      perform public.insert_notification(
        null,
        'rider',
        'assignment_created',
        'New delivery assigned',
        format('Deliver order %s to %s', coalesce(v_order.order_number::text, new.order_id::text), coalesce(v_order.delivery_address, 'address not provided')),
        (to_jsonb(new) || jsonb_build_object('order', to_jsonb(v_order)) || jsonb_build_object('rider_id', new.rider_id))
      );
    end if;
    return new;
  elsif (TG_OP = 'UPDATE') then
    if (new.status = 'accepted' and old.status is distinct from new.status) then
      -- notify admin that rider accepted (concise)
      perform public.insert_notification(
        null,
        'admin',
        'assignment_accepted',
        'Rider accepted assignment',
        format('Rider %s accepted order %s', new.rider_id, new.order_id),
        to_jsonb(new)
      );
      -- notify rider (confirmation)
      if v_rider_user_id is not null then
        perform public.insert_notification(
          v_rider_user_id,
          null,
          'assignment_accepted',
          'Assignment accepted',
          format('You accepted order %s', new.order_id),
          to_jsonb(new)
        );
      else
        perform public.insert_notification(
          null,
          'rider',
          'assignment_accepted',
          'Assignment accepted',
          format('You accepted order %s', new.order_id),
          (to_jsonb(new) || jsonb_build_object('rider_id', new.rider_id))
        );
      end if;
    elsif (new.status = 'rejected' and old.status is distinct from new.status) then
      -- include rejection notes in admin notification body if present
      perform public.insert_notification(
        null,
        'admin',
        'assignment_rejected',
        'Rider rejected assignment',
        format('Rider %s rejected order %s. Reason: %s', new.rider_id, new.order_id, coalesce(new.notes, 'no reason provided')),
        to_jsonb(new)
      );
      if v_rider_user_id is not null then
        perform public.insert_notification(
          v_rider_user_id,
          null,
          'assignment_rejected',
          'Assignment rejected',
          format('You rejected order %s', new.order_id),
          to_jsonb(new)
        );
      else
        perform public.insert_notification(
          null,
          'rider',
          'assignment_rejected',
          'Assignment rejected',
          format('You rejected order %s', new.order_id),
          (to_jsonb(new) || jsonb_build_object('rider_id', new.rider_id))
        );
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

-- Recreate trigger to use the new function (idempotent)
drop trigger if exists trg_notify_assignments on public.order_assignments;
create trigger trg_notify_assignments
  after insert or update on public.order_assignments
  for each row execute function public.notify_on_order_assignments();

-- Backfill: if there are existing notifications where recipient_user_id matches a rider id,
-- update them to use the rider's user_id instead.
-- This handles the inconsistent rows produced earlier.
update public.notifications n
set recipient_user_id = r.user_id
from public.riders r
where n.recipient_user_id = r.id
  and r.user_id is not null;

-- Optionally, you could add a safety update if recipient_user_id is null but riders table exists
-- but the above should cover most mismatches.

-- Backfill: for rows where recipient_user_id and recipient_role are null but meta contains rider_id,
-- try to resolve to rider.user_id; if found, set recipient_user_id, otherwise set recipient_role = 'rider'
update public.notifications n
set recipient_user_id = coalesce(r.user_id, null),
    recipient_role = case when r.user_id is null then 'rider' else null end
from (
  select id, (meta->>'rider_id')::uuid as rider_id from public.notifications
  where recipient_user_id is null and recipient_role is null and meta ? 'rider_id'
) meta_rows
left join public.riders r on r.id = meta_rows.rider_id
where n.id = meta_rows.id;
