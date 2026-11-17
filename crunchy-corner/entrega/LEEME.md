# The Crunchy Corner · Plaza Cuatro Hojas — kit de venta y entrega

Menú: https://lukoffmon.github.io/WebDesignLKM/crunchy-corner/
Precio acordado: **$1,200 MXN, pago único**.
WhatsApp de la sucursal: 449 446 4730.

## Archivos

| Archivo | Para qué |
|---|---|
| `propuesta.pdf` | Propuesta de 4 páginas para mandar al cliente (qué reciben, cómo funciona, inversión y QR del demo). |
| `imprimibles.pdf` | Hoja carta con 2 tarjetas de mesa de 4 × 6 in, póster para mostrador y hoja de 9 stickers. |
| `tarjeta-mesa.png` | Tarjeta de mesa sola a 300 dpi (1200 × 1800 px), por si la imprenta pide imagen. |
| `qr.svg` / `qr.png` | QR del menú. El SVG es para imprenta (no pierde calidad a ningún tamaño). |

## Mensaje para enviar

Hola, buen día. ¿Hablo con The Crunchy Corner Cuatro Hojas? 🐔

Les escribo de LKM'r: hacemos menús digitales y páginas para restaurantes. Les preparé un menú digital con QR para la sucursal de Plaza Cuatro Hojas, ya con su carta completa, sus fotos y sus 18 salsas:
https://lukoffmon.github.io/WebDesignLKM/crunchy-corner/

Lo que tiene:
• La promo de hoy aparece sola (Lunes de combo, Martes de alitas…).
• Las 18 salsas con su picor y una ruleta para el que no sabe cuál pedir.
• El cliente arma su orden con tamaño, salsa y extras (Make it big, Make it double) y la manda con el total a su WhatsApp 449 446 4730.
• Se abre desde la cámara del celular, no hay que descargar nada.

Les mando la propuesta en PDF con todo el detalle. También les dejo listas las tarjetas de mesa, un póster para el mostrador y stickers con el QR.

La inversión es de $1,200 pago único. Solo necesito que me confirmen la dirección, el horario y las promos vigentes para dejarlo al 100 %.

¿Con quién lo puedo platicar?

## Si preguntan…

- **¿Dónde vive la página?** En internet, con un enlace propio. El QR siempre lleva al mismo enlace, aunque cambien precios o promos.
- **¿Y si cambian los precios o las promos?** Se actualizan en el menú y el QR impreso sigue sirviendo, no hay que reimprimir.
- **¿Sirve para las otras sucursales?** Este menú manda los pedidos a Cuatro Hojas. Para Bosques o Distrito Sur se hace una copia con su WhatsApp (los carajillos solo aparecen en Cuatro Hojas y Distrito Sur).
- **¿Necesitan algo de su lado?** Nada técnico: dirección, horario y confirmar las promos.

## Antes de entregar

- [ ] El sitio está publicado (rama fusionada a `main`) y el QR abre el menú desde un celular.
- [ ] Dirección exacta y horario de la sucursal (hoy el botón "Cómo llegar" abre una búsqueda de Google Maps).
- [ ] Confirmar las promos de domingo, miércoles, jueves y sábado (los carteles son de 2024).
- [ ] Enlace de su tienda en Uber Eats, si quieren el botón directo.
- [ ] Probar un pedido real por WhatsApp con alguien de la sucursal.

## Volver a generar los archivos

Desde la raíz del repo (requiere `pip install qrcode pillow` y Playwright):

```
python3 crunchy-corner/entrega/src/qr.py     # QR, si cambia la dirección del menú
node crunchy-corner/entrega/src/shots.js     # capturas del menú para la propuesta
node crunchy-corner/entrega/src/render.js    # propuesta.pdf, imprimibles.pdf y tarjeta-mesa.png
```

Los textos están en `src/propuesta.html` e `src/imprimibles.html`. Si cambia una promo, actualízala también en el póster (`imprimibles.html`, bloque `.week`).
