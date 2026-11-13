# Mr Key LKM’r

Tarjetas de lealtad digitales para negocios locales (barberías, cafeterías, salones, veterinarias, tiendas). Viven en Apple Wallet, Google Wallet o como tarjeta web, sin que el cliente descargue ninguna app.

Este proyecto está separado de los demás sitios del repo: todo vive dentro de `mrkey/`.

## Cómo funciona

1. **El negocio crea su cuenta** en `panel.html`: nombre, giro, logo y colores. Según el giro se sugiere un programa (barbería: 8 sellos = corte gratis).
2. **Imprime su QR de alta** (pestaña *Mostrador y QR*) y lo pone en el mostrador.
3. **El cliente escanea el QR** con la cámara (`unirse.html`), escribe nombre y celular, y obtiene su tarjeta (`tarjeta.html`) con su propio código QR. Puede guardarla en Wallet o en la pantalla de inicio.
4. **El personal sella** desde su celular en `sellar.html` con el código del negocio y un PIN. Escanea el QR de la tarjeta (o busca al cliente por su celular) y toca **+1 sello** (o +2/+3 para promociones de sello doble). El sello aparece al instante en el teléfono del cliente. Si el cliente es nuevo y no quiere escanear, el personal lo da de alta ahí mismo y le manda su tarjeta por WhatsApp.
5. **Al juntar los sellos** se desbloquea el premio y el mostrador pregunta si se entrega ahora. El premio queda **pendiente** hasta que el personal confirma “Sí, ya se lo entregué”; se registra quién lo entregó y a qué hora. Si lo deja para otra visita, el premio sigue en su tarjeta y en *Premios → Por entregar* del panel. Un sello o una entrega por error se pueden **deshacer** en los primeros 15 minutos (el dueño puede deshacer entregas hasta 7 días después).
6. **El dueño ve sus métricas** en el panel: clientes, visitas, clientes inactivos (más de N días sin venir) e **ingresos recuperados** (inactivos que volvieron × ticket promedio).
7. **Campañas sin SMS:** el dueño escribe un mensaje para un segmento (inactivos, a 1 sello del premio, con premio sin canjear, o todos). Llega a la tarjeta y, con Wallet activado, como notificación en la pantalla de bloqueo. Solo se envía a quienes aceptaron recibir promociones.
8. **Alertas por cercanía:** si el negocio guarda la ubicación del local, los pases de Apple Wallet de clientes **inactivos** incluyen esa ubicación, y el iPhone les sugiere la tarjeta cuando pasan cerca. Mr Key nunca recibe la ubicación del cliente.

## Páginas

| Página | Para quién | Qué hace |
|---|---|---|
| `index.html` | Comerciantes | Landing con precios y registro |
| `panel.html` | Dueño | Pendientes del día, métricas, premios por entregar y entregados, ficha de cada cliente (historial, nota, ajuste de sellos, eliminar), campañas, diseño de la tarjeta, QR, PIN y cuenta |
| `sellar.html` | Personal | Escáner para sellar, entregar premios con confirmación, deshacer errores, dar de alta clientes y ver los movimientos del día (se puede instalar como app) |
| `unirse.html?m=<negocio>` | Cliente | Alta en el programa |
| `tarjeta.html?s=<serial>` | Cliente | Tarjeta con sellos, progreso, premios pendientes y entregados, actividad, mensajes y opción de dejar de recibir promociones; se actualiza sola |
| `aviso.html` | Todos | Aviso de privacidad base |

**SEO:** solo `index.html` y `aviso.html` se indexan; panel, sellar, unirse y tarjeta llevan `noindex`. La portada tiene Open Graph (`assets/og.png`, 1200×630), datos estructurados (Organization, SoftwareApplication con los 3 planes y FAQPage) y preguntas frecuentes. Si cambian precios o preguntas, actualiza también el JSON-LD de `index.html` y `llms.txt`. `sitemap.xml` se da de alta a mano en Google Search Console, porque en GitHub Pages el `robots.txt` solo funciona en la raíz del dominio. Contacto de ventas: WhatsApp 449 209 4034 y officiallukamon@gmail.com.

## Arquitectura

- **Frontend:** HTML, CSS y JS sin build, servido por GitHub Pages. `assets/app.js` tiene la URL de la API.
- **API:** una Edge Function de Supabase (`supabase/functions/mrkey`) en Deno, publicada en
  `https://lsvyryanshcuysowlysp.supabase.co/functions/v1/mrkey`.
- **Base de datos:** Postgres de Supabase, tablas `mk_*` (ver `supabase/migrations`). Cada premio ganado es una fila en `mk_rewards` (pendiente mientras `delivered_at` sea nulo); `mk_customers.rewards_available` es solo el contador. RLS activo sin políticas: el navegador nunca toca la base directamente, todo pasa por la API.
- **Seguridad:** contraseñas y PIN con PBKDF2; sesiones con token aleatorio (se guarda solo su hash); bloqueo de 15 min tras intentos fallidos; antifraude con minutos mínimos entre sellos del mismo cliente; el personal no ve métricas, lista de clientes ni campañas (`/me` le regresa solo lo necesario para sellar).

## Probar en local

Con Postgres y Deno instalados: crea una base, aplica las migraciones en orden y corre `SUPABASE_DB_URL=postgres://… SUPABASE_URL=http://localhost:8000 deno run -A supabase/functions/mrkey/index.ts`. Sirve la carpeta con cualquier servidor estático y abre `http://localhost:8080/panel.html?api=http://localhost:8000/functions/v1/mrkey/api` (el parámetro `api` solo funciona en `localhost`).

## Activar Apple Wallet y Google Wallet

Hoy la tarjeta funciona como tarjeta web. Los botones de Wallet aparecen solos al configurar estos secretos en Supabase (*Edge Functions → Secrets*):

**Apple Wallet** (requiere Apple Developer Program, USD 99 al año):
1. En developer.apple.com crea un **Pass Type ID** (p. ej. `pass.com.mrkey.loyalty`) y su certificado.
2. Instálalo en una Mac, expórtalo desde Llavero como `.p12` y conviértelo a base64: `base64 -i cert.p12 | pbcopy`.
3. Secretos: `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_P12_BASE64`, `APPLE_P12_PASSWORD`.

**Google Wallet** (gratis):
1. Crea una cuenta de emisor en Google Pay & Wallet Console y anota el **Issuer ID**.
2. En Google Cloud habilita *Google Wallet API*, crea una cuenta de servicio con llave JSON y agrégala como usuario del emisor.
3. Secretos: `GOOGLE_ISSUER_ID`, `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` (el campo `private_key` del JSON).

Revisa el estado en `…/functions/v1/mrkey/api/health`.

## Desplegar cambios del backend

Primero aplica las migraciones pendientes de `supabase/migrations` (SQL Editor de Supabase o `supabase db push`) y después despliega la función:

```bash
supabase functions deploy mrkey --project-ref lsvyryanshcuysowlysp --no-verify-jwt
```

(`--no-verify-jwt` porque la API maneja su propia autenticación.)

## Pendiente

- Cobro de suscripciones (Stripe / Mercado Pago). Hoy todas las cuentas quedan en prueba de 14 días sin límite real.
- Límites por plan (clientes activos, campañas al mes).
- Recuperar contraseña por correo.
- Recordatorios automáticos (p. ej. mensaje a los 7 días de un premio sin canjear).
- Multi-sucursal e integraciones con POS (fase 3 del roadmap).
