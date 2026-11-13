-- Mr Key v2: premios con confirmación de entrega, deshacer sellos y notas de clientes.
-- Aplicar ANTES de desplegar la nueva versión de la Edge Function.

-- Cada premio ganado es una fila: pendiente hasta que el personal confirma que se entregó.
create table if not exists public.mk_rewards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.mk_merchants(id) on delete cascade,
  customer_id uuid not null references public.mk_customers(id) on delete cascade,
  reward_text text not null,
  earned_at timestamptz not null default now(),
  stamp_event_id bigint,
  delivered_at timestamptz,
  delivered_by text,
  created_at timestamptz not null default now()
);
create index if not exists mk_rewards_merchant_pending on public.mk_rewards (merchant_id, earned_at) where delivered_at is null;
create index if not exists mk_rewards_merchant_delivered on public.mk_rewards (merchant_id, delivered_at desc) where delivered_at is not null;
create index if not exists mk_rewards_customer on public.mk_rewards (customer_id, earned_at);
alter table public.mk_rewards enable row level security;

-- Premios que ya existían como contador: se convierten en filas pendientes.
insert into public.mk_rewards (merchant_id, customer_id, reward_text, earned_at)
select c.merchant_id, c.id, m.reward_text, coalesce(c.last_visit_at, c.created_at)
from public.mk_customers c
join public.mk_merchants m on m.id = c.merchant_id
cross join lateral generate_series(1, c.rewards_available)
where c.rewards_available > 0
  and not exists (select 1 from public.mk_rewards r where r.customer_id = c.id);

-- Nuevos tipos de evento: deshacer sello / deshacer entrega, ajustes manuales y altas desde el mostrador.
alter table public.mk_events drop constraint if exists mk_events_kind_check;
alter table public.mk_events add constraint mk_events_kind_check
  check (kind in ('join', 'stamp', 'redeem', 'campaign', 'undo_stamp', 'undo_redeem', 'adjust'));

-- Nota privada del dueño sobre el cliente (preferencias, alergias de la mascota, etc.).
alter table public.mk_customers add column if not exists note text;
