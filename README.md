# Proyectos web · LKM’r

| Sitio | Carpeta | Descripción |
|---|---|---|
| Vive Cafeto | `cafeto/` | Café · restaurante · bar. Menú digital, pedidos y reservaciones. |
| Burdo San Telmo | `burdo/` | Parrilla & bar. Cortes con selección de término, pedidos y reservaciones. |
| Cantina Real Ags | `cantina-real/` | Cantina y bar en Jesús María. Menú con comanda, reservaciones y posadas (WhatsApp 449 415 9466). |
| MK Firma de Abogados | `mk-abogados/` | Bufete penal (MK Nacional · Bogacia). Áreas de práctica, urgencias 24/7 y consultas confidenciales. |
| Mr Key | `mrkey/` | Plataforma de tarjetas de lealtad (SaaS): panel del negocio, sellado por QR, tarjeta del cliente y API en Supabase. Ver `mrkey/README.md`. |
| Restaurante Oaxakita | `oaxakita/` | Cocina oaxaqueña en Valle Dorado. React + Framer Motion: partículas, sonido, menú completo con precios, pedidos y reservas por WhatsApp. |
| Texas BBQ Ags | `texas-bbq/` | Smokehouse estilo Texas en Puerto las Hadas. Horario en vivo, pedidos por WhatsApp, calculadora para grupos y Uber Eats (449 550 4456). |
| JkJ Stock | `jkj-stock/` | Perfumería (diseñador y árabes) con carrito, 5 % de descuento desde $2,000 y pedidos por WhatsApp (449 209 4034). |
| MiCarpintero | `micarpintero/` | Taller digital de muebles a medida (Next.js + Three.js): diseño paramétrico en 3D, despiece, plano de corte optimizado, presupuesto, PDF de fabricación y guía de armado desde manuales PDF. Todo en el navegador. |
| Hannah & Michael Ags | `hannah-michael/` | Brunch y desayunos en Blvd. Colosio 507. GSAP + Lenis: ingredientes ilustrados con parallax, plato que se arma con el scroll, favoritos en horizontal, menú con comanda, quiz de antojo y horario en vivo. Pedidos por Uber Eats y Rappi. |

`index.html` en la raíz es un portafolio con enlaces a todos los sitios. Para verlos localmente: `python3 -m http.server` y abre http://localhost:8000.

## Notas

Regla para todos los sitios: **solo fotos reales del negocio** (nada de bancos de imágenes) y en el menú solo lo que aparece en sus fotos o publicaciones. Sin carta real no se publican precios: el carrito muestra "Precio en barra / en sucursal" y el mensaje de WhatsApp pide confirmar precios y total. Para agregar un platillo con precio, se añade a `MENU` con `price` numérico y foto real.

- **Cantina Real:** menú = gringa de sabores, cerveza y tequilas de la vitrina (lo que se ve en sus fotos de Facebook). Falta la carta completa con precios. Horario según Google (9:00–2:00; en Facebook dice 9:00–23:00, por confirmar). El video `promo/cantina-real-promo-30s.mp4` usa solo las 5 fotos reales de `cantina-real/assets/`.
- **MK Abogados:** falta foto del Lic. Macías Ponce, dirección de la oficina y horario de consultas (el sitio dice "con cita previa"). Confirmar el teléfono de oficina y el correo.
- **Cafeto:** menú = enchiladas, toast con huevo y sangría (fotos de @cafetoags). Falta la carta completa con precios.
- **Burdo:** menú = cortes, parrillada, sangría, coctel de pitaya y carajillo (fotos del negocio). Falta la carta completa con precios; horarios de cierre por confirmar.
- **Oaxakita:** menú y precios = carta oficial en PDF (75 productos). Fotos reales: fachada, salón y carnes asadas (las tres son de baja resolución, conviene pedir originales); el resto de platillos usa arte generado (grecas + ícono), no fotos de banco. El código fuente es `oaxakita/src/Oaxakita.jsx`; después de editarlo hay que correr `npm install && npm run build` dentro de `oaxakita/` para regenerar `assets/app.js` y `assets/app.css`. WhatsApp de pedidos y reservas: 449 580 3465 (confirmado por el cliente). Por confirmar: hora de cierre.
- **MiCarpintero:** el código fuente está en `micarpintero/` (Next.js, TypeScript estricto). Después de editarlo hay que correr `npm install && npm run publish` dentro de `micarpintero/` para regenerar `index.html` y `_next/`. Precios de tableros y herrajes de referencia en `lib/engine/materials.ts` y `lib/engine/calculator.ts`.
- **JkJ Stock:** precios = precio del proveedor + 25 % (`CONFIG.markup`), redondeado al peso. Las imágenes de producto están alojadas en `jkj-stock/assets/products/` para que no dependan de otro sitio.
- **JkJ Stock, catálogo:** solo perfumes. Los productos están en `jkj-stock/assets/catalog.js`; la página se genera desde `jkj-stock/_plantilla.html` con `python3 jkj-stock/build.py`.
- **Texas BBQ Ags:** menú y precios = listado de Uber Eats (brisket 300/500 g, costilla de res 500 g, costilla de cerdo 300/500 g, sándwiches de brisket y pulled pork, papas); en el sitio se marcan como "precios de referencia". Elote, salchicha y bebidas salen en sus fotos pero sin precio ("precio en sucursal"). Fotos reales: fachada, salón, costilla de res, arte del brisket y tres miniaturas recortadas de Google (baja resolución, conviene pedir originales). Historia y "12 a 15 horas" vienen de la entrevista en LJA.MX (feb. 2025). El aviso "Solo quedan N porciones" solo aparece si el negocio llena `STOCK` en el script; `REVIEWS` está vacío hasta tener reseñas textuales autorizadas (mientras, la búsqueda abre Google). Por confirmar: que 449 550 4456 tenga WhatsApp, si venden tarjetas de regalo, el tipo de leña y el número exterior (Rappi dice 232; Google, Instagram y Uber Eats dicen 229).

- **Hannah & Michael Ags:** menú y precios = tienda de Hannah & Michael Aguascalientes en Uber Eats (consulta del 9 nov. 2026): Chilaquiles Hannah 210, Chilaquiles Suizos 175, Bagel Hannah 199, Bagel Americano 175, Molletes 113, Molletitos 89, Huevos al gusto 137, Enchiladas Suizas 189, Croque Madame 182, Torta de chilaquiles 95, Capuchino 82, Latte 82 y Jugo de naranja 46; en el sitio se marcan como "precios de referencia". Hot cakes, waffles y omelette salen como categorías en Uber Eats pero sin precio en Aguascalientes ("precio en sucursal"). Fotos reales (las mandó el cliente): fachada, salón, terraza, dos mesas vistas desde arriba (`mesa.jpg`, `brunch.jpg`), chilaquiles con capuchino, enchiladas, Croque Madame y hot cakes (recorte de `brunch.jpg`), en `hannah-michael/assets/` (son de 720–780 px, conviene pedir originales en alta). Se usan en la sección "El lugar", en las tarjetas del Croque Madame, las Enchiladas Suizas y los hot cakes y en "Visítanos"; el resto del arte son ilustraciones SVG propias. El carrito manda a Uber Eats o Rappi y permite copiar la lista; si el cliente da un WhatsApp o teléfono, se escribe en `CONFIG.whatsapp` / `CONFIG.phone` dentro del script y aparecen los botones. Por confirmar: horario (se usa el de Facebook: lun.–sáb. 8:30–23:00, dom. 8:30–22:00; Uber Eats dice que cierra a las 21:30 y un TikTok dice 8:00–15:00), el teléfono (Uber Eats lista 479 409 9357, que es lada de León, por eso no se publica), el área infantil y el valet parking (salen en un TikTok) y la historia detrás del nombre.

---
Sitios diseñados y desarrollados por **LKM’r**.

**Dueño y fundador:** Luka Lara  
**Contacto:** 449 209 4034 ([WhatsApp](https://wa.me/524492094034))
