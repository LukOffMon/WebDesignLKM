// Mr Key LKM'r: API de fidelización con Apple Wallet y Google Wallet.
// Una sola Edge Function: /api/* para el panel, la app de sellado y la tarjeta del cliente,
// y /apple/v1/* para el servicio web de PassKit que llaman los iPhone.
import postgres from "npm:postgres@3.4.5";
import { appleConfig, buildPkpass, isInactive, pushPassUpdate } from "./apple.ts";
import * as google from "./google.ts";
import type { Customer, Merchant, Session } from "./types.ts";
import {
  CORS_HEADERS,
  hashSecret,
  hexColor,
  HttpError,
  int,
  json,
  normalizePhone,
  optStr,
  pngDataUrl,
  randomToken,
  sha256Hex,
  slugify,
  str,
  verifySecret,
} from "./util.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3 });
const PUBLIC_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mrkey`;
const DAY = 86_400_000;

const MERCHANT_PUBLIC_COLS = sql`id, slug, name, vertical, logo_png, icon_png, color_bg, color_fg, color_accent,
  reward_text, stamps_required, address, lat, lng`;
const MERCHANT_COLS = sql`id, slug, name, owner_email, vertical, logo_png, icon_png, color_bg, color_fg, color_accent,
  reward_text, stamps_required, ticket_avg::float8 as ticket_avg, inactive_days, stamp_cooldown_min, lat, lng, address,
  plan, trial_ends_at, created_at, staff_pin_hash is not null as has_staff_pin`;

// deno-lint-ignore no-explicit-any
const runtime = (globalThis as any).EdgeRuntime;
function background(p: Promise<unknown>) {
  const guarded = p.catch((e) => console.error("background", e));
  if (runtime?.waitUntil) runtime.waitUntil(guarded);
}

// ---------- Sesiones ----------

async function createSession(merchantId: string, role: "owner" | "staff", staffName: string | null) {
  const token = randomToken(32);
  await sql`delete from mk_sessions where merchant_id = ${merchantId} and expires_at < now()`;
  await sql`insert into mk_sessions (token_hash, merchant_id, role, staff_name, expires_at)
    values (${await sha256Hex(token)}, ${merchantId}, ${role}, ${staffName}, now() + interval '30 days')`;
  return token;
}

async function requireSession(req: Request, role?: "owner"): Promise<Session> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new HttpError(401, "Inicia sesión para continuar.");
  const [s] = await sql<Session[]>`select merchant_id, role, staff_name from mk_sessions
    where token_hash = ${await sha256Hex(token)} and expires_at > now()`;
  if (!s) throw new HttpError(401, "Tu sesión expiró. Vuelve a entrar.");
  if (role === "owner" && s.role !== "owner") throw new HttpError(403, "Solo el dueño del negocio puede hacer esto.");
  return s;
}

async function getMerchant(id: string): Promise<Merchant> {
  const [m] = await sql<Merchant[]>`select ${MERCHANT_COLS} from mk_merchants where id = ${id}`;
  if (!m) throw new HttpError(404, "Negocio no encontrado.");
  return m;
}

// ---------- Wallet: propagar cambios a los teléfonos ----------

async function notifyWallets(m: Merchant, customers: Customer[], message?: string) {
  if (customers.length === 0) return;
  const tasks: Promise<unknown>[] = [];
  if (appleConfig().enabled) {
    const regs = await sql<{ push_token: string }[]>`select distinct push_token from mk_apple_registrations
      where serial in ${sql(customers.map((c) => c.serial))}`;
    tasks.push(pushPassUpdate(regs.map((r) => r.push_token)).then((r) => r.error && console.error("APNs", r.error)));
  }
  if (google.googleConfig().enabled) {
    for (const c of customers) {
      tasks.push(message ? google.sendMessage(m, c, message) : google.updateObject(m, c));
    }
  }
  await Promise.allSettled(tasks);
}

const logoUrl = (m: Merchant) => `${PUBLIC_BASE}/api/public/m/${m.slug}/logo.png`;

// ---------- Cuenta del comerciante ----------

async function signup(body: Record<string, unknown>) {
  const name = str(body.name, "nombre del negocio", { min: 2, max: 60 });
  const email = str(body.email, "correo", { max: 120 }).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Escribe un correo válido.");
  const password = str(body.password, "contraseña", { min: 8, max: 128 });
  const vertical = optStr(body.vertical, "giro", 30) ?? "otro";
  const [exists] = await sql`select 1 from mk_merchants where owner_email = ${email}`;
  if (exists) throw new HttpError(409, "Ya existe una cuenta con ese correo. Inicia sesión.");

  const base = slugify(name);
  let slug = base;
  for (let i = 2; (await sql`select 1 from mk_merchants where slug = ${slug}`).length; i++) slug = `${base}-${i}`;

  const presets: Record<string, { reward: string; stamps: number; ticket: number }> = {
    barberia: { reward: "Corte gratis", stamps: 8, ticket: 180 },
    cafeteria: { reward: "Café gratis", stamps: 10, ticket: 70 },
    belleza: { reward: "Servicio gratis", stamps: 6, ticket: 350 },
    veterinaria: { reward: "Baño gratis para tu mascota", stamps: 6, ticket: 400 },
    retail: { reward: "10% de descuento", stamps: 5, ticket: 500 },
    restaurante: { reward: "Postre gratis", stamps: 8, ticket: 250 },
  };
  const p = presets[vertical] ?? { reward: "Producto gratis", stamps: 8, ticket: 150 };
  const [m] = await sql<{ id: string }[]>`insert into mk_merchants
    (slug, name, owner_email, pass_hash, vertical, reward_text, stamps_required, ticket_avg)
    values (${slug}, ${name}, ${email}, ${await hashSecret(password)}, ${vertical}, ${p.reward}, ${p.stamps}, ${p.ticket})
    returning id`;
  return { token: await createSession(m.id, "owner", null), slug };
}

async function login(body: Record<string, unknown>) {
  const email = str(body.email, "correo", { max: 120 }).toLowerCase();
  const password = str(body.password, "contraseña", { max: 128 });
  const [m] = await sql`select id, pass_hash, login_locked_until from mk_merchants where owner_email = ${email}`;
  if (m?.login_locked_until && new Date(m.login_locked_until) > new Date()) {
    throw new HttpError(429, "Demasiados intentos. Espera 15 minutos.");
  }
  if (!m || !(await verifySecret(password, m.pass_hash))) {
    if (m) {
      await sql`update mk_merchants set
        login_locked_until = case when login_failures + 1 >= 8 then now() + interval '15 minutes' end,
        login_failures = case when login_failures + 1 >= 8 then 0 else login_failures + 1 end where id = ${m.id}`;
    }
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  }
  await sql`update mk_merchants set login_failures = 0, login_locked_until = null where id = ${m.id}`;
  return { token: await createSession(m.id, "owner", null) };
}

async function staffLogin(body: Record<string, unknown>) {
  const slug = str(body.slug, "negocio", { max: 60 }).toLowerCase();
  const pin = str(body.pin, "PIN", { min: 4, max: 8 });
  const staffName = optStr(body.staff_name, "tu nombre", 40);
  const [m] = await sql`select id, staff_pin_hash, pin_locked_until from mk_merchants where slug = ${slug}`;
  if (!m || !m.staff_pin_hash) throw new HttpError(404, "Ese negocio no existe o aún no tiene PIN de personal.");
  if (m.pin_locked_until && new Date(m.pin_locked_until) > new Date()) {
    throw new HttpError(429, "Demasiados intentos con PIN incorrecto. Espera 15 minutos.");
  }
  if (!(await verifySecret(pin, m.staff_pin_hash))) {
    await sql`update mk_merchants set
      pin_locked_until = case when pin_failures + 1 >= 10 then now() + interval '15 minutes' end,
      pin_failures = case when pin_failures + 1 >= 10 then 0 else pin_failures + 1 end where id = ${m.id}`;
    throw new HttpError(401, "PIN incorrecto.");
  }
  await sql`update mk_merchants set pin_failures = 0, pin_locked_until = null where id = ${m.id}`;
  return { token: await createSession(m.id, "staff", staffName) };
}

async function updateMerchant(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const u: Record<string, unknown> = {};
  if ("name" in body) u.name = str(body.name, "nombre", { min: 2, max: 60 });
  if ("vertical" in body) u.vertical = str(body.vertical, "giro", { max: 30 });
  if ("reward_text" in body) u.reward_text = str(body.reward_text, "recompensa", { min: 2, max: 60 });
  if ("stamps_required" in body) u.stamps_required = int(body.stamps_required, "sellos necesarios", 3, 20);
  if ("inactive_days" in body) u.inactive_days = int(body.inactive_days, "días para inactivo", 3, 365);
  if ("stamp_cooldown_min" in body) u.stamp_cooldown_min = int(body.stamp_cooldown_min, "minutos entre sellos", 0, 1440);
  if ("ticket_avg" in body) u.ticket_avg = int(body.ticket_avg, "ticket promedio", 1, 1_000_000);
  if ("color_bg" in body) u.color_bg = hexColor(body.color_bg, "color de fondo");
  if ("color_fg" in body) u.color_fg = hexColor(body.color_fg, "color de texto");
  if ("color_accent" in body) u.color_accent = hexColor(body.color_accent, "color de acento");
  if ("logo_png" in body) u.logo_png = pngDataUrl(body.logo_png, "logo", 300_000);
  if ("icon_png" in body) u.icon_png = pngDataUrl(body.icon_png, "icono", 100_000);
  if ("address" in body) u.address = optStr(body.address, "dirección", 160);
  if ("lat" in body || "lng" in body) {
    const lat = body.lat === null || body.lat === "" ? null : Number(body.lat);
    const lng = body.lng === null || body.lng === "" ? null : Number(body.lng);
    if ((lat === null) !== (lng === null)) throw new HttpError(400, "Indica latitud y longitud juntas.");
    if (lat !== null && (!(Math.abs(lat) <= 90) || !(Math.abs(lng!) <= 180))) throw new HttpError(400, "Coordenadas inválidas.");
    u.lat = lat;
    u.lng = lng;
  }
  if ("staff_pin" in body) {
    const pin = String(body.staff_pin ?? "");
    if (!/^\d{4,8}$/.test(pin)) throw new HttpError(400, "El PIN del personal debe tener de 4 a 8 dígitos.");
    u.staff_pin_hash = await hashSecret(pin);
  }
  if (Object.keys(u).length === 0) return { merchant: m };
  await sql`update mk_merchants set ${sql(u)} where id = ${m.id}`;
  const updated = await getMerchant(m.id);
  const brandingChanged = ["name", "color_bg", "logo_png", "reward_text", "stamps_required"].some((k) => k in u);
  if (brandingChanged) background(google.updateClass(updated, logoUrl(updated)));
  return { merchant: updated };
}

// Sellos que cuentan como visita (los deshechos no).
const LIVE_STAMP = sql`kind = 'stamp' and not coalesce((meta->>'undone')::boolean, false)`;
const UNDO_WINDOW_MIN = 15;

async function dashboard(s: Session) {
  const m = await getMerchant(s.merchant_id);
  const wallet = { apple: appleConfig().enabled, google: google.googleConfig().enabled };
  // El personal solo necesita lo mínimo para sellar: nada de métricas ni lista de clientes.
  if (s.role === "staff") {
    const [today] = await sql`select count(*)::int as stamps_today from mk_events
      where merchant_id = ${m.id} and ${LIVE_STAMP} and created_at >= date_trunc('day', now())`;
    return {
      merchant: { slug: m.slug, name: m.name, reward_text: m.reward_text, stamps_required: m.stamps_required, color_bg: m.color_bg, color_fg: m.color_fg, color_accent: m.color_accent },
      role: s.role,
      staff_name: s.staff_name,
      stats: today,
      wallet,
    };
  }
  const [stats] = await sql`select
      count(*)::int as customers,
      count(*) filter (where created_at > now() - interval '30 days')::int as new_30d,
      count(*) filter (where last_visit_at < now() - make_interval(days => ${m.inactive_days}))::int as inactive,
      count(*) filter (where stamps >= ${m.stamps_required - 1})::int as near_reward,
      count(*) filter (where marketing_opt_in)::int as opted_in,
      count(*) filter (where total_visits >= 2)::int as returning
    from mk_customers where merchant_id = ${m.id}`;
  const [ev] = await sql`select
      count(*) filter (where ${LIVE_STAMP})::int as visits_30d,
      count(*) filter (where ${LIVE_STAMP} and (meta->>'reactivated')::boolean)::int as reactivated_30d,
      count(*) filter (where ${LIVE_STAMP} and created_at >= date_trunc('day', now()))::int as visits_today
    from mk_events where merchant_id = ${m.id} and created_at > now() - interval '30 days'`;
  const [rw] = await sql`select
      count(*) filter (where delivered_at is null)::int as rewards_pending,
      count(*) filter (where delivered_at > now() - interval '30 days')::int as redeemed_30d,
      coalesce(floor(extract(epoch from now() - min(earned_at) filter (where delivered_at is null)) / 86400), 0)::int as oldest_pending_days
    from mk_rewards where merchant_id = ${m.id}`;
  const daily = await sql`select to_char(d, 'YYYY-MM-DD') as day, count(e.id)::int as visits
    from generate_series(current_date - 13, current_date, interval '1 day') d
    left join mk_events e on e.merchant_id = ${m.id} and e.kind = 'stamp'
      and not coalesce((e.meta->>'undone')::boolean, false) and e.created_at::date = d::date
    group by d order by d`;
  const [walletCount] = await sql`select count(distinct r.serial)::int as apple
    from mk_apple_registrations r join mk_customers c on c.serial = r.serial where c.merchant_id = ${m.id}`;
  const recent = await sql`select e.id, e.kind, e.staff_name, e.created_at, e.meta, c.name, c.id as customer_id
    from mk_events e left join mk_customers c on c.id = e.customer_id
    where e.merchant_id = ${m.id} order by e.created_at desc limit 15`;
  return {
    merchant: m,
    role: s.role,
    stats: {
      ...stats,
      ...ev,
      ...rw,
      apple_passes: walletCount.apple,
      recovered_revenue_30d: ev.reactivated_30d * m.ticket_avg,
    },
    daily,
    recent,
    wallet,
  };
}

async function listCustomers(s: Session, url: URL) {
  const m = await getMerchant(s.merchant_id);
  const filter = url.searchParams.get("filter") ?? "all";
  const q = (url.searchParams.get("q") ?? "").trim();
  const like = `%${q.replace(/[%_\\]/g, "")}%`;
  const rows = await sql`select id, serial, name, phone, email, marketing_opt_in, stamps, rewards_available, rewards_redeemed,
      total_visits, last_visit_at, created_at, note,
      floor(extract(epoch from now() - coalesce(last_visit_at, created_at)) / 86400)::int as days_since
    from mk_customers
    where merchant_id = ${m.id}
      ${filter === "inactive" ? sql`and last_visit_at < now() - make_interval(days => ${m.inactive_days})` : sql``}
      ${filter === "near" ? sql`and stamps >= ${m.stamps_required - 1}` : sql``}
      ${filter === "rewards" ? sql`and rewards_available > 0` : sql``}
      ${filter === "new" ? sql`and created_at > now() - interval '30 days'` : sql``}
      ${filter === "loyal" ? sql`and total_visits >= 5` : sql``}
      ${q ? sql`and (name ilike ${like} or phone like ${like})` : sql``}
    order by ${
    filter === "inactive"
      ? sql`last_visit_at asc`
      : filter === "loyal"
      ? sql`total_visits desc`
      : sql`coalesce(last_visit_at, created_at) desc`
  }
    limit 1000`;
  return { customers: rows, inactive_days: m.inactive_days };
}

async function customerForOwner(s: Session, id: string): Promise<Customer> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Cliente no encontrado.");
  const [c] = await sql<Customer[]>`select * from mk_customers where id = ${id} and merchant_id = ${s.merchant_id}`;
  if (!c) throw new HttpError(404, "Cliente no encontrado.");
  return c;
}

async function customerDetail(s: Session, id: string) {
  const c = await customerForOwner(s, id);
  const events = await sql`select id, kind, staff_name, meta, created_at from mk_events
    where customer_id = ${c.id} order by created_at desc limit 60`;
  const rewards = await sql`select id, reward_text, earned_at, delivered_at, delivered_by from mk_rewards
    where customer_id = ${c.id} order by earned_at desc limit 60`;
  return { customer: { ...c, auth_token: undefined }, events, rewards };
}

async function updateCustomer(s: Session, id: string, body: Record<string, unknown>) {
  const c = await customerForOwner(s, id);
  const u: Record<string, unknown> = {};
  if ("name" in body) u.name = str(body.name, "nombre", { min: 2, max: 60 });
  if ("phone" in body) u.phone = normalizePhone(body.phone);
  if ("email" in body) u.email = optStr(body.email, "correo", 120);
  if ("note" in body) u.note = optStr(body.note, "nota", 500);
  if ("marketing_opt_in" in body) u.marketing_opt_in = body.marketing_opt_in === true;
  if (Object.keys(u).length === 0) return { customer: c };
  u.updated_at = new Date();
  try {
    const [updated] = await sql`update mk_customers set ${sql(u)} where id = ${c.id} returning *`;
    if ("name" in u) background(notifyWallets(await getMerchant(s.merchant_id), [updated as Customer]));
    return { customer: { ...updated, auth_token: undefined } };
  } catch (e) {
    if (String(e).includes("mk_customers_merchant_id_phone_key")) throw new HttpError(409, "Ya hay otro cliente con ese teléfono.");
    throw e;
  }
}

// Corrección manual de sellos por el dueño (p. ej. migrar tarjetas de papel).
async function adjustStamps(s: Session, id: string, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const c = await customerForOwner(s, id);
  const target = int(body.stamps, "sellos", 0, m.stamps_required - 1);
  const reason = optStr(body.reason, "motivo", 120);
  if (target === c.stamps) return { customer: publicCustomer(c) };
  const [updated] = await sql<Customer[]>`update mk_customers set stamps = ${target}, updated_at = now()
    where id = ${c.id} returning *`;
  await sql`insert into mk_events (merchant_id, customer_id, kind, meta) values
    (${m.id}, ${c.id}, 'adjust', ${sql.json({ from: c.stamps, to: target, reason })})`;
  background(notifyWallets(m, [updated]));
  return { customer: publicCustomer(updated) };
}

async function deleteCustomer(s: Session, id: string) {
  const c = await customerForOwner(s, id);
  await sql`delete from mk_customers where id = ${c.id}`;
  return { ok: true };
}

// Alta desde el mostrador: para clientes que no quieren escanear el QR.
async function createCustomer(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const result = await insertCustomer(m.id, {
    name: str(body.name, "nombre", { min: 2, max: 60 }),
    phone: normalizePhone(body.phone),
    email: s.role === "owner" ? optStr(body.email, "correo", 120) : null,
    optIn: body.marketing_opt_in === true,
    staffName: s.staff_name,
  });
  const [c] = await sql<Customer[]>`select * from mk_customers where serial = ${result.serial}`;
  return { ...result, customer: await customerForCounter(m, c) };
}

async function insertCustomer(
  merchantId: string,
  d: { name: string; phone: string; email: string | null; optIn: boolean; staffName?: string | null },
) {
  const [existing] = await sql`select serial from mk_customers where merchant_id = ${merchantId} and phone = ${d.phone}`;
  if (existing) return { serial: existing.serial as string, existing: true };
  const [c] = await sql`insert into mk_customers (merchant_id, name, phone, email, marketing_opt_in, serial, auth_token)
    values (${merchantId}, ${d.name}, ${d.phone}, ${d.email}, ${d.optIn}, ${randomToken(16)}, ${randomToken(24)})
    on conflict (merchant_id, phone) do update set name = mk_customers.name
    returning id, serial`;
  await sql`insert into mk_events (merchant_id, customer_id, kind, staff_name, meta)
    values (${merchantId}, ${c.id}, 'join', ${d.staffName ?? null}, ${sql.json({ via: d.staffName !== undefined ? "counter" : "qr" })})`;
  return { serial: c.serial as string, existing: false };
}

// ---------- Sellado y canje ----------

function serialFromCode(code: unknown): string {
  const raw = String(code ?? "").trim();
  const fromUrl = raw.match(/[?&]s=([A-Za-z0-9_-]{16,})/);
  if (fromUrl) return fromUrl[1];
  const m = raw.match(/^(?:MK:)?([A-Za-z0-9_-]{16,})$/);
  if (!m) throw new HttpError(400, "Ese código no es una tarjeta de Mr Key.");
  return m[1];
}

async function pendingRewards(customerId: string) {
  return await sql`select id, reward_text, earned_at from mk_rewards
    where customer_id = ${customerId} and delivered_at is null order by earned_at asc`;
}

// Último sello que todavía se puede deshacer (de los últimos minutos y sin premios ya entregados).
async function undoableStamp(customerId: string) {
  const [e] = await sql`select id, created_at, staff_name, meta from mk_events
    where customer_id = ${customerId} and kind = 'stamp'
    order by created_at desc limit 1`;
  if (!e || e.meta?.undone) return null;
  if (Date.now() - new Date(e.created_at).getTime() > UNDO_WINDOW_MIN * 60_000) return null;
  const [delivered] = await sql`select 1 from mk_rewards where stamp_event_id = ${e.id} and delivered_at is not null`;
  if (delivered) return null;
  return { event_id: String(e.id), created_at: e.created_at, staff_name: e.staff_name, count: e.meta?.count ?? 1 };
}

// Lo que ve el personal al escanear: progreso, premios pendientes y si puede deshacer el último sello.
async function customerForCounter(m: Merchant, c: Customer) {
  return {
    ...publicCustomer(c),
    rewards_redeemed: c.rewards_redeemed,
    created_at: c.created_at,
    pending_rewards: await pendingRewards(c.id),
    undo: await undoableStamp(c.id),
    stamps_required: m.stamps_required,
  };
}

async function stamp(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const serial = serialFromCode(body.code);
  const force = body.force === true;
  const count = body.count === undefined ? 1 : int(body.count, "sellos a sumar", 1, 5);
  const result = await sql.begin(async (tx) => {
    const [c] = await tx<Customer[]>`select * from mk_customers where serial = ${serial} for update`;
    if (!c || c.merchant_id !== m.id) throw new HttpError(404, "Esta tarjeta no pertenece a tu negocio.");
    const sinceMs = c.last_visit_at ? Date.now() - new Date(c.last_visit_at).getTime() : Infinity;
    if (!force && sinceMs < m.stamp_cooldown_min * 60_000) {
      return { cooldown: true, minutes_ago: Math.floor(sinceMs / 60_000), customer: c, unlocked: 0, event_id: null };
    }
    const reactivated = c.last_visit_at !== null && isInactive(c, m);
    let stamps = c.stamps + count;
    let unlocked = 0;
    // "while" por si se suman varios sellos o el dueño bajó los sellos necesarios.
    while (stamps >= m.stamps_required) {
      stamps -= m.stamps_required;
      unlocked += 1;
    }
    const [updated] = await tx<Customer[]>`update mk_customers set stamps = ${stamps},
      rewards_available = rewards_available + ${unlocked},
      total_visits = total_visits + 1, last_visit_at = now(), updated_at = now() where id = ${c.id} returning *`;
    const [ev] = await tx`insert into mk_events (merchant_id, customer_id, kind, staff_name, meta) values
      (${m.id}, ${c.id}, 'stamp', ${s.staff_name}, ${sql.json({
      reactivated,
      unlocked: unlocked > 0,
      unlocked_count: unlocked,
      count,
      days_since: c.last_visit_at ? Math.floor(sinceMs / DAY) : null,
      prev_stamps: c.stamps,
      prev_last_visit: c.last_visit_at,
    })}) returning id`;
    for (let i = 0; i < unlocked; i++) {
      await tx`insert into mk_rewards (merchant_id, customer_id, reward_text, stamp_event_id)
        values (${m.id}, ${c.id}, ${m.reward_text}, ${ev.id})`;
    }
    return { cooldown: false, unlocked, reactivated, customer: updated, event_id: String(ev.id) };
  });
  if (!result.cooldown) background(notifyWallets(m, [result.customer]));
  return {
    cooldown: result.cooldown,
    minutes_ago: "minutes_ago" in result ? result.minutes_ago : undefined,
    unlocked: result.unlocked > 0,
    unlocked_count: result.unlocked,
    reactivated: "reactivated" in result ? result.reactivated : false,
    event_id: result.event_id,
    stamps_required: m.stamps_required,
    reward_text: m.reward_text,
    customer: await customerForCounter(m, result.customer),
  };
}

async function undoStamp(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const eventId = String(body.event_id ?? "");
  if (!/^\d+$/.test(eventId)) throw new HttpError(400, "Falta el sello a deshacer.");
  const c = await sql.begin(async (tx) => {
    const [e] = await tx`select id, customer_id, created_at, meta from mk_events
      where id = ${eventId} and merchant_id = ${m.id} and kind = 'stamp' for update`;
    if (!e) throw new HttpError(404, "No encontramos ese sello.");
    if (e.meta?.undone) throw new HttpError(409, "Ese sello ya se había deshecho.");
    if (Date.now() - new Date(e.created_at).getTime() > UNDO_WINDOW_MIN * 60_000) {
      throw new HttpError(409, `Solo se puede deshacer un sello en los primeros ${UNDO_WINDOW_MIN} minutos. Pide al dueño que lo ajuste desde el panel.`);
    }
    const [latest] = await tx`select id from mk_events where customer_id = ${e.customer_id} and kind = 'stamp'
      order by created_at desc limit 1`;
    if (String(latest.id) !== String(e.id)) throw new HttpError(409, "Solo se puede deshacer el último sello del cliente.");
    const [delivered] = await tx`select 1 from mk_rewards where stamp_event_id = ${e.id} and delivered_at is not null`;
    if (delivered) throw new HttpError(409, "El premio de este sello ya se entregó. Deshaz primero la entrega.");
    const removed = await tx`delete from mk_rewards where stamp_event_id = ${e.id} returning id`;
    const [cust] = await tx<Customer[]>`update mk_customers set
        stamps = ${Number(e.meta?.prev_stamps ?? 0)},
        rewards_available = greatest(rewards_available - ${removed.length}, 0),
        total_visits = greatest(total_visits - 1, 0),
        last_visit_at = ${e.meta?.prev_last_visit ?? null},
        updated_at = now()
      where id = ${e.customer_id} returning *`;
    await tx`update mk_events set meta = meta || '{"undone": true}'::jsonb where id = ${e.id}`;
    await tx`insert into mk_events (merchant_id, customer_id, kind, staff_name, meta)
      values (${m.id}, ${e.customer_id}, 'undo_stamp', ${s.staff_name}, ${sql.json({ event_id: String(e.id) })})`;
    return cust;
  });
  background(notifyWallets(m, [c]));
  return { customer: await customerForCounter(m, c), stamps_required: m.stamps_required };
}

// Confirma que el premio se entregó. Sin reward_id, entrega el más antiguo pendiente.
async function deliverReward(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const rewardId = optStr(body.reward_id, "premio", 40);
  const who = s.staff_name ?? (s.role === "owner" ? "Dueño" : "Personal");
  const out = await sql.begin(async (tx) => {
    let customerId: string;
    if (rewardId) {
      const [r] = await tx`select customer_id from mk_rewards where id = ${rewardId} and merchant_id = ${m.id}`;
      if (!r) throw new HttpError(404, "Premio no encontrado.");
      customerId = r.customer_id;
    } else {
      const serial = serialFromCode(body.code);
      const [c] = await tx`select id from mk_customers where serial = ${serial} and merchant_id = ${m.id}`;
      if (!c) throw new HttpError(404, "Esta tarjeta no pertenece a tu negocio.");
      customerId = c.id;
    }
    // Bloquea al cliente para que dos personas no entreguen el mismo premio a la vez.
    await tx`select 1 from mk_customers where id = ${customerId} for update`;
    const [reward] = rewardId
      ? await tx`update mk_rewards set delivered_at = now(), delivered_by = ${who}
          where id = ${rewardId} and delivered_at is null returning *`
      : await tx`update mk_rewards set delivered_at = now(), delivered_by = ${who}
          where id = (select id from mk_rewards where customer_id = ${customerId} and delivered_at is null
            order by earned_at asc limit 1) returning *`;
    if (!reward) throw new HttpError(409, "Este cliente no tiene premios pendientes (quizá ya se entregó).");
    const [c] = await tx<Customer[]>`update mk_customers set rewards_available = greatest(rewards_available - 1, 0),
        rewards_redeemed = rewards_redeemed + 1, updated_at = now()
      where id = ${customerId} returning *`;
    await tx`insert into mk_events (merchant_id, customer_id, kind, staff_name, meta)
      values (${m.id}, ${customerId}, 'redeem', ${s.staff_name}, ${sql.json({ reward_id: reward.id, reward_text: reward.reward_text })})`;
    return { c, reward };
  });
  background(notifyWallets(m, [out.c]));
  return { reward: out.reward, customer: await customerForCounter(m, out.c), stamps_required: m.stamps_required };
}

// Por si se confirmó por error: el premio vuelve a quedar pendiente.
async function undoDeliver(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const rewardId = str(body.reward_id, "premio", { max: 40 });
  const c = await sql.begin(async (tx) => {
    const [r] = await tx`select id, customer_id, delivered_at from mk_rewards
      where id = ${rewardId} and merchant_id = ${m.id} for update`;
    if (!r) throw new HttpError(404, "Premio no encontrado.");
    if (!r.delivered_at) throw new HttpError(409, "Ese premio sigue pendiente.");
    const limitMin = s.role === "owner" ? 60 * 24 * 7 : UNDO_WINDOW_MIN;
    if (Date.now() - new Date(r.delivered_at).getTime() > limitMin * 60_000) {
      throw new HttpError(409, s.role === "owner"
        ? "Esa entrega tiene más de 7 días y ya no se puede deshacer."
        : `Solo se puede deshacer en los primeros ${UNDO_WINDOW_MIN} minutos. Pide al dueño que lo revise.`);
    }
    await tx`update mk_rewards set delivered_at = null, delivered_by = null where id = ${r.id}`;
    await tx`update mk_events set meta = meta || '{"undone": true}'::jsonb
      where merchant_id = ${m.id} and kind = 'redeem' and meta->>'reward_id' = ${String(r.id)}`;
    const [cust] = await tx<Customer[]>`update mk_customers set rewards_available = rewards_available + 1,
        rewards_redeemed = greatest(rewards_redeemed - 1, 0), updated_at = now()
      where id = ${r.customer_id} returning *`;
    await tx`insert into mk_events (merchant_id, customer_id, kind, staff_name, meta)
      values (${m.id}, ${r.customer_id}, 'undo_redeem', ${s.staff_name}, ${sql.json({ reward_id: r.id })})`;
    return cust;
  });
  background(notifyWallets(m, [c]));
  return { customer: await customerForCounter(m, c), stamps_required: m.stamps_required };
}

async function listRewards(s: Session, url: URL) {
  const status = url.searchParams.get("status") === "delivered" ? "delivered" : "pending";
  const rows = status === "pending"
    ? await sql`select r.id, r.reward_text, r.earned_at, r.delivered_at, r.delivered_by,
          c.id as customer_id, c.name, c.phone, c.serial, c.marketing_opt_in,
          floor(extract(epoch from now() - r.earned_at) / 86400)::int as days_waiting
        from mk_rewards r join mk_customers c on c.id = r.customer_id
        where r.merchant_id = ${s.merchant_id} and r.delivered_at is null
        order by r.earned_at asc limit 500`
    : await sql`select r.id, r.reward_text, r.earned_at, r.delivered_at, r.delivered_by,
          c.id as customer_id, c.name, c.phone, c.serial
        from mk_rewards r join mk_customers c on c.id = r.customer_id
        where r.merchant_id = ${s.merchant_id} and r.delivered_at is not null
        order by r.delivered_at desc limit 200`;
  return { status, rewards: rows };
}

// Busca por código de la tarjeta o, si el cliente no trae el teléfono a la mano, por su número.
async function lookup(s: Session, url: URL) {
  const code = (url.searchParams.get("code") ?? "").trim();
  const isPhone = /^\+?[\d\s()-]{10,20}$/.test(code);
  const [c] = isPhone
    ? await sql<Customer[]>`select * from mk_customers where phone = ${normalizePhone(code)} and merchant_id = ${s.merchant_id}`
    : await sql<Customer[]>`select * from mk_customers where serial = ${serialFromCode(code)} and merchant_id = ${s.merchant_id}`;
  if (!c) {
    throw new HttpError(404, isPhone ? "No hay ninguna tarjeta con ese teléfono. Puedes darlo de alta aquí mismo." : "Esta tarjeta no pertenece a tu negocio.");
  }
  const m = await getMerchant(s.merchant_id);
  return { customer: await customerForCounter(m, c), stamps_required: m.stamps_required, reward_text: m.reward_text };
}

// Movimientos de hoy en el mostrador (para revisar y deshacer errores).
async function today(s: Session) {
  const rows = await sql`select e.id, e.kind, e.staff_name, e.created_at, e.meta, c.name, c.serial
    from mk_events e join mk_customers c on c.id = e.customer_id
    where e.merchant_id = ${s.merchant_id} and e.kind in ('stamp', 'redeem', 'join')
      and e.created_at >= date_trunc('day', now())
    order by e.created_at desc limit 40`;
  return { events: rows };
}

function publicCustomer(c: Customer) {
  return {
    id: c.id,
    serial: c.serial,
    name: c.name,
    stamps: c.stamps,
    rewards_available: c.rewards_available,
    total_visits: c.total_visits,
    last_visit_at: c.last_visit_at,
  };
}

// ---------- Campañas ----------

async function campaign(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const segment = str(body.segment, "segmento", { max: 20 });
  const message = str(body.message, "mensaje", { min: 5, max: 160 });
  const where = {
    all: sql``,
    inactive: sql`and last_visit_at < now() - make_interval(days => ${m.inactive_days})`,
    near: sql`and stamps >= ${m.stamps_required - 1}`,
    rewards: sql`and rewards_available > 0`,
    new: sql`and created_at > now() - interval '30 days'`,
    loyal: sql`and total_visits >= 5`,
  }[segment];
  if (!where) throw new HttpError(400, "Segmento desconocido.");
  // Solo clientes que aceptaron recibir promociones.
  const targets = await sql<Customer[]>`update mk_customers set last_message = ${message}, last_message_at = now(), updated_at = now()
    where merchant_id = ${m.id} and marketing_opt_in ${where} returning *`;
  await sql`insert into mk_campaigns (merchant_id, segment, message, recipients) values (${m.id}, ${segment}, ${message}, ${targets.length})`;
  await sql`insert into mk_events (merchant_id, kind, meta) values (${m.id}, 'campaign', ${sql.json({ segment, recipients: targets.length })})`;
  background(notifyWallets(m, targets, message));
  return { recipients: targets.length };
}

async function campaignAudience(s: Session) {
  const m = await getMerchant(s.merchant_id);
  const [r] = await sql`select
      count(*) filter (where marketing_opt_in)::int as all,
      count(*) filter (where marketing_opt_in and last_visit_at < now() - make_interval(days => ${m.inactive_days}))::int as inactive,
      count(*) filter (where marketing_opt_in and stamps >= ${m.stamps_required - 1})::int as near,
      count(*) filter (where marketing_opt_in and rewards_available > 0)::int as rewards,
      count(*) filter (where marketing_opt_in and created_at > now() - interval '30 days')::int as new,
      count(*) filter (where marketing_opt_in and total_visits >= 5)::int as loyal
    from mk_customers where merchant_id = ${m.id}`;
  return { audience: r };
}

async function listCampaigns(s: Session) {
  const rows = await sql`select segment, message, recipients, created_at from mk_campaigns
    where merchant_id = ${s.merchant_id} order by created_at desc limit 50`;
  return { campaigns: rows, ...(await campaignAudience(s)) };
}

async function changePassword(s: Session, body: Record<string, unknown>) {
  const current = str(body.current, "contraseña actual", { max: 128 });
  const next = str(body.password, "contraseña nueva", { min: 8, max: 128 });
  const [m] = await sql`select pass_hash from mk_merchants where id = ${s.merchant_id}`;
  if (!(await verifySecret(current, m.pass_hash))) throw new HttpError(401, "La contraseña actual no es correcta.");
  await sql`update mk_merchants set pass_hash = ${await hashSecret(next)} where id = ${s.merchant_id}`;
  return { ok: true };
}

// ---------- Público: alta del cliente y tarjeta ----------

async function publicMerchant(slug: string) {
  const [m] = await sql`select ${MERCHANT_PUBLIC_COLS} from mk_merchants where slug = ${slug}`;
  if (!m) throw new HttpError(404, "Este negocio no existe.");
  return { merchant: m };
}

async function join(slug: string, body: Record<string, unknown>) {
  const [m] = await sql<Merchant[]>`select id from mk_merchants where slug = ${slug}`;
  if (!m) throw new HttpError(404, "Este negocio no existe.");
  const name = str(body.name, "nombre", { min: 2, max: 60 });
  const phone = normalizePhone(body.phone);
  const email = optStr(body.email, "correo", 120);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Escribe un correo válido o déjalo vacío.");
  if (body.accept_terms !== true) throw new HttpError(400, "Debes aceptar el aviso de privacidad.");
  return await insertCustomer(m.id, { name, phone, email, optIn: body.marketing_opt_in === true });
}

async function cardBySerial(serial: string): Promise<{ m: Merchant; c: Customer }> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(serial)) throw new HttpError(404, "Tarjeta no encontrada.");
  const [c] = await sql<Customer[]>`select * from mk_customers where serial = ${serial}`;
  if (!c) throw new HttpError(404, "Tarjeta no encontrada.");
  return { c, m: await getMerchant(c.merchant_id) };
}

async function publicCard(serial: string) {
  const { m, c } = await cardBySerial(serial);
  const recentMessage = c.last_message && c.last_message_at && Date.now() - new Date(c.last_message_at).getTime() < 14 * DAY;
  const history = await sql`select kind, created_at, meta from mk_events
    where customer_id = ${c.id} and kind in ('join', 'stamp', 'redeem', 'adjust')
      and not coalesce((meta->>'undone')::boolean, false)
    order by created_at desc limit 8`;
  const [lastDelivered] = await sql`select reward_text, delivered_at from mk_rewards
    where customer_id = ${c.id} and delivered_at is not null order by delivered_at desc limit 1`;
  return {
    merchant: {
      slug: m.slug,
      name: m.name,
      logo_png: m.logo_png,
      color_bg: m.color_bg,
      color_fg: m.color_fg,
      color_accent: m.color_accent,
      reward_text: m.reward_text,
      stamps_required: m.stamps_required,
      address: m.address,
      lat: m.lat,
      lng: m.lng,
    },
    card: {
      serial: c.serial,
      name: c.name,
      stamps: c.stamps,
      rewards_available: c.rewards_available,
      rewards_redeemed: c.rewards_redeemed,
      total_visits: c.total_visits,
      last_visit_at: c.last_visit_at,
      created_at: c.created_at,
      marketing_opt_in: c.marketing_opt_in,
      message: recentMessage ? c.last_message : null,
      message_at: recentMessage ? c.last_message_at : null,
      last_delivered: lastDelivered ?? null,
      history: history.map((h) => ({
        kind: h.kind,
        created_at: h.created_at,
        count: h.meta?.count ?? 1,
        unlocked: h.meta?.unlocked_count ?? (h.meta?.unlocked ? 1 : 0),
        reward_text: h.meta?.reward_text ?? null,
      })),
      updated_at: c.updated_at,
    },
    wallet: { apple: appleConfig().enabled, google: google.googleConfig().enabled },
  };
}

// El cliente puede dejar de recibir promociones desde su propia tarjeta.
async function cardPrefs(serial: string, body: Record<string, unknown>) {
  const { c } = await cardBySerial(serial);
  const optIn = body.marketing_opt_in === true;
  await sql`update mk_customers set marketing_opt_in = ${optIn},
    last_message = case when ${optIn} then last_message else null end, updated_at = now() where id = ${c.id}`;
  return { marketing_opt_in: optIn };
}

async function pkpassResponse(serial: string, ifModifiedSince?: string | null): Promise<Response> {
  const { m, c } = await cardBySerial(serial);
  if (!appleConfig().enabled) throw new HttpError(503, "Apple Wallet todavía no está activado en Mr Key.");
  const lastModified = new Date(c.updated_at);
  lastModified.setMilliseconds(0);
  if (ifModifiedSince && new Date(ifModifiedSince) >= lastModified) {
    return new Response(null, { status: 304, headers: CORS_HEADERS });
  }
  const file = await buildPkpass(m, c, `${PUBLIC_BASE}/apple`);
  return new Response(file as BodyInit, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${m.slug}.pkpass"`,
      "Last-Modified": lastModified.toUTCString(),
      "Cache-Control": "no-store",
    },
  });
}

async function googleSave(serial: string, origin: string | null) {
  const { m, c } = await cardBySerial(serial);
  if (!google.googleConfig().enabled) throw new HttpError(503, "Google Wallet todavía no está activado en Mr Key.");
  return { url: await google.saveUrl(m, c, logoUrl(m), origin) };
}

async function logoPng(slug: string): Promise<Response> {
  const [m] = await sql`select logo_png, icon_png from mk_merchants where slug = ${slug}`;
  const data = m?.logo_png ?? m?.icon_png;
  if (!data) {
    const { DEFAULT_ICON_PNG_B64 } = await import("./assets.ts");
    return new Response(Uint8Array.from(atob(DEFAULT_ICON_PNG_B64), (ch) => ch.charCodeAt(0)), {
      headers: { ...CORS_HEADERS, "Content-Type": "image/png" },
    });
  }
  const bin = atob(data.slice(data.indexOf(",") + 1));
  return new Response(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)), {
    headers: { ...CORS_HEADERS, "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
  });
}

// ---------- Servicio web de PassKit (lo llama el iPhone) ----------

async function appleWebService(req: Request, parts: string[]): Promise<Response> {
  const cfg = appleConfig();
  const authToken = (req.headers.get("authorization") ?? "").replace(/^ApplePass\s+/, "");
  const authorized = async (serial: string) => {
    const [c] = await sql`select auth_token from mk_customers where serial = ${serial}`;
    return c && c.auth_token === authToken;
  };
  // v1/log
  if (parts[1] === "log") {
    const body = await req.json().catch(() => ({}));
    console.log("PassKit log", JSON.stringify(body).slice(0, 2000));
    return new Response(null, { status: 200 });
  }
  // v1/devices/{device}/registrations/{passTypeId}[/{serial}]
  if (parts[1] === "devices" && parts[3] === "registrations" && parts[4] === cfg.passTypeId) {
    const device = parts[2];
    const serial = parts[5];
    if (serial) {
      if (!(await authorized(serial))) return new Response(null, { status: 401 });
      if (req.method === "POST") {
        const { pushToken } = await req.json();
        const [prev] = await sql`select 1 from mk_apple_registrations where device_library_id = ${device} and serial = ${serial}`;
        await sql`insert into mk_apple_registrations (device_library_id, serial, push_token)
          values (${device}, ${serial}, ${String(pushToken)})
          on conflict (device_library_id, serial) do update set push_token = excluded.push_token`;
        return new Response(null, { status: prev ? 200 : 201 });
      }
      if (req.method === "DELETE") {
        await sql`delete from mk_apple_registrations where device_library_id = ${device} and serial = ${serial}`;
        return new Response(null, { status: 200 });
      }
    } else if (req.method === "GET") {
      const since = new URL(req.url).searchParams.get("passesUpdatedSince");
      const sinceDate = since ? new Date(Number(since)) : new Date(0);
      const rows = await sql`select c.serial, c.updated_at from mk_apple_registrations r
        join mk_customers c on c.serial = r.serial
        where r.device_library_id = ${device} and c.updated_at > ${sinceDate}`;
      if (rows.length === 0) return new Response(null, { status: 204 });
      const last = Math.max(...rows.map((r) => new Date(r.updated_at).getTime()));
      return Response.json({ serialNumbers: rows.map((r) => r.serial), lastUpdated: String(last) });
    }
  }
  // v1/passes/{passTypeId}/{serial}
  if (parts[1] === "passes" && parts[2] === cfg.passTypeId && parts[3] && req.method === "GET") {
    if (!(await authorized(parts[3]))) return new Response(null, { status: 401 });
    return pkpassResponse(parts[3], req.headers.get("if-modified-since"));
  }
  return new Response(null, { status: 404 });
}

// ---------- Router ----------

async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/mrkey(?=\/|$)/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  const method = req.method;
  const body = async () => (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (parts[0] === "apple") return appleWebService(req, parts.slice(1));
  if (parts[0] !== "api") return json({ name: "Mr Key API", ok: true });
  const r = parts.slice(1).join("/");

  if (r === "health") {
    // deno-lint-ignore no-explicit-any
    const clientCerts = typeof (Deno as any).createHttpClient === "function";
    return json({ ok: true, apple: appleConfig().enabled, google: google.googleConfig().enabled, apns_client_certs: clientCerts });
  }
  if (r === "signup" && method === "POST") return json(await signup(await body()), 201);
  if (r === "login" && method === "POST") return json(await login(await body()));
  if (r === "staff-login" && method === "POST") return json(await staffLogin(await body()));
  if (r === "logout" && method === "POST") {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
    await sql`delete from mk_sessions where token_hash = ${await sha256Hex(token)}`;
    return json({ ok: true });
  }
  if (r === "me" && method === "GET") return json(await dashboard(await requireSession(req)));
  if (r === "merchant" && method === "PUT") return json(await updateMerchant(await requireSession(req, "owner"), await body()));
  if (r === "password" && method === "PUT") return json(await changePassword(await requireSession(req, "owner"), await body()));
  if (r === "customers" && method === "GET") return json(await listCustomers(await requireSession(req, "owner"), url));
  if (r === "customers" && method === "POST") return json(await createCustomer(await requireSession(req), await body()), 201);
  if (parts[1] === "customers" && parts[2]) {
    const id = parts[2];
    if (!parts[3] && method === "GET") return json(await customerDetail(await requireSession(req, "owner"), id));
    if (!parts[3] && method === "PATCH") return json(await updateCustomer(await requireSession(req, "owner"), id, await body()));
    if (!parts[3] && method === "DELETE") return json(await deleteCustomer(await requireSession(req, "owner"), id));
    if (parts[3] === "adjust" && method === "POST") return json(await adjustStamps(await requireSession(req, "owner"), id, await body()));
  }
  if (r === "lookup" && method === "GET") return json(await lookup(await requireSession(req), url));
  if (r === "today" && method === "GET") return json(await today(await requireSession(req)));
  if (r === "stamp" && method === "POST") return json(await stamp(await requireSession(req), await body()));
  if (r === "stamp/undo" && method === "POST") return json(await undoStamp(await requireSession(req), await body()));
  // "redeem" se conserva por compatibilidad con versiones anteriores del mostrador.
  if ((r === "redeem" || r === "rewards/deliver") && method === "POST") return json(await deliverReward(await requireSession(req), await body()));
  if (r === "rewards/undo" && method === "POST") return json(await undoDeliver(await requireSession(req), await body()));
  if (r === "rewards" && method === "GET") return json(await listRewards(await requireSession(req, "owner"), url));
  if (r === "campaigns" && method === "GET") return json(await listCampaigns(await requireSession(req, "owner")));
  if (r === "campaigns" && method === "POST") return json(await campaign(await requireSession(req, "owner"), await body()));

  // Público
  if (parts[1] === "public") {
    const [, , kind, id, extra] = parts;
    if (kind === "m" && id && !extra && method === "GET") return json(await publicMerchant(id));
    if (kind === "m" && id && extra === "logo.png") return logoPng(id);
    if (kind === "m" && id && extra === "join" && method === "POST") return json(await join(id, await body()), 201);
    if (kind === "card" && id && !extra && method === "GET") return json(await publicCard(id));
    if (kind === "card" && id && extra === "pass.pkpass") return pkpassResponse(id);
    if (kind === "card" && id && extra === "google") return json(await googleSave(id, req.headers.get("origin")));
    if (kind === "card" && id && extra === "prefs" && method === "POST") return json(await cardPrefs(id, await body()));
  }
  throw new HttpError(404, "Ruta no encontrada.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  try {
    return await route(req);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Error interno. Intenta de nuevo." }, 500);
  }
});
