# MiCarpintero

Taller digital para diseñar muebles a medida (librero, gabinete con puertas, cajonera) que corre **100 % en el navegador**: sin servidor ni base de datos. Publicado en `https://lukoffmon.github.io/WebDesignLKM/micarpintero/`.

- **Visor 3D** (React Three Fiber): texturas de veta procedurales, cotas, rayos X, selección de piezas y vista explosionada animada.
- **Motor paramétrico** (`lib/engine/calculator.ts`): genera cada pieza con su caja envolvente, matriz de transformación, cantos, herrajes, pasos de armado y revisiones estructurales (flecha de Euler-Bernoulli con fluencia, claro máximo, volteo, bisagras, correderas).
- **Optimizador de corte** (`lib/engine/cutOptimizer.ts`): bin packing 2D de guillotina; considera kerf, refilado, veta y prueba 36 combinaciones de heurísticas.
- **PDF de fabricación** (`lib/pdf/blueprintExporter.ts`, jsPDF): portada con vista 3D, vistas ortogonales, despiece, herrajes y presupuesto, un plano de corte por tablero y las instrucciones de armado.
- **Guía de armado interactiva** (`components/guide/PDFParserGuide.tsx`, pdf.js): lee manuales en PDF, detecta pasos, medidas, herramientas y advertencias, y registra avance, tiempo y notas por paso.
- **Persistencia**: proyectos en `localStorage` (Zustand `persist`); guías y PDFs en IndexedDB. Respaldo e importación en JSON.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pruebas del motor, el optimizador y el lector de manuales
npm run typecheck
npm run lint
```

## Publicar

`npm run publish` compila la exportación estática (`out/`) y copia `index.html`, `_next/`, el worker de pdf.js y los íconos a esta carpeta, que es lo que sirve GitHub Pages. Los recursos usan rutas relativas, así que el sitio funciona en cualquier subcarpeta. Hay que hacer commit de esos archivos generados después de cada cambio.

## Estructura

| Ruta | Contenido |
|---|---|
| `types/carpentry.ts` | Modelo de dominio (piezas, herrajes, tableros de corte, configuración, guías) |
| `store/useConfigurator.ts` | Proyectos, parámetros, ajustes del optimizador y del visor (localStorage) |
| `store/useGuideStore.ts` | Guías y progreso (IndexedDB) |
| `lib/engine/` | Materiales, motor paramétrico, optimizador y despiece |
| `lib/pdf/` | Generador de planos y analizador de texto de manuales |
| `components/canvas/FurnitureViewer.tsx` | Visor 3D |
| `components/guide/PDFParserGuide.tsx` | Lector de PDF y guía paso a paso |

Los precios de tableros y herrajes (MXN) son de referencia y se ajustan en `lib/engine/materials.ts` y en el catálogo de herrajes de `calculator.ts`. El nombre de la app está en `lib/constants.ts`.
