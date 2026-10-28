# Proyectos web · LKM’r

| Sitio | Carpeta | Descripción |
|---|---|---|
| Vive Cafeto | `cafeto/` | Café · restaurante · bar. Menú digital, pedidos y reservaciones. |
| Burdo San Telmo | `burdo/` | Parrilla & bar. Cortes con selección de término, pedidos y reservaciones. |
| Cantina Real Ags | `cantina-real/` | Cantina y bar en Jesús María. Menú con comanda, reservaciones y posadas (WhatsApp 449 415 9466). |
| MK Firma de Abogados | `mk-abogados/` | Bufete penal (MK Nacional · Bogacia). Áreas de práctica, urgencias 24/7 y consultas confidenciales. |
| Mr Key | `mrkey/` | Plataforma de tarjetas de lealtad (SaaS): panel del negocio, sellado por QR, tarjeta del cliente y API en Supabase. Ver `mrkey/README.md`. |
| Restaurante Oaxakita | `oaxakita/` | Cocina oaxaqueña en Valle Dorado. React + Framer Motion: partículas, sonido, menú completo con precios, pedidos y reservas por WhatsApp. |
| JkJ Stock | `jkj-stock/` | Perfumería (diseñador y árabes) con carrito, 5 % de descuento desde $2,000 y pedidos por WhatsApp (449 209 4034). |

`index.html` en la raíz es un portafolio con enlaces a todos los sitios. Para verlos localmente: `python3 -m http.server` y abre http://localhost:8000.

## Notas

Regla para todos los sitios: **solo fotos reales del negocio** (nada de bancos de imágenes) y en el menú solo lo que aparece en sus fotos o publicaciones. Sin carta real no se publican precios: el carrito muestra "Precio en barra / en sucursal" y el mensaje de WhatsApp pide confirmar precios y total. Para agregar un platillo con precio, se añade a `MENU` con `price` numérico y foto real.

- **Cantina Real:** menú = gringa de sabores, cerveza y tequilas de la vitrina (lo que se ve en sus fotos de Facebook). Falta la carta completa con precios. Horario según Google (9:00–2:00; en Facebook dice 9:00–23:00, por confirmar). El video `promo/cantina-real-promo-30s.mp4` usa solo las 5 fotos reales de `cantina-real/assets/`.
- **MK Abogados:** falta foto del Lic. Macías Ponce, dirección de la oficina y horario de consultas (el sitio dice "con cita previa"). Confirmar el teléfono de oficina y el correo.
- **Cafeto:** menú = enchiladas, toast con huevo y sangría (fotos de @cafetoags). Falta la carta completa con precios.
- **Burdo:** menú = cortes, parrillada, sangría, coctel de pitaya y carajillo (fotos del negocio). Falta la carta completa con precios; horarios de cierre por confirmar.
- **Oaxakita:** menú y precios = carta oficial en PDF (75 productos). Fotos reales: fachada, salón y carnes asadas (las tres son de baja resolución, conviene pedir originales); el resto de platillos usa arte generado (grecas + ícono), no fotos de banco. El código fuente es `oaxakita/src/Oaxakita.jsx`; después de editarlo hay que correr `npm install && npm run build` dentro de `oaxakita/` para regenerar `assets/app.js` y `assets/app.css`. Por confirmar: que 449 580 3465 tenga WhatsApp y la hora de cierre.
- **JkJ Stock:** precios = precio del proveedor + 25 % (`CONFIG.markup`), redondeado al peso. Las imágenes de producto están alojadas en `jkj-stock/assets/products/` para que no dependan de otro sitio.
- **JkJ Stock, catálogo:** solo perfumes. Los productos están en `jkj-stock/assets/catalog.js`; la página se genera desde `jkj-stock/_plantilla.html` con `python3 jkj-stock/build.py`.

---
Sitios diseñados y desarrollados por **LKM’r**.
