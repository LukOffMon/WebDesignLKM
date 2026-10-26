# Proyectos web · LKM’r

| Sitio | Carpeta | Descripción |
|---|---|---|
| Vive Cafeto | `cafeto/` | Café · restaurante · bar. Menú digital, pedidos y reservaciones. |
| Burdo San Telmo | `burdo/` | Parrilla & bar. Cortes con selección de término, pedidos y reservaciones. |
| JkJ Stock | `jkj-stock/` | Catálogo de perfumes (74 productos) y sección Apple (próximamente), con un solo carrito, envío gratis desde $2,300, 15 % de descuento desde $4,000 (envío gratis incluido) y pedidos por WhatsApp (449 209 4034). |

`index.html` en la raíz es un portafolio con enlaces a los tres sitios. Para verlos localmente: `python3 -m http.server` y abre http://localhost:8000.

## Notas

- **Cafeto y Burdo:** menús y precios son de ejemplo; horarios de cierre de Burdo por confirmar.
- **JkJ Stock:** precios = precio del proveedor + 25 % (`CONFIG.markup`), redondeado al peso. Las imágenes de producto están alojadas en `jkj-stock/assets/products/` para que no dependan de otro sitio.
- **JkJ Stock, secciones:** los productos están en `jkj-stock/assets/catalog.js` (campo `section`). Las páginas se generan desde `jkj-stock/_plantilla.html` con `python3 jkj-stock/build.py`; una sección sin productos muestra "Próximamente".

---
Sitios diseñados y desarrollados por **LKM’r**.
