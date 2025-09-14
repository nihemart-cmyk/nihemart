-- Migration: create notifications table and triggers
-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_user_id uuid null,
  recipient_role text null,
  type text not null,
  title text not null,
  body text null,
  meta jsonb null,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_recipient_user on public.notifications(recipient_user_id);
create index if not exists idx_notifications_recipient_role on public.notifications(recipient_role);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- Function to insert notification
create or replace function public.insert_notification(
  p_recipient_user_id uuid,
  p_recipient_role text,
  p_type text,
  p_title text,
  p_body text,
  p_meta jsonb
) returns void language plpgsql as $$
begin
  insert into public.notifications(recipient_user_id, recipient_role, type, title, body, meta)
  values (p_recipient_user_id, p_recipient_role, p_type, p_title, p_body, p_meta);
end;
$$;

-- Trigger function for order_assignments
create or replace function public.notify_on_order_assignments() returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    -- Notify the rider assigned
    perform public.insert_notification(
      new.rider_id,
      null,
      'assignment_created',
      'New delivery assigned',
      format('Order %s assigned to you', new.order_id),
      to_jsonb(new)
    );
    -- Also notify admins
    perform public.insert_notification(
      null,
      'admin',
      'assignment_created',
      'Order assigned to rider',
      format('Order %s assigned to rider %s', new.order_id, new.rider_id),
      to_jsonb(new)
    );
    return new;
  elsif (TG_OP = 'UPDATE') then
    if (new.status = 'accepted' and old.status is distinct from new.status) then
      -- notify admin that rider accepted
      perform public.insert_notification(
        null,
        'admin',
        'assignment_accepted',
        'Rider accepted assignment',
        format('Rider %s accepted order %s', new.rider_id, new.order_id),
        to_jsonb(new)
      );
      -- notify rider (confirmation)
      perform public.insert_notification(
        new.rider_id,
        null,
        'assignment_accepted',
        'Assignment accepted',
        format('You accepted order %s', new.order_id),
        to_jsonb(new)
      );
    elsif (new.status = 'rejected' and old.status is distinct from new.status) then
      perform public.insert_notification(
        null,
        'admin',
        'assignment_rejected',
        'Rider rejected assignment',
        format('Rider %s rejected order %s', new.rider_id, new.order_id),
        to_jsonb(new)
      );
      perform public.insert_notification(
        new.rider_id,
        null,
        'assignment_rejected',
        'Assignment rejected',
        format('You rejected order %s', new.order_id),
        to_jsonb(new)
      );
    end if;
    return new;
  end if;
  return null;
end;
$$;

-- Trigger for assignments table
drop trigger if exists trg_notify_assignments on public.order_assignments;
create trigger trg_notify_assignments
  after insert or update on public.order_assignments
  for each row execute function public.notify_on_order_assignments();

-- Trigger function for orders table
create or replace function public.notify_on_orders() returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE') then
    if (new.status is distinct from old.status) then
      -- notify order owner
      perform public.insert_notification(
        new.user_id,
        null,
        'order_status_update',
        format('Your order %s status changed', coalesce(new.order_number::text, new.id::text)),
        format('Status changed to: %s', new.status),
        jsonb_build_object('old_status', old.status, 'new_status', new.status, 'order_id', new.id)
      );
      -- notify admins as well
      perform public.insert_notification(
        null,
        'admin',
        'order_status_update',
        format('Order %s status changed', coalesce(new.order_number::text, new.id::text)),
        format('Status changed to: %s', new.status),
        jsonb_build_object('old_status', old.status, 'new_status', new.status, 'order_id', new.id)
      );
    end if;
    return new;
  end if;
  return null;
end;
$$;

-- Trigger for orders table
drop trigger if exists trg_notify_orders on public.orders;
create trigger trg_notify_orders
  after update on public.orders
  for each row execute function public.notify_on_orders();
