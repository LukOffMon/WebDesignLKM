# Proyectos web · LKM’r

| Sitio | Carpeta | Descripción |
|---|---|---|
| Vive Cafeto | `cafeto/` | Café · restaurante · bar. Menú digital, pedidos y reservaciones. |
| Burdo San Telmo | `burdo/` | Parrilla & bar. Cortes con selección de término, pedidos y reservaciones. |
| Cantina Real Ags | `cantina-real/` | Cantina y bar en Jesús María. Menú con comanda, reservaciones y posadas (WhatsApp 449 415 9466). |
| MK Firma de Abogados | `mk-abogados/` | Bufete penal (MK Nacional · Bogacia). Áreas de práctica, urgencias 24/7 y consultas confidenciales. |
| JkJ Stock | `jkj-stock/` | Tienda por secciones (perfumes, accesorios, joyería, gorras, ropa, tenis) con un solo carrito, 5 % de descuento desde $2,000 y pedidos por WhatsApp (449 209 4034). |

`index.html` en la raíz es un portafolio con enlaces a todos los sitios. Para verlos localmente: `python3 -m http.server` y abre http://localhost:8000.

## Notas

- **Cantina Real:** menú y precios de referencia; horario según Google (9:00–2:00, en Facebook dice 9:00–23:00, por confirmar). Fotos reales de la barra en `cantina-real/assets/`.
- **MK Abogados:** falta foto del Lic. Macías Ponce, dirección exacta de la oficina y horario de consultas (se usó L–V 9–19, S 10–14).
- **Cafeto y Burdo:** menús y precios son de ejemplo; horarios de cierre de Burdo por confirmar.
- **JkJ Stock:** precios = precio del proveedor + 25 % (`CONFIG.markup`), redondeado al peso. Las imágenes de producto están alojadas en `jkj-stock/assets/products/` para que no dependan de otro sitio.
- **JkJ Stock, secciones:** los productos están en `jkj-stock/assets/catalog.js` (campo `section`). Las páginas se generan desde `jkj-stock/_plantilla.html` con `python3 jkj-stock/build.py`; una sección sin productos muestra "Próximamente".

---
Sitios diseñados y desarrollados por **LKM’r**.
