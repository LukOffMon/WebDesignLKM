# Proyectos web · LKM’r

| Sitio | Carpeta | Descripción |
|---|---|---|
| Cantina Real Ags | `cantina-real/` | Cantina y bar en Jesús María. Menú con comanda, reservaciones y posadas (WhatsApp 449 415 9466). |
| MK Firma de Abogados | `mk-abogados/` | Bufete penal (MK Nacional · Bogacia). Áreas de práctica, urgencias 24/7 y consultas confidenciales. |
| Mr Key | `mrkey/` | Plataforma de tarjetas de lealtad (SaaS): panel del negocio, sellado por QR, tarjeta del cliente y API en Supabase. Ver `mrkey/README.md`. |
| JkJ Stock | `jkj-stock/` | Perfumería (diseñador y árabes) con carrito, 5 % de descuento desde $2,000 y pedidos por WhatsApp (449 209 4034). |
| MiCarpintero | `micarpintero/` | Taller digital de muebles a medida (Next.js + Three.js): diseño paramétrico en 3D, despiece, plano de corte optimizado, presupuesto, PDF de fabricación y guía de armado desde manuales PDF. Todo en el navegador. |
| Ki'jaw Cochinita Pibil | `kijaw/` | Cochinita pibil yucateca a domicilio (zona norte). Noche yucateca con GSAP + Lenis: vapor en canvas, escena fija de la tradición del pib, calculadora por personas, armador de pedido que abre WhatsApp (449 439 0199), medidor de habanero, ideas para servir y QR para compartir. |
| The Crunchy Corner · Cuatro Hojas | `crunchy-corner/` | Menú QR de la sucursal Plaza Cuatro Hojas: carta completa con precios, 18 salsas con ruleta, promo de cada día y pedidos por WhatsApp (449 446 4730). Sin frameworks. Kit de venta en `crunchy-corner/entrega/`. |

`index.html` en la raíz es el portafolio de LKM'r: enlaza todos los proyectos públicos de los cuatro repos (WebDesignLKM, LKMLPR, CuauhtemocUca y HighPerformanceClaude). Para agregar o quitar uno, edita la lista `GROUPS` del script.

`mrkey/` ya no se muestra: Mr Key ahora es la lealtad de Rojo 87 (`LKMLPR/rojo87/lealtad/`). Solo quedan sus redirecciones para que las tarjetas y los QR viejos sigan llegando a la página nueva. Para verlos localmente: `python3 -m http.server` y abre http://localhost:8000.

## Notas

Regla para todos los sitios: **solo fotos reales del negocio** (nada de bancos de imágenes) y en el menú solo lo que aparece en sus fotos o publicaciones. Sin carta real no se publican precios: el carrito muestra "Precio en barra / en sucursal" y el mensaje de WhatsApp pide confirmar precios y total. Para agregar un platillo con precio, se añade a `MENU` con `price` numérico y foto real.

- **Cantina Real:** menú = gringa de sabores, cerveza y tequilas de la vitrina (lo que se ve en sus fotos de Facebook). Falta la carta completa con precios. Horario según Google (9:00–2:00; en Facebook dice 9:00–23:00, por confirmar). El video `promo/cantina-real-promo-30s.mp4` usa solo las 5 fotos reales de `cantina-real/assets/`.
- **MK Abogados:** falta foto del Lic. Macías Ponce, dirección de la oficina y horario de consultas (el sitio dice "con cita previa"). Confirmar el teléfono de oficina y el correo.
- **MiCarpintero:** el código fuente está en `micarpintero/` (Next.js, TypeScript estricto). Después de editarlo hay que correr `npm install && npm run publish` dentro de `micarpintero/` para regenerar `index.html` y `_next/`. Precios de tableros y herrajes de referencia en `lib/engine/materials.ts` y `lib/engine/calculator.ts`.
- **JkJ Stock:** precios = precio del proveedor + 25 % (`CONFIG.markup`), redondeado al peso. Las imágenes de producto están alojadas en `jkj-stock/assets/products/` para que no dependan de otro sitio.
- **JkJ Stock, catálogo:** solo perfumes. Los productos están en `jkj-stock/assets/catalog.js`; la página se genera desde `jkj-stock/_plantilla.html` con `python3 jkj-stock/build.py`.

- **Ki'jaw:** todo sale del flyer del negocio: receta 100 % original yucateca, litro $280 (incluye frijoles negros, cebolla morada y salsa de habanero), medio litro $150 (ideal para 2 a 3 personas), entregas gratis a domicilio en el norte y WhatsApp 449 439 0199. No hay fotos reales: todo el arte son ilustraciones SVG propias. La calculadora usa medio litro por cada 2.5 personas (sale de "2 a 3 personas") y lo marca como aproximado. La tradición (achiote, naranja agria, hoja de plátano, pib) se cuenta como la tradición del platillo, no como el proceso exacto del negocio. QR: `kijaw/assets/qr.png` y una tarjeta para imprimir o compartir en `kijaw/assets/qr-tarjeta.png` (los dos apuntan a https://lukoffmon.github.io/WebDesignLKM/kijaw/). Por confirmar: horario, qué colonias cuentan como "norte", si se puede pasar a recoger (el formulario lo ofrece), formas de pago y con cuánta anticipación hay que pedir.

- **The Crunchy Corner (Cuatro Hojas):** menú, precios y promos = carta oficial en PDF y los 7 carteles de "Promociones Semanales" de su OneDrive (consulta del 17 nov. 2026). Fotos = las de la carta (recortes con transparencia en `crunchy-corner/img/`). Todo vive en `crunchy-corner/index.html`: platillos en `MENU`, salsas en `SAUCES`, bebidas en `DRINKS` y promos en `PROMOS`; la promo del día se elige con la hora de Ciudad de México. Pedidos al WhatsApp de Cuatro Hojas (449 446 4730). Kit de venta (propuesta, imprimibles, QR y mensaje) en `crunchy-corner/entrega/`, ver su `LEEME.md`; precio acordado $1,200 pago único. Por confirmar: dirección y horario de la sucursal, si las promos de 2024 (domingo, miércoles, jueves y sábado) siguen vigentes y el enlace de Uber Eats.

---
Sitios diseñados y desarrollados por **LKM’r**.

**Dueño y fundador:** Luka Lara  
**Contacto:** 449 209 4034 ([WhatsApp](https://wa.me/524492094034))
