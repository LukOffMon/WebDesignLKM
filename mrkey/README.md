# Mr Key LKM’r

Tarjetas de lealtad digitales para negocios locales (barberías, cafeterías, salones, veterinarias, tiendas). Viven en Apple Wallet, Google Wallet o como tarjeta web, sin que el cliente descargue ninguna app.

Este proyecto está separado de los demás sitios del repo: todo vive dentro de `mrkey/`.

## Cómo funciona

1. **El negocio crea su cuenta** en `panel.html`: nombre, giro, logo y colores. Según el giro se sugiere un programa (barbería: 8 sellos = corte gratis).
2. **Imprime su QR de alta** (pestaña *Mostrador y QR*) y lo pone en el mostrador.
3. **El cliente escanea el QR** con la cámara (`unirse.html`), escribe nombre y celular, y obtiene su tarjeta (`tarjeta.html`) con su propio código QR. Puede guardarla en Wallet o en la pantalla de inicio.
4. **El personal sella** desde su celular en `sellar.html` con el código del negocio y un PIN. Escanea el QR de la tarjeta (o busca al cliente por su celular) y toca **+1 sello**. El sello aparece al instante en el teléfono del cliente.
5. **Al juntar los sellos** se desbloquea el premio. El personal lo canjea desde la misma pantalla.
6. **El dueño ve sus métricas** en el panel: clientes, visitas, clientes inactivos (más de N días sin venir) e **ingresos recuperados** (inactivos que volvieron × ticket promedio).
7. **Campañas sin SMS:** el dueño escribe un mensaje para un segmento (inactivos, a 1 sello del premio, con premio sin canjear, o todos). Llega a la tarjeta y, con Wallet activado, como notificación en la pantalla de bloqueo. Solo se envía a quienes aceptaron recibir promociones.
8. **Alertas por cercanía:** si el negocio guarda la ubicación del local, los pases de Apple Wallet de clientes **inactivos** incluyen esa ubicación, y el iPhone les sugiere la tarjeta cuando pasan cerca. Mr Key nunca recibe la ubicación del cliente.

## Páginas

| Página | Para quién | Qué hace |
|---|---|---|
| `index.html` | Comerciantes | Landing con precios y registro |
| `panel.html` | Dueño | Métricas, clientes, campañas, diseño de la tarjeta, QR y PIN |
| `sellar.html` | Personal | Escáner para sellar y canjear premios (se puede instalar como app) |
| `unirse.html?m=<negocio>` | Cliente | Alta en el programa |
| `tarjeta.html?s=<serial>` | Cliente | Tarjeta con sellos, QR, premios y mensajes; se actualiza sola |
| `aviso.html` | Todos | Aviso de privacidad base |

**SEO:** solo `index.html` y `aviso.html` se indexan; panel, sellar, unirse y tarjeta llevan `noindex`. La portada tiene Open Graph (`assets/og.png`, 1200×630), datos estructurados (Organization, SoftwareApplication con los 3 planes y FAQPage) y preguntas frecuentes. Si cambian precios o preguntas, actualiza también el JSON-LD de `index.html` y `llms.txt`. `sitemap.xml` se da de alta a mano en Google Search Console, porque en GitHub Pages el `robots.txt` solo funciona en la raíz del dominio. Contacto de ventas: WhatsApp 449 209 4034 y officiallukamon@gmail.com.

## Arquitectura

- **Frontend:** HTML, CSS y JS sin build, servido por GitHub Pages. `assets/app.js` tiene la URL de la API.
- **API:** una Edge Function de Supabase (`supabase/functions/mrkey`) en Deno, publicada en
  `https://lsvyryanshcuysowlysp.supabase.co/functions/v1/mrkey`.
- **Base de datos:** Postgres de Supabase, tablas `mk_*` (ver `supabase/migrations`). RLS activo sin políticas: el navegador nunca toca la base directamente, todo pasa por la API.
- **Seguridad:** contraseñas y PIN con PBKDF2; sesiones con token aleatorio (se guarda solo su hash); bloqueo de 15 min tras intentos fallidos; antifraude con minutos mínimos entre sellos del mismo cliente; el personal no ve clientes ni campañas.

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

```bash
supabase functions deploy mrkey --project-ref lsvyryanshcuysowlysp --no-verify-jwt
```

(`--no-verify-jwt` porque la API maneja su propia autenticación.)

## Pendiente

- Cobro de suscripciones (Stripe / Mercado Pago). Hoy todas las cuentas quedan en prueba de 14 días sin límite real.
- Límites por plan (clientes activos, campañas al mes).
- Recuperar contraseña por correo.
- Multi-sucursal e integraciones con POS (fase 3 del roadmap).
