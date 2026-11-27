# Proyectos web · LKM’r

| Sitio | Carpeta | Descripción |
|---|---|---|
| Cantina Real Ags | `cantina-real/` | Cantina y bar en Jesús María. Carta 2025 completa con cuenta dividida, promo de cada día, kit de 20 posters (post + historia) y 6 videos para IG, reservas y posadas por WhatsApp (449 415 9466). Plan de crecimiento para el dueño en `cantina-real/plan/`. |
| MK Firma de Abogados | `mk-abogados/` | Bufete penal (MK Nacional · Bogacia). Áreas de práctica, urgencias 24/7 y consultas confidenciales. |
| JkJ Stock | `jkj-stock/` | Perfumería (diseñador y árabes) con carrito, 5 % de descuento desde $2,000 y pedidos por WhatsApp (449 209 4034). |
| MiCarpintero | `micarpintero/` | Taller digital de muebles a medida (Next.js + Three.js): diseño paramétrico en 3D, despiece, plano de corte optimizado, presupuesto, PDF de fabricación y guía de armado desde manuales PDF. Todo en el navegador. |
| The Crunchy Corner · Cuatro Hojas | `crunchy-corner/` | Menú QR de la sucursal Plaza Cuatro Hojas: carta completa con precios, 18 salsas con ruleta, promo de cada día y pedidos por WhatsApp (449 446 4730). Sin frameworks. |

`index.html` en la raíz es el portafolio de LKM'r: enlaza todos los proyectos públicos de los cuatro repos (WebDesignLKM, LKMLPR, CuauhtemocUca y HighPerformanceClaude). Para agregar o quitar uno, edita la lista `GROUPS` del script.

`mrkey/` ya no se muestra: Mr Key ahora es la lealtad de Rojo 87 (`LKMLPR/rojo87/lealtad/`). Solo quedan sus redirecciones para que las tarjetas y los QR viejos sigan llegando a la página nueva. Para verlos localmente: `python3 -m http.server` y abre http://localhost:8000.

## Notas

Regla para todos los sitios: **solo fotos reales del negocio** (nada de bancos de imágenes) y en el menú solo lo que aparece en sus fotos o publicaciones. Sin carta real no se publican precios: el carrito muestra "Precio en barra / en sucursal" y el mensaje de WhatsApp pide confirmar precios y total. Para agregar un platillo con precio, se añade a `MENU` con `price` numérico y foto real.

- **Cantina Real:** carta y precios = carta oficial 2025 (PDF "CANTINA REAL" y carta de bebidas; la "CARTA REAL 2024" ya no aplica). Todo sale de `cantina-real/data.js`: carta (`MENU`), promo de cada día (`PROMOS`, propuesta de LKM'r por confirmar con el dueño), extras, posters con su texto para IG y videos. Los posters (`posters/` 4:5 y `posters/story/` 9:16), los reels de 15 s y los loops de 5 s (`videos/`) se generan desde `cantina-real/_tools/studio.html` con `node _tools/render.cjs posters|videos|gifs` (requiere `npm i playwright`, Microsoft Edge y ffmpeg); después de los posters hay que correr `python _tools/optimize.py` (cuantiza los PNG, crea las miniaturas WebP de la cuadrícula y rehace `posters/cantina-real-posters.zip`). Los reels salen con pista silenciosa a propósito: en IG se les pone un audio en tendencia. La promo del día usa la hora de la Ciudad de México y antes de las 2 AM cuenta como el día anterior. `cantina-real/plan/` es el plan de crecimiento para el dueño (noindex). Por confirmar: precio de botella de Centenario Azul y Matusalem Platino (la carta no lo trae), "Agua mineral $100" (¿preparada?), horario en Facebook (dice 9:00–23:00) y estacionamiento. Fotos reales = las 5 de `assets/` (baja resolución; conviene una sesión de fotos).
- **MK Abogados:** falta foto del Lic. Macías Ponce, dirección de la oficina y horario de consultas (el sitio dice "con cita previa"). Confirmar el teléfono de oficina y el correo.
- **JkJ Stock:** precios = precio del proveedor + 25 % (`CONFIG.markup`), redondeado al peso. Las imágenes de producto están alojadas en `jkj-stock/assets/products/` para que no dependan de otro sitio.
- **JkJ Stock, catálogo:** solo perfumes. Los productos están en `jkj-stock/assets/catalog.js`; la página se genera desde `jkj-stock/_plantilla.html` con `python3 jkj-stock/build.py`.

- **MiCarpintero:** el código fuente está en `micarpintero/` (Next.js, TypeScript estricto). Después de editarlo hay que correr `npm install && npm run publish` dentro de `micarpintero/` para regenerar `index.html` y `_next/`. Precios de tableros y herrajes de referencia en `lib/engine/materials.ts` y `lib/engine/calculator.ts`.

- **The Crunchy Corner (Cuatro Hojas):** menú, precios y promos = carta oficial en PDF y los 7 carteles de "Promociones Semanales" de su OneDrive (consulta del 17 nov. 2026). Las fotos son las de la carta (recortes con transparencia en `crunchy-corner/img/`). Todo vive en `crunchy-corner/index.html`: platillos en `MENU`, salsas en `SAUCES`, bebidas en `DRINKS` y promos en `PROMOS`. La promo del día se elige con la hora de la Ciudad de México. Los pedidos van al WhatsApp de Cuatro Hojas (449 446 4730). Kit de venta en `crunchy-corner/entrega/` (propuesta PDF, imprimibles, QR y mensaje; ver su `LEEME.md`); precio acordado $1,200 pago único. Por confirmar: dirección exacta y horario de la sucursal, si las promos de 2024 (domingo, miércoles, jueves y sábado) siguen vigentes, y el enlace de su tienda en Uber Eats.

---
Sitios diseñados y desarrollados por **LKM’r**.
