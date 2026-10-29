# Proyectos web · LKM’r

| Sitio | Carpeta | Descripción |
|---|---|---|
| Vive Cafeto | `cafeto/` | Café · restaurante · bar. Menú digital, pedidos y reservaciones. |
| Burdo San Telmo | `burdo/` | Parrilla & bar. Cortes con selección de término, pedidos y reservaciones. |
| Cantina Real Ags | `cantina-real/` | Cantina y bar en Jesús María. Menú con comanda, reservaciones y posadas (WhatsApp 449 415 9466). |
| MK Firma de Abogados | `mk-abogados/` | Bufete penal (MK Nacional · Bogacia). Áreas de práctica, urgencias 24/7 y consultas confidenciales. |
| Restaurante Oaxakita | `oaxakita/` | Cocina oaxaqueña en Valle Dorado. React + Framer Motion: partículas, sonido, menú completo con precios, pedidos y reservas por WhatsApp. |
| Texas BBQ Ags | `texas-bbq/` | Smokehouse estilo Texas en Puerto las Hadas. Horario en vivo, pedidos por WhatsApp, calculadora para grupos y Uber Eats (449 550 4456). |
| JkJ Stock | `jkj-stock/` | Perfumería (diseñador y árabes) con carrito, 5 % de descuento desde $2,000 y pedidos por WhatsApp (449 209 4034). |
| MiCarpintero | `micarpintero/` | Taller digital de muebles a medida (Next.js + Three.js): diseño paramétrico en 3D, despiece, plano de corte optimizado, presupuesto, PDF de fabricación y guía de armado desde manuales PDF. Todo en el navegador. |

`index.html` en la raíz es un portafolio con enlaces a todos los sitios. Para verlos localmente: `python3 -m http.server` y abre http://localhost:8000.

## Notas

Regla para todos los sitios: **solo fotos reales del negocio** (nada de bancos de imágenes) y en el menú solo lo que aparece en sus fotos o publicaciones. Sin carta real no se publican precios: el carrito muestra "Precio en barra / en sucursal" y el mensaje de WhatsApp pide confirmar precios y total. Para agregar un platillo con precio, se añade a `MENU` con `price` numérico y foto real.

- **Cantina Real:** menú = gringa de sabores, cerveza y tequilas de la vitrina (lo que se ve en sus fotos de Facebook). Falta la carta completa con precios. Horario según Google (9:00–2:00; en Facebook dice 9:00–23:00, por confirmar). El video `promo/cantina-real-promo-30s.mp4` todavía usa fotos de banco (nachos, ceviche, coctel) y hay que rehacerlo.
- **MK Abogados:** falta foto del Lic. Macías Ponce, dirección de la oficina y horario de consultas (el sitio dice "con cita previa"). Confirmar el teléfono de oficina y el correo.
- **Cafeto:** menú = enchiladas, toast con huevo y sangría (fotos de @cafetoags). Falta la carta completa con precios.
- **Burdo:** menú = cortes, parrillada, sangría, coctel de pitaya y carajillo (fotos del negocio). Falta la carta completa con precios; horarios de cierre por confirmar.
- **Oaxakita:** menú y precios = carta oficial en PDF (75 productos). Fotos reales: fachada, salón y carnes asadas (las tres son de baja resolución, conviene pedir originales); el resto de platillos usa arte generado (grecas + ícono), no fotos de banco. El código fuente es `oaxakita/src/Oaxakita.jsx`; después de editarlo hay que correr `npm install && npm run build` dentro de `oaxakita/` para regenerar `assets/app.js` y `assets/app.css`. WhatsApp de pedidos y reservas: 449 580 3465 (confirmado por el cliente). Por confirmar: hora de cierre.
- **JkJ Stock:** precios = precio del proveedor + 25 % (`CONFIG.markup`), redondeado al peso. Las imágenes de producto están alojadas en `jkj-stock/assets/products/` para que no dependan de otro sitio.
- **JkJ Stock, catálogo:** solo perfumes. Los productos están en `jkj-stock/assets/catalog.js`; la página se genera desde `jkj-stock/_plantilla.html` con `python3 jkj-stock/build.py`.

- **MiCarpintero:** el código fuente está en `micarpintero/` (Next.js, TypeScript estricto). Después de editarlo hay que correr `npm install && npm run publish` dentro de `micarpintero/` para regenerar `index.html` y `_next/`. Precios de tableros y herrajes de referencia en `lib/engine/materials.ts` y `lib/engine/calculator.ts`.

- **Texas BBQ Ags:** menú y precios = listado de Uber Eats (brisket 300/500 g, costilla de res 500 g, costilla de cerdo 300/500 g, sándwiches de brisket y pulled pork, papas); en el sitio se marcan como "precios de referencia". Elote, salchicha y bebidas salen en sus fotos pero sin precio ("precio en sucursal"). Fotos reales: fachada, salón, costilla de res, arte del brisket y tres miniaturas recortadas de Google (baja resolución, conviene pedir originales). Historia y "12 a 15 horas" vienen de la entrevista en LJA.MX (feb. 2025). El aviso "Solo quedan N porciones" solo aparece si el negocio llena `STOCK` en el script; `REVIEWS` está vacío hasta tener reseñas textuales autorizadas (mientras, la búsqueda abre Google). Por confirmar: que 449 550 4456 tenga WhatsApp, si venden tarjetas de regalo, el tipo de leña y el número exterior (Rappi dice 232; Google, Instagram y Uber Eats dicen 229).

---
Sitios diseñados y desarrollados por **LKM’r**.
