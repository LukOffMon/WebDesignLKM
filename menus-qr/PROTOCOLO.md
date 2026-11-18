# Menu QR protocol · LKM'r

Cómo hacer un menú digital con QR **impecable, seguro, correcto y en orden**. Aplica a todos los menús de `menus-qr/`, los ya hechos y los que vengan. Se siguen los pasos en orden; no se avanza al siguiente con un pendiente del anterior.

> Regla de oro: **nada inventado**. Platillos, precios, fotos, teléfonos y horarios salen de una fuente real que se puede citar. Si no hay dato, se dice ("Precio en sucursal") o se deja fuera.

---

## 0 · Antes de empezar

- [ ] Trabaja en una rama nueva a partir de `gh-pages` (es la rama que publica GitHub Pages).
- [ ] Ten instalado Python 3 (con Pillow y qrcode) y Node 18 o superior con Playwright. Instala las herramientas una sola vez: `cd menus-qr/_tools && npm install`.
- [ ] Nunca pongas datos privados (tu correo, contraseñas, claves de API, el PIN del macro) en el repositorio: es público.

## 1 · Elegir el restaurante

- [ ] Que pueda pagar: ticket promedio de $70 o más y carta con al menos 25 platillos.
- [ ] Que esté activo: abre hoy, tiene reseñas recientes y no anuncia cierre.
- [ ] Que no tenga ya un menú digital propio (si lo tiene, se descarta: no hay nada que venderle).
- [ ] Que no sea cadena nacional (VIPS, Toks, Starbucks, franquicias): ahí decide un corporativo, no el dueño.
- [ ] **Prioriza los que publican WhatsApp** (oficial o número propio del negocio): se les puede escribir sin llamar primero.
- [ ] Si no tiene sitio web propio (los sitios automáticos de directorios no cuentan), marca `"sin_web": true`: el macro lo muestra como argumento de venta.
- [ ] Anota la fuente de su carta (hoy, Rappi; ver paso 3).

## 2 · Verificar el contacto (lo más importante)

Mandarle el mensaje al número equivocado es el error más caro: quema el prospecto y expone tu número a reportes.

- [ ] Busca el número **en lo que publica el propio negocio** para **esa sucursal**: su sitio, Facebook, Instagram, TikTok o Google Maps.
- [ ] Clasifícalo en `contacto` de `prospectos.json`:
  - `whatsapp_oficial`: el negocio lo publica como WhatsApp.
  - `numero_propio`: lo publica el negocio para esa sucursal, aunque no diga WhatsApp.
  - `directorio`: solo aparece en directorios, pero coincide con la dirección de esa sucursal.
  - `solo_telefono`: fijo o sin WhatsApp; en el macro sale como "Llamar a…".
- [ ] Escribe en `confianza` de dónde salió el número, con nombre de la fuente.
- [ ] Si dos fuentes dan números distintos, usa el del propio negocio y guarda el otro en `tel_alt`.
- [ ] Revisa que la sucursal no haya cerrado (busca "cerró" o "cierre" junto al nombre).

## 3 · Datos del menú

- [ ] Descarga la carta: `python3 menus-qr/_tools/rappi.py <url de Rappi> menus-qr/_tools/raw/<slug>.json`.
- [ ] Si la tienda de Rappi no trae datos en la página (solo carga con JavaScript), descártala o busca otra fuente real.
- [ ] Agrega el restaurante a `menus-qr/_tools/prospectos.json` con todos los campos: `slug`, `rappi`, `nombre`, `sucursal`, `ciudad`, `direccion`, `tel`, `contacto`, `confianza`, `tema`, `lema`, `gancho`, `mejora`, `estrella`, `region` (`ags` o `nacional`), `guion` (`taqueria`, `mariscos`, `desayunos`, `cocina_tradicional` o `restaurante`) y `alta` (fecha `AAAA-MM-DD` en que se agrega: el macro avisa a los socios de los nuevos con esa fecha).
- [ ] Si el horario de Rappi no es creíble (abre a la 1:00, cierra a las 9:45…), pon `"sin_horario": true`: mejor sin horario que con uno falso.
- [ ] El `lema`, el `gancho` y la `mejora` describen al restaurante con hechos (qué vende, de dónde es), sin inventar premios, años ni historias.
- [ ] Fotos: solo las del propio negocio o las de su tienda de Rappi. Nunca bancos de imágenes.

## 4 · Diseño (mobile first)

La plantilla compartida (`assets/menu.css` y `assets/menu.js`) ya cumple todo esto; al personalizar un tema, no lo rompas:

- [ ] **Se diseña primero para un celular de 360 px** y luego se agranda. Nada se sale de la pantalla y no hay scroll horizontal.
- [ ] **Contraste AA:** el generador calcula solo `--acc-btn`, `--on-acc` y `--acc-ink` para que los botones y precios se lean (4.5:1). En `tema` elige `bg`, `fg`, `acc`, `card`, `titulo` y `texto`; si un color no da contraste, el generador lo ajusta y conserva el tono.
- [ ] **Objetivos táctiles de 40 px o más** (botones, categorías, + y −).
- [ ] **Campos de 16 px** (si son más chicos, el iPhone hace zoom al escribir).
- [ ] **Tipografías de Google:** si la fuente solo tiene un grosor (Alfa Slab One, DM Serif Display, Bebas Neue, etc.), agrégala a `SINGLE_WEIGHT` en `build.py`; si no, Google rechaza la hoja completa y se ven fuentes del sistema.
- [ ] Lo que lleva cada menú, y no se quita:
  - Cinemática de 3 s de LKM'r, que se puede saltar.
  - Aviso de "Muestra".
  - Botones Llamar, Cómo llegar y Compartir.
  - Barra fija con categorías y lupa.
  - Ficha de cada platillo con foto grande.
  - **Recomendados de la casa**: carrusel arriba con los platillos de `estrella` (y, si faltan, los platos fuertes con foto).
  - Datos estructurados schema.org (`Restaurant` + `Menu`) para Google.
  - **QR estilizado** con los colores de la marca y su inicial al centro (`qr/qr-estilo.png`) y su página `qr/`, cuya vista previa en WhatsApp es la tarjeta con el QR: va en el mensaje de venta.
  - Pedido por WhatsApp, que se conserva si recargan la página.
  - Bloque "Desarrollado por LKM'r".
  - Vista previa (`og.jpg`) para WhatsApp.
- [ ] Respeta "reducir movimiento" del sistema: las animaciones se apagan solas.

## 5 · Generar

- [ ] `python3 menus-qr/_tools/build.py` (agrega `--fetch` para volver a bajar las cartas de Rappi).
- [ ] Genera por cada menú `index.html`, `img/`, `qr.png`, `tarjeta-mesa.png` y `og.jpg`, además del panel `menus-qr/index.html`, `PROSPECTOS.md` y la sección MENÚS QR del portafolio.
- [ ] Revisa el reporte de la terminal: platillos, fotos y categorías de cada uno. **Menos de 25 platillos o menos de 70 % con foto = revisar** antes de seguir.
- [ ] Si las vistas previas `og.jpg` salen modificadas sin haber cambiado ese restaurante, descarta esos cambios (`git checkout -- <ruta>`) para no inflar el commit.

### Estándar de excelencia (mínimo por menú)

Un menú solo se ofrece si cumple todo esto. El macro lo revisa solo con los datos de `macro.json` y marca cada lugar con **★ Excelencia** o **por mejorar**:

| Mínimo | Cómo se mide |
|---|---|
| Carta completa | 25 platillos o más, todos reales |
| Fotos reales | foto en el 90 % de los platillos o más |
| Recomendados de la casa | 3 o más en el carrusel |
| Carta ordenada | 4 categorías o más, con buscador |
| Pedido por WhatsApp | el contacto no es `solo_telefono` (o ya dio su WhatsApp en la llamada) |
| Contacto verificado | `confianza` con la fuente del número |
| Listo para compartir | `og.jpg` y datos estructurados |
| QR y tarjeta de mesa | `verifica.js` en "Todo correcto" |

Antes de mandar la venta, quien vende palomea en el macro su revisión: lo abrió en su celular, hizo un pedido de prueba, sabe el gancho y tiene el kit (enlace, QR y tarjeta).

### Datos para el macro

- [ ] Después de `build.py`, corre `python3 menus-qr/_tools/macro.py --macro ../LKMLPR/mensajes/index.html` (con LKMLPR clonado al lado). Escribe `menus-qr/macro.json` y actualiza `PRESETS` del macro: los nuevos entran primero, ordenados por WhatsApp.
- [ ] Aunque no se actualice el macro, al publicar `macro.json` en Pages los socios reciben los nuevos al entrar (el macro lo lee en línea).

## 6 · QA de interfaz (automático)

- [ ] `node menus-qr/_tools/qa.js` (o `node menus-qr/_tools/qa.js <slug> …` para revisar solo algunos).
- [ ] Abre cada menú a 360 px y 390 px en modo celular y revisa:
  - Que no haya scroll horizontal y que nada se salga del ancho.
  - El contraste de título, textos, precios, categorías y botones.
  - El tamaño de botones y enlaces (objetivos táctiles).
  - Imágenes rotas y precios mal escritos (por ejemplo "$280.8").
  - Que estén las etiquetas de la vista previa.
  - Errores de JavaScript.
  - El flujo de pedido: agregar y abrir el carrito.
- [ ] **Debe terminar en "con errores: 0".** Las advertencias se revisan a ojo.

## 7 · Verificación de datos (automática)

- [ ] `node menus-qr/_tools/verifica.js`
- [ ] Decodifica **cada QR, cada tarjeta de mesa y cada QR estilizado** y comprueba que abren el menú de **su** restaurante.
- [ ] Revisa **cada mensaje de WhatsApp del panel**:
  - Que lleve el número de su restaurante, su nombre y ningún otro restaurante.
  - Que el contacto inicial no lleve enlace ni precio.
  - Que la venta lleve solo enlaces suyos (su menú y su QR `…/qr/`) y el precio de la oferta.
- [ ] **Debe terminar en "Todo correcto".**

## 8 · Revisión a ojo (5 minutos)

En un celular real, o en Chrome con la vista de celular, abre 3 menús: uno de tema claro, uno oscuro y el nuevo.

- [ ] La cinemática dura 3 s y se puede saltar.
- [ ] El título no se corta y las fotos se ven nítidas.
- [ ] Las categorías siguen al scroll.
- [ ] La lupa busca y "Cerrar" la limpia.
- [ ] Al tocar un platillo se abre su ficha; "Agregar" suma al pedido.
- [ ] El pedido abre WhatsApp con la lista correcta.
- [ ] Compartir el enlace en un chat muestra la vista previa.

## 9 · Publicar

- [ ] Commit en tu rama, PR hacia `gh-pages` y merge. Pages publica en 1 o 2 minutos.
- [ ] Abre el enlace publicado y escanea el QR impreso de un menú con el celular.

## 10 · Contactar sin arriesgar el número

Se hace desde el macro de LKMLPR (`/mensajes/`), que ya aplica estas reglas:

- [ ] **Primero permiso:** "1 · Contacto inicial" (saludo sin enlace ni precio). La venta ("2 · Iniciar venta") solo se manda cuando el lugar contesta o cuando te dio su WhatsApp en una llamada.
- [ ] **Límite diario** que empieza en 5 y sube poco a poco, con espera entre contactos y solo en horario de 9:00 a 20:00.
- [ ] **Un solo seguimiento.** "No le interesa" se respeta y no se vuelve a escribir.
- [ ] Los de "Llamar a…" se trabajan con el guion de llamada según el tipo de negocio.

## 11 · Cuando el restaurante acepta

- [ ] Pídele su carta de salón (foto o PDF), su logo y el WhatsApp donde quiere recibir pedidos.
- [ ] Cambia los precios de referencia por los de salón y quita el aviso de "Muestra".
- [ ] Confirma el horario real. Si cambia el WhatsApp, cambia `whatsapp` en `prospectos.json`.
- [ ] Vuelve a correr los pasos 5 a 9.

---

### Errores que ya pasaron (y cómo los evita este protocolo)

| Error | Prevención |
|---|---|
| Mensajes que llevaban el menú de otro restaurante | Paso 7: `verifica.js` lo detecta en cada mensaje |
| Números que no eran de esa sucursal o de un negocio cerrado | Paso 2: número del propio negocio + campo `confianza` |
| Fuentes de un solo grosor que tumbaban todas las tipografías | Paso 4: `SINGLE_WEIGHT` |
| Botones y precios con poco contraste en temas claros | Paso 4: colores derivados automáticos con contraste AA |
| Zoom al escribir en el pedido (iPhone) | Paso 4: campos de 16 px |
| Precios como "$280.8" | Paso 6: `qa.js` revisa el formato |
| Descripciones de Rappi que no correspondían al platillo | `desc_matches` en `build.py` las oculta |
| Riesgo de que WhatsApp sancione el número por spam | Paso 10: contacto en dos pasos y límites del macro |
