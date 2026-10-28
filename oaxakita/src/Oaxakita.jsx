/* =====================================================================
   RESTAURANTE OAXAKITA · Experiencia web
   Av. Las Américas 1738, Valle Dorado, Aguascalientes
   Componente React de un solo archivo: datos, sonido, partículas,
   cursor, menú filtrable, pedido y reservas por WhatsApp.
   ===================================================================== */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Beef,
  CakeSlice,
  CalendarDays,
  Clock,
  Coffee,
  Croissant,
  CupSoda,
  Egg,
  Flame,
  Leaf,
  MapPin,
  Martini,
  Menu as MenuIcon,
  MessageCircle,
  Minus,
  Navigation,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Soup,
  Sparkles,
  Star,
  Store,
  Trash2,
  Users,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wheat,
  Wine,
  X,
} from 'lucide-react';

/* ---------------------------------------------------------------------
   1. DATOS DEL NEGOCIO
   --------------------------------------------------------------------- */
const ADDRESS_FULL = 'Av. Las Américas 1738, Valle Dorado, 20235 Aguascalientes, Ags.';

const BIZ = {
  name: 'Restaurante Oaxakita',
  street: 'Av. Las Américas 1738',
  area: 'Valle Dorado, 20235 Aguascalientes, Ags.',
  phoneDisplay: '449 580 3465',
  phoneTel: '+524495803465',
  whatsapp: '524495803465',
  rating: '4.5',
  reviews: '3,810',
  hours: 'Lunes a domingo · desde las 8:00 a.m.',
  priceRange: '$200–300 por persona',
  tags: ['Comidas en hora feliz', 'Buenos cócteles', 'Platos vegetarianos'],
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Restaurante Oaxakita, ${ADDRESS_FULL}`)}`,
  mapsEmbed: `https://maps.google.com/maps?q=${encodeURIComponent(`Restaurante Oaxakita, ${ADDRESS_FULL}`)}&z=16&output=embed`,
};

const PHOTOS = {
  fachada: 'assets/fachada.jpg',
  salon: 'assets/salon.jpg',
  carnes: 'assets/carnes-asadas.jpg',
};

const waLink = (text) => `https://wa.me/${BIZ.whatsapp}?text=${encodeURIComponent(text)}`;
const mxn = (n) => `$${n.toLocaleString('es-MX')}`;

/* ---------------------------------------------------------------------
   2. MENÚ (carta oficial del restaurante)
   --------------------------------------------------------------------- */
const CAT_META = {
  desayunos: { label: 'Desayunos', icon: Egg, colors: ['#E5A93B', '#C85A32'] },
  antojitos: { label: 'Delicias de la casa', icon: UtensilsCrossed, colors: ['#E55B2B', '#E5A93B'] },
  moles: { label: 'Moles oaxaqueños', icon: Flame, colors: ['#C85A32', '#5a1f12'] },
  caldos: { label: 'Caldos y sopas', icon: Soup, colors: ['#E55B2B', '#2D483A'] },
  carnes: { label: 'Especialidades de carnes', icon: Beef, colors: ['#E55B2B', '#C85A32'] },
  tlayudas: { label: 'Tlayudas tradicionales', icon: Wheat, colors: ['#E5A93B', '#2D483A'] },
  mezcales: { label: 'Mezcales artesanales · 750 ml', icon: Wine, colors: ['#D4AF37', '#2D483A'] },
  cocteles: { label: 'Coctelería con mezcal · 355 ml', icon: Martini, colors: ['#E55B2B', '#D4AF37'] },
  bebidas: { label: 'Bebidas y bebidas calientes', icon: Coffee, colors: ['#C85A32', '#D4AF37'] },
  panaderia: { label: 'Panadería tradicional', icon: Croissant, colors: ['#E5A93B', '#C85A32'] },
  postres: { label: 'Postres', icon: CakeSlice, colors: ['#D4AF37', '#C85A32'] },
  tienda: { label: 'Tienda oaxaqueña', icon: Store, colors: ['#2D483A', '#D4AF37'] },
};

const FILTERS = [
  { id: 'todos', label: 'Todos', cats: Object.keys(CAT_META) },
  { id: 'desayunos', label: 'Desayunos y Antojitos', cats: ['desayunos', 'antojitos'] },
  { id: 'moles', label: 'Moles', cats: ['moles'] },
  { id: 'tlayudas', label: 'Tlayudas', cats: ['tlayudas'] },
  { id: 'carnes', label: 'Carnes y Botanas', cats: ['carnes'] },
  { id: 'caldos', label: 'Caldos', cats: ['caldos'] },
  { id: 'mezcal', label: 'Mezcales y Cocteles', cats: ['mezcales', 'cocteles'] },
  { id: 'bebidas', label: 'Bebidas', cats: ['bebidas'] },
  { id: 'dulce', label: 'Panadería y Postres', cats: ['panaderia', 'postres'] },
  { id: 'tienda', label: 'Tienda', cats: ['tienda'] },
];

const item = (id, cat, name, price, desc, badges = [], extra = {}) => ({ id, cat, name, price, desc, badges, ...extra });

const MENU = [
  // Desayunos
  item('enfrijoladas', 'desayunos', 'Enfrijoladas', 122, '2 tortillas rellenas de quesillo bañadas en frijol molido, acompañadas con cecina enchilada.'),
  item('entomatadas', 'desayunos', 'Entomatadas', 148, '2 tortillas de maíz rellenas de quesillo bañadas en salsa de tomate, con tasajo de res.'),
  item('chilaquiles-res', 'desayunos', 'Chilaquiles de Res', 122, 'Con crema, queso y salsa a elegir, acompañados con tasajo de res.'),
  item('chilaquiles-oaxakita', 'desayunos', 'Chilaquiles Oaxakita', 88, 'Con crema y queso, bañados en salsa y huevos al gusto.', ['De la casa']),
  // Delicias de la casa
  item('tamal-mole', 'antojitos', 'Tamal de Mole Negro', 48, 'Mole negro tradicional relleno de pollo, envuelto en hoja de plátano.', ['Hoja de plátano']),
  item('memelitas', 'antojitos', 'Memelitas', 80, 'Memelitas tradicionales con tasajo, cecina y chorizo.', ['3 piezas']),
  item('guacamole', 'antojitos', 'Molcajete de Guacamole', 148, 'Combinación de guacamole fresco con chapulines típicos.', ['En molcajete']),
  item('quesadillas', 'antojitos', 'Quesadillas Fritas', 120, 'En tortilla de maíz rellenas de tasajo, cecina y chorizo.', ['3 piezas']),
  // Moles
  item('estofado', 'moles', 'Estofado Almendrado', 168, 'Mole almendrado acompañado con pollo y arroz blanco.'),
  item('enmoldas', 'moles', 'Enmoldas', 172, '2 tortillas de maíz rellenas de pollo en mole negro con tasajo de res.'),
  item('mole-negro', 'moles', 'Mole Negro Oaxaqueño', 168, 'Elaborado artesanalmente en cazuela de barro, con pollo.', ['Hecho en cazuela de barro']),
  item('enchiladas-rojo', 'moles', 'Enchiladas en Mole Rojo', 172, 'Tortillas rellenas de pollo con mole rojo y cecina de puerco enchilada.'),
  item('mole-rojo', 'moles', 'Mole Rojo Oaxaqueño', 168, 'Ligeramente picosito, en cazuela de barro con pollo.', ['Hecho en cazuela de barro', 'Picosito']),
  // Caldos
  item('sopa-medula', 'caldos', 'Sopa de Médula', 78, 'Médula de res en caldillo de jitomate con un toque de epazote.'),
  item('caldo-res', 'caldos', 'Caldo de Res', 148, 'Caldo picosito con ejote, zanahoria, chayote, elote y papa.', ['Picosito']),
  // Carnes
  item('carnes-asadas', 'carnes', 'Carnes Asadas', 178, 'Tasajo de res, cecina enchilada, cebolla, chorizo, frijoles negros de la olla y pico de gallo.', ['Al carbón'], { img: PHOTOS.carnes }),
  item('costillas', 'carnes', 'Costillas de Cuche', 248, 'Costillas marinadas al mojo de ajo, asadas al carbón, frijoles negros y pico de gallo.', ['Al carbón']),
  item('botanita', 'carnes', 'Botanita Oaxaca', 320, 'Carnes asadas, tasajo, cecina, chorizo, quesadillas fritas, memelitas y tamal de mole.'),
  item('botana', 'carnes', 'Botana Oaxakita', 628, 'Carnes asadas, tasajo, cecina, chorizo, quesadillas, memelitas, tamal, chapulines, mole, frijoles y quesillo.', ['Para 4 personas', 'De la casa']),
  // Tlayudas
  item('tostada-huerto', 'tlayudas', 'Tostada del Huerto', 88, 'Guacamole, flor de calabaza, lechuga, tomate cherry, germen, quesillo, nopales y champiñones.', ['Vegetariana'], { icon: Leaf }),
  item('tlayuda-chapulines', 'tlayudas', 'Tlayuda con Chapulines', 178, 'Tlayuda doblada al carbón con chapulines tradicionales.', ['Al carbón']),
  item('tlayuda-oaxakita', 'tlayudas', 'Tlayuda Oaxakita', 178, 'Tlayuda extendida al carbón con carnes asadas: tasajo, cecina y chorizo.', ['Al carbón', 'De la casa']),
  item('tlayuda-tradicional', 'tlayudas', 'Tlayuda Tradicional', 178, 'Tlayuda doblada al carbón con carnes asadas: tasajo, cecina y chorizo.', ['32 cm', 'Al carbón']),
  item('tostada-quesillo', 'tlayudas', 'Tostada de Quesillo', 78, 'Tostada crujiente con quesillo oaxaqueño.', ['Vegetariana']),
  item('tostada-insectos', 'tlayudas', 'Tostada de Insectos', 148, 'Tostada especial con variedad de insectos de la región.'),
  // Mezcales
  item('madre-cuishe', 'mezcales', 'Madre Cuishe', 960, 'Joven, suave al paladar con notas herbales.', ['42° Alc.', 'Botella 750 ml']),
  item('tobala', 'mezcales', 'Tobalá', 960, 'Joven, agave silvestre tobalá, notas amaderadas y ahumadas.', ['42° Alc.', 'Silvestre']),
  item('tepeztate', 'mezcales', 'Tepeztate', 960, 'Joven, agave silvestre de 25 años, notas a tierra mojada.', ['42° Alc.', 'Agave de 25 años']),
  item('espadin-pechuga', 'mezcales', 'Espadín Pechuga', 820, 'Joven, destilado con fruta de temporada y pechuga de guajolote.', ['40° Alc.', 'Botella 750 ml']),
  item('espadin-joven', 'mezcales', 'Espadín Joven', 640, 'Joven, carácter suave ligeramente ahumado.', ['38° Alc.', 'Botella 750 ml']),
  // Coctelería
  item('llorona', 'cocteles', 'Llorona', 96, 'Frutas criollas en olla de barro, hierbas.', ['Olla de barro']),
  item('oaxakillo', 'cocteles', 'Oaxakillo', 122, 'Espadín, café especialidad, avellanas, cenizas cacao.', ['De la casa']),
  item('pina-colada', 'cocteles', 'Piña Colada', 96, 'Mezcal espadín, mezcla de coco y piña.'),
  item('dainzu', 'cocteles', 'Dainzú', 96, 'Espadín, jamaica, miel y gusano de maguey.'),
  item('zipolite', 'cocteles', 'Zipolite', 96, 'Cuishe, limón, piña, pepino, chapulines.'),
  item('sandunga', 'cocteles', 'Sandunga', 96, 'Espadín, durazno, miel de panal, sal de gusano, frapeado.', ['Frapeado']),
  item('huatulco', 'cocteles', 'Huatulco', 96, 'Espadín, maracuyá, jugo oaxakita, sal de gusano.'),
  item('danzon-nereida', 'cocteles', 'Danzón Nereida', 96, 'Mezcal tobalá, vino tinto, sangría oaxakita.'),
  item('mojito', 'cocteles', 'Mojito Oaxaqueño', 96, 'Mezcal, hierbabuena, hierba de borracho, limón.'),
  item('cantarito', 'cocteles', 'Cantarito', 96, 'Mezcal espadín, jugo de granada y jengibre.'),
  item('chemezcal', 'cocteles', 'Chemezcal', 96, 'Cuishe, cerveza artesanal, limón, sal de gusano.'),
  item('margarita', 'cocteles', 'Margarita', 96, 'Espadín, maracuyá, limón y jarabe de maguey.'),
  item('chapulinada', 'cocteles', 'Chapulinada', 97, 'Espadín, cerveza artesanal, salsa oaxakita, chapulines.'),
  item('latidos', 'cocteles', 'Latidos', 96, 'Espadín, tepache, limón y sal de gusano.'),
  // Bebidas
  item('beso-mixe', 'bebidas', 'Beso Mixe', 42, 'Mango con hierbabuena.', ['550 ml'], { icon: CupSoda }),
  item('guanabana', 'bebidas', 'Agua de Guanábana', 44, 'Agua fresca de la casa.', ['500 ml'], { icon: CupSoda }),
  item('limonada', 'bebidas', 'Limonada', 44, 'Con base a elegir (agua o mineral).', ['500 ml'], { icon: CupSoda }),
  item('tejate', 'bebidas', 'Tejate Tradicional', 52, 'Bebida ancestral a base de cacao y maíz.', ['500 ml', 'Ancestral'], { icon: CupSoda }),
  item('tangolunda', 'bebidas', 'Tangolunda', 44, 'Sabor maracuyá y jugo oaxakita.', ['550 ml'], { icon: CupSoda }),
  item('kaapeh-kakaw', 'bebidas', 'Kaapeh Kakaw', 68, 'Chocolate oaxaqueño y café especial.', ['10 oz']),
  item('champurrado', 'bebidas', 'Champurrado', 42, 'Atole de maíz y chocolate oaxaqueño.', ['10 oz']),
  item('chocolate-leche', 'bebidas', 'Chocolate de Leche', 48, 'Batido en jarro de barro con molinillo.', ['10 oz', 'Jarro de barro']),
  item('cafe-oaxakita', 'bebidas', 'Café Oaxakita', 78, 'Capuchino frío especial.', ['10 oz', 'De la casa']),
  item('chocolate-agua', 'bebidas', 'Chocolate de Agua', 44, 'Batido en jarro de barro con molinillo.', ['10 oz', 'Jarro de barro']),
  // Panadería
  item('pan-yema', 'panaderia', 'Pan de Yema', 18, 'Horneado en horno de leña, tradicional de Oaxaca.', ['Horno de leña']),
  item('pan-cazuela', 'panaderia', 'Pan de Cazuela', 26, 'Pan horneado en cazuelitas de barro, relleno de chocolate oaxaqueño.', ['Cazuelita de barro']),
  item('polvoron', 'panaderia', 'Polvorón', 13, 'Polvorón crujiente, azucarado con sabor vainilla.'),
  item('tronquito', 'panaderia', 'Tronquito Relleno', 18, 'Pan relleno de lechecilla y cubierta de pasta de vainilla.'),
  // Postres
  item('cheesecake', 'postres', 'Cheesecake de Oreo', 85, 'Porción individual.'),
  item('gelatina-nuez', 'postres', 'Gelatina de Nuez', 38, 'Porción individual.'),
  item('flan', 'postres', 'Flan Napolitano', 42, 'Porción individual estilo casero.'),
  item('platanitos', 'postres', 'Platanitos Fritos', 64, 'Endulzados con lechera.'),
  item('pastel-chocolate', 'postres', 'Pastel Chocolate Semiamargo', 85, 'Con chocolate oaxaqueño artesanal.'),
  item('tarta-mezcal', 'postres', 'Tarta de Chocolate con Mezcal', 82, 'Especialidad dulce con toque de mezcal.', ['Con mezcal']),
  // Tienda
  item('choco-semiamargo', 'tienda', 'Chocolate Semi-Amargo', 165, 'Elaborado con cacao en molino de piedra.', ['500 g', 'Molino de piedra']),
  item('choco-canela', 'tienda', 'Chocolate a la Canela', 125, 'Elaborado con cacao en molino de piedra.', ['500 g', 'Molino de piedra']),
  item('chapulines', 'tienda', 'Chapulines', 68, 'Jícara de chapulines preparados.', ['60 g']),
  item('sal-chapulin', 'tienda', 'Sal de Chapulín', 60, 'Sal artesanal con chapulín seco y chile.', ['45 g']),
  item('sal-gusano', 'tienda', 'Sal de Gusano', 60, 'Ideal para acompañar mezcales.', ['45 g']),
  item('quesillo', 'tienda', 'Quesillo', 160, 'Quesillo 100% elaborado con leche de vaca.', ['830 g']),
  item('cecina-enchilada', 'tienda', 'Cecina Enchilada', 120, 'Carne de puerco lista para cocinar.', ['500 g']),
  item('tasajo', 'tienda', 'Tasajo de Res', 130, 'Corte tradicional listo para cocinar.', ['500 g']),
  item('chorizo', 'tienda', 'Chorizo Oaxaqueño', 120, 'Carne de puerco especiada lista para cocinar.', ['500 g']),
  item('mole-negro-pasta', 'tienda', 'Mole Negro en Pasta', 120, 'Mole artesanal tradicional de Oaxaca.', ['500 g']),
  item('mole-rojo-pasta', 'tienda', 'Mole Rojo en Pasta', 120, 'Mole tradicional picosito en pasta.', ['500 g']),
];

const MENU_BY_ID = Object.fromEntries(MENU.map((m) => [m.id, m]));
const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const QUICK_NOTES = ['Sin picante', 'Extra quesillo', 'Sin cebolla', 'Salsa aparte', 'Sin chapulines'];

/* ---------------------------------------------------------------------
   3. ESTILOS GLOBALES (complementan a Tailwind)
   --------------------------------------------------------------------- */
const GLOBAL_CSS = `
:root {
  --obsidiana: #080707; --barro: #110F0E; --terracota: #C85A32; --teotitlan: #E55B2B;
  --maiz: #E5A93B; --agave: #2D483A; --oro: #D4AF37; --marfil: #F5F2EB; --ceniza: #9E988E;
  --line: rgba(212,175,55,.16); --ease: cubic-bezier(.22,1,.36,1);
  color-scheme: dark;
}
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: 84px; background: var(--obsidiana); }
@media (min-width: 1920px) { html { font-size: calc(16px + (100vw - 1920px) * .004); } }
body { margin: 0; background: radial-gradient(1200px 800px at 80% -10%, rgba(200,90,50,.08), transparent 60%), linear-gradient(var(--obsidiana), var(--barro)); color: var(--marfil); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
html.is-locked, html.is-locked body { overflow: hidden; }
::selection { background: rgba(212,175,55,.35); color: #fff; }
::-webkit-scrollbar { width: 10px; height: 8px; }
::-webkit-scrollbar-track { background: var(--obsidiana); }
::-webkit-scrollbar-thumb { background: #2a201a; border-radius: 99px; border: 2px solid var(--obsidiana); }
.no-scrollbar { scrollbar-width: none; } .no-scrollbar::-webkit-scrollbar { display: none; }
:focus-visible { outline: 2px solid var(--oro); outline-offset: 3px; border-radius: 8px; }

.grain { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }

.text-oro-grad { background: linear-gradient(100deg, #f6e3a6 0%, #D4AF37 45%, #E5A93B 70%, #C85A32 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.glass { background: linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.015)); backdrop-filter: blur(24px) saturate(140%); -webkit-backdrop-filter: blur(24px) saturate(140%); border: 1px solid rgba(245,242,235,.08); }
.gold-edge { position: relative; }
.gold-edge::before { content: ''; position: absolute; inset: 0; padding: 1px; border-radius: inherit; background: linear-gradient(140deg, rgba(212,175,55,.65), rgba(212,175,55,.05) 35%, rgba(229,91,43,.05) 65%, rgba(229,169,59,.5)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
.neo { box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 -1px 0 rgba(0,0,0,.4) inset, 0 30px 60px -30px rgba(0,0,0,.8); }
.hairline { border-color: var(--line); }
.divider-oro { height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,.55), transparent); }

/* Botón líquido dorado */
.btn-liquid { position: relative; isolation: isolate; overflow: hidden; background: linear-gradient(135deg, #f1d67f, #D4AF37 50%, #b8902a); color: #1a1208; box-shadow: 0 12px 40px -8px rgba(212,175,55,.45), 0 0 0 1px rgba(255,236,170,.4) inset; transition: box-shadow .5s var(--ease), transform .5s var(--ease); }
.btn-liquid::before { content: ''; position: absolute; left: 50%; top: 140%; width: 320%; aspect-ratio: 1; z-index: -1; background: linear-gradient(135deg, #E55B2B, #C85A32); border-radius: 46% 48% 47% 48%; transform: translateX(-50%); transition: top .8s var(--ease); animation: liquid-spin 6s linear infinite; }
.btn-liquid:hover::before, .btn-liquid:focus-visible::before { top: -40%; }
.btn-liquid:hover { color: #fff7ea; box-shadow: 0 18px 60px -10px rgba(229,91,43,.6), 0 0 0 1px rgba(255,200,150,.35) inset; }
.btn-liquid > * { transition: color .4s; }
@keyframes liquid-spin { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }
.btn-ghost { border: 1px solid rgba(245,242,235,.16); background: rgba(255,255,255,.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: border-color .4s, color .4s, background-color .4s, box-shadow .5s var(--ease); }
.btn-ghost:hover { border-color: rgba(212,175,55,.7); color: #f6e3a6; background: rgba(212,175,55,.06); box-shadow: 0 0 40px -10px rgba(212,175,55,.4); }

.chip { border: 1px solid rgba(245,242,235,.1); background: rgba(255,255,255,.02); color: #cfc9be; transition: all .35s var(--ease); white-space: nowrap; }
.chip:hover { border-color: rgba(212,175,55,.5); color: #fff; }
.chip[aria-pressed='true'] { border-color: var(--oro); background: rgba(212,175,55,.12); color: #f6e3a6; box-shadow: 0 0 30px -10px rgba(212,175,55,.6); }

.field { width: 100%; border-radius: 14px; border: 1px solid rgba(245,242,235,.1); background: rgba(255,255,255,.03); padding: .8rem 1rem; color: #fff; font-size: 16px; transition: border-color .3s, box-shadow .3s, background-color .3s; }
.field::placeholder { color: #6f6a62; }
.field:focus { outline: none; border-color: var(--oro); box-shadow: 0 0 0 4px rgba(212,175,55,.12); background: rgba(255,255,255,.05); }
.field[aria-invalid='true'] { border-color: #f87171; }
.field::-webkit-calendar-picker-indicator { filter: invert(.8) sepia(1) saturate(3) hue-rotate(5deg); cursor: pointer; }

.marquee { animation: marquee 42s linear infinite; }
@keyframes marquee { to { transform: translateX(-50%); } }
.spin-slow { animation: spin 28s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.pulse-dot::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; background: currentColor; opacity: .4; animation: pulse 2s ease-out infinite; }
@keyframes pulse { from { transform: scale(.6); opacity: .5; } to { transform: scale(1.9); opacity: 0; } }
.map-dark { filter: invert(.92) hue-rotate(180deg) saturate(.6) brightness(.9) contrast(.95); }

html.has-cursor, html.has-cursor * { cursor: none !important; }
html.has-cursor input, html.has-cursor textarea, html.has-cursor select, html.has-cursor iframe { cursor: auto !important; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .marquee, .spin-slow, .btn-liquid::before, .pulse-dot::after { animation: none !important; }
}
`;

/* ---------------------------------------------------------------------
   4. UTILIDADES Y HOOKS
   --------------------------------------------------------------------- */
const storage = {
  get(key, fallback) {
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

function useMedia(query, initial = false) {
  const [match, setMatch] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

// Bloquea el scroll mientras haya al menos una capa abierta
let lockCount = 0;
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockCount += 1;
    document.documentElement.classList.add('is-locked');
    return () => {
      lockCount -= 1;
      if (lockCount <= 0) document.documentElement.classList.remove('is-locked');
    };
  }, [active]);
}

// Esc para cerrar, foco inicial y devolución del foco al cerrar
function useDialog(open, onClose, panelRef) {
  useScrollLock(open);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector('[data-autofocus], button, [href], input, select, textarea');
      first?.focus({ preventScroll: true });
    }, 60);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, panelRef]);
}

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ---------------------------------------------------------------------
   5. AUDIO PROCEDURAL (Web Audio API)
   --------------------------------------------------------------------- */
function createSoundEngine() {
  let ctx = null;
  let master = null;
  let ambient = null;
  const buffers = {};

  const ensure = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const noise = (seconds, brown = false) => {
    const key = `${seconds}-${brown}`;
    if (buffers[key]) return buffers[key];
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else data[i] = white;
    }
    buffers[key] = buf;
    return buf;
  };

  const env = (gain, t, peak, attack, release) => {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  };

  // Viento corto: ruido filtrado con barrido de frecuencia
  const swoosh = () => {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise(0.6);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(380, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.32);
    const g = ctx.createGain();
    env(g, t, 0.22, 0.09, 0.3);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + 0.5);
  };

  // Golpe de barro: tono grave que cae + chasquido terroso
  const clay = () => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(82, t + 0.14);
    const g = ctx.createGain();
    env(g, t, 0.32, 0.004, 0.16);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.22);
    const n = ctx.createBufferSource();
    n.buffer = noise(0.1);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1300;
    bp.Q.value = 2.5;
    const ng = ctx.createGain();
    env(ng, t, 0.12, 0.002, 0.05);
    n.connect(bp).connect(ng).connect(master);
    n.start(t);
  };

  // Campanita para "agregado al pedido"
  const chime = () => {
    const t = ctx.currentTime;
    [660, 990].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + i * 0.07);
      const g = ctx.createGain();
      env(g, t + i * 0.07, 0.12, 0.006, 0.35);
      o.connect(g).connect(master);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.45);
    });
  };

  // Ambiente de humo y brasas: ruido marrón + crepitar aleatorio
  const startAmbient = () => {
    if (ambient) return;
    const src = ctx.createBufferSource();
    src.buffer = noise(4, true);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(lp).connect(g).connect(master);
    src.start();
    lfo.start();
    const crackle = setInterval(() => {
      if (Math.random() > 0.55) return;
      const t = ctx.currentTime;
      const n = ctx.createBufferSource();
      n.buffer = noise(0.05);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2400 + Math.random() * 2400;
      const cg = ctx.createGain();
      env(cg, t, 0.02 + Math.random() * 0.05, 0.001, 0.02 + Math.random() * 0.03);
      n.connect(hp).connect(cg).connect(master);
      n.start(t);
    }, 140);
    ambient = { src, lfo, g, crackle };
  };

  const stopAmbient = () => {
    if (!ambient) return;
    const { src, lfo, g, crackle } = ambient;
    clearInterval(crackle);
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.6);
    src.stop(t + 0.7);
    lfo.stop(t + 0.7);
    ambient = null;
  };

  const sounds = { swoosh, clay, chime };
  return {
    play(name) {
      if (!ensure()) return;
      sounds[name]?.();
    },
    setAmbient(on) {
      if (!ensure()) return;
      if (on) startAmbient();
      else stopAmbient();
    },
  };
}

const SoundCtx = createContext({ enabled: false, toggle: () => {}, play: () => {} });
const useSound = () => useContext(SoundCtx);

function SoundProvider({ children }) {
  const engine = useRef(null);
  const [enabled, setEnabled] = useState(false);

  const getEngine = () => {
    if (!engine.current) engine.current = createSoundEngine();
    return engine.current;
  };

  const toggle = useCallback(() => {
    setEnabled((on) => {
      const next = !on;
      const e = getEngine();
      e.setAmbient(next);
      if (next) e.play('clay');
      storage.set('oaxakita-sound', next);
      return next;
    });
  }, []);

  const play = useCallback(
    (name) => {
      if (enabled) getEngine().play(name);
    },
    [enabled],
  );

  // El audio sólo puede arrancar con un gesto del usuario: si la preferencia
  // guardada es "encendido", se reanuda en la primera interacción.
  useEffect(() => {
    if (!storage.get('oaxakita-sound', false)) return undefined;
    const resume = () => {
      setEnabled(true);
      getEngine().setAmbient(true);
    };
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (!engine.current) return;
      engine.current.setAmbient(enabled && !document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled]);

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <SoundCtx.Provider value={value}>{children}</SoundCtx.Provider>;
}

/* ---------------------------------------------------------------------
   6. PEDIDO (estado global + persistencia)
   --------------------------------------------------------------------- */
function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const note = (action.note || '').trim();
      const key = `${action.id}|${note}`;
      const found = state.find((l) => l.key === key);
      if (found) return state.map((l) => (l.key === key ? { ...l, qty: Math.min(99, l.qty + action.qty) } : l));
      return [...state, { key, id: action.id, qty: action.qty, note }];
    }
    case 'qty':
      return state.map((l) => (l.key === action.key ? { ...l, qty: Math.max(1, Math.min(99, action.qty)) } : l));
    case 'remove':
      return state.filter((l) => l.key !== action.key);
    case 'clear':
      return [];
    default:
      return state;
  }
}

const loadCart = () => {
  const saved = storage.get('oaxakita-cart-v1', []);
  return Array.isArray(saved) ? saved.filter((l) => MENU_BY_ID[l.id] && l.qty > 0) : [];
};

/* ---------------------------------------------------------------------
   7. ARTE DE RESPALDO: grecas de Mitla + íconos por categoría
   --------------------------------------------------------------------- */
function Greca({ className = '', color = '#D4AF37', opacity = 0.5 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id={`g${id}`} width="28" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 13.5H5V2.5H17V9.5H11V6.5M17 13.5H28" fill="none" stroke={color} strokeOpacity={opacity} strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#g${id})`} />
    </svg>
  );
}

function DishArt({ dish, className = '', sizes = 'card' }) {
  const [failed, setFailed] = useState(false);
  const meta = CAT_META[dish.cat];
  if (dish.img && !failed) {
    return (
      <img
        src={dish.img}
        alt={`${dish.name}, foto del restaurante`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  const Icon = dish.icon || meta.icon;
  const [c1, c2] = meta.colors;
  const big = sizes === 'modal';
  const thumb = sizes === 'thumb';
  if (thumb) {
    return (
      <div className={`grid h-full w-full place-items-center ${className}`} style={{ background: `radial-gradient(circle at 30% 20%, ${c1}40, transparent 70%), #16110e` }} aria-hidden="true">
        <Icon className="h-6 w-6" style={{ color: c1 }} strokeWidth={1.4} />
      </div>
    );
  }
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(120% 90% at 20% 10%, ${c1}38, transparent 55%), radial-gradient(90% 80% at 100% 100%, ${c2}55, transparent 60%), linear-gradient(160deg, #18120f, #0c0a09)`,
      }}
      aria-hidden="true"
    >
      <span
        className="pointer-events-none absolute -right-2 -top-6 select-none font-display font-bold leading-none"
        style={{ fontSize: big ? '14rem' : 'clamp(5rem, 22vw, 9rem)', color: c1, opacity: 0.09 }}
      >
        {dish.name.charAt(0)}
      </span>
      <Greca className="absolute inset-x-0 bottom-0 h-4 w-full" color={c1} opacity={0.55} />
      <Greca className="absolute inset-x-0 top-0 h-4 w-full rotate-180" color={c1} opacity={0.25} />
      <div className="absolute inset-0 grid place-items-center">
        <div
          className={`relative grid place-items-center rounded-full border ${big ? 'h-32 w-32' : 'h-14 w-14 sm:h-20 sm:w-20'}`}
          style={{ borderColor: `${c1}66`, background: `radial-gradient(circle, ${c2}40, transparent 70%)`, boxShadow: `0 0 70px ${c2}55, inset 0 0 30px ${c1}22` }}
        >
          <div className="absolute inset-2 rounded-full border border-dashed" style={{ borderColor: `${c1}33` }} />
          <Icon className={big ? 'h-12 w-12' : 'h-6 w-6 sm:h-8 sm:w-8'} style={{ color: c1 }} strokeWidth={1.3} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   8. LIENZO DE PARTÍCULAS: brasas, ceniza de cacao, humo y aura de mezcal
   --------------------------------------------------------------------- */
function makeSprite(size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

function EmberCanvas({ className = '', density = 1 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const sprites = {
      ember: makeSprite(64, [[0, 'rgba(255,214,150,1)'], [0.18, 'rgba(255,140,60,.9)'], [0.45, 'rgba(229,91,43,.35)'], [1, 'rgba(229,91,43,0)']]),
      gold: makeSprite(64, [[0, 'rgba(255,240,190,1)'], [0.2, 'rgba(212,175,55,.75)'], [1, 'rgba(212,175,55,0)']]),
      smoke: makeSprite(128, [[0, 'rgba(200,190,175,.12)'], [0.5, 'rgba(160,150,140,.05)'], [1, 'rgba(120,110,100,0)']]),
    };
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;
    let inView = true;
    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0 };
    let parts = [];

    const rand = (a, b) => a + Math.random() * (b - a);
    const spawn = (p = {}, anywhere = false) => {
      const r = Math.random();
      const type = p.type || (r < 0.42 ? 'ember' : r < 0.72 ? 'ash' : r < 0.86 ? 'gold' : 'smoke');
      const base = {
        type,
        x: p.x ?? rand(0, w),
        y: p.y ?? (anywhere ? rand(0, h) : h + rand(10, 80)),
        vx: p.vx ?? rand(-0.15, 0.15),
        vy: 0,
        life: 0,
        max: rand(400, 900),
        phase: rand(0, Math.PI * 2),
        spin: rand(-0.02, 0.02),
      };
      if (type === 'ember') Object.assign(base, { size: rand(4, 11), vy: p.vy ?? rand(-0.9, -0.35), flick: rand(0.05, 0.15) });
      if (type === 'gold') Object.assign(base, { size: rand(3, 8), vy: p.vy ?? rand(-0.35, -0.1), flick: rand(0.02, 0.06) });
      if (type === 'ash') Object.assign(base, { size: rand(1, 2.6), vy: p.vy ?? rand(-0.4, -0.08), shade: Math.random() < 0.5 ? '74,48,36' : '120,110,100' });
      if (type === 'smoke') Object.assign(base, { size: rand(90, 220), vy: rand(-0.35, -0.12), max: rand(700, 1200) });
      if (anywhere) base.life = rand(0, base.max * 0.7);
      return base;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(260, Math.max(50, ((w * h) / 9000) * density)) * (reduce ? 0.5 : 1));
      parts = Array.from({ length: target }, () => spawn({}, true));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      mouse.vx *= 0.92;
      mouse.vy *= 0.92;
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i];
        p.life += 1;
        p.phase += 0.01;
        // Deriva con turbulencia suave
        p.vx += Math.sin(p.phase + p.y * 0.004) * 0.006;
        // Interacción con el cursor: remolino + empuje
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 32000) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 179) * 0.35;
          p.vx += (dx / d) * f + (-dy / d) * f * 0.6 + mouse.vx * 0.012;
          p.vy += (dy / d) * f + (dx / d) * f * 0.6 + mouse.vy * 0.012;
        }
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + (p.type === 'smoke' ? -0.003 : p.type === 'ash' ? -0.002 : -0.006);
        p.x += p.vx;
        p.y += p.vy;
        const k = p.life / p.max;
        const fade = Math.min(1, k * 6) * Math.min(1, (1 - k) * 3);
        if (p.type === 'smoke') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade * 0.9;
          const s = p.size * (1 + k * 0.8);
          ctx.drawImage(sprites.smoke, p.x - s / 2, p.y - s / 2, s, s);
        } else if (p.type === 'ash') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade * 0.75;
          ctx.fillStyle = `rgb(${p.shade})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, p.phase * 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'lighter';
          const flicker = 0.65 + Math.sin(p.life * p.flick * 6) * 0.35;
          ctx.globalAlpha = fade * flicker;
          const s = p.size * (p.type === 'ember' ? 1 - k * 0.5 : 1);
          ctx.drawImage(p.type === 'ember' ? sprites.ember : sprites.gold, p.x - s, p.y - s, s * 2, s * 2);
        }
        if (p.life >= p.max || p.y < -260 || p.x < -260 || p.x > w + 260) parts[i] = spawn();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduce || !inView || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (mouse.x > -9000) {
        mouse.vx = x - mouse.x;
        mouse.vy = y - mouse.y;
      }
      mouse.x = x;
      mouse.y = y;
      // Estela de chispas cuando el cursor se mueve rápido
      const speed = Math.hypot(mouse.vx, mouse.vy);
      if (running && speed > 18 && y > 0 && y < h && Math.random() < 0.5) {
        const idx = Math.floor(Math.random() * parts.length);
        parts[idx] = spawn({ type: 'ember', x, y, vx: mouse.vx * 0.04 + rand(-0.5, 0.5), vy: mouse.vy * 0.04 - rand(0.4, 1.2) });
        parts[idx].max = rand(80, 160);
      }
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onVis = () => (document.hidden ? stop() : start());

    resize();
    if (reduce) for (let i = 0; i < 2; i += 1) draw();
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    ro.observe(canvas);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [density, reduce]);

  return <canvas ref={ref} className={`pointer-events-none ${className}`} aria-hidden="true" />;
}

/* ---------------------------------------------------------------------
   9. CURSOR MAGNÉTICO
   --------------------------------------------------------------------- */
const CURSOR_LABELS = { view: 'Ver', add: '+', map: 'Ir', drag: '' };

function Cursor() {
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const reduce = useReducedMotion();
  const enabled = fine && !reduce;
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 });
  const [mode, setMode] = useState('default');
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    document.documentElement.classList.add('has-cursor');
    const onMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const el = e.target instanceof Element ? e.target : null;
      const tagged = el?.closest('[data-cursor]');
      if (tagged) setMode(tagged.getAttribute('data-cursor'));
      else if (el?.closest('input, textarea, select, iframe')) setMode('text');
      else if (el?.closest('a, button, [role="button"], label')) setMode('link');
      else setMode('default');
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    const onOut = (e) => {
      if (!e.relatedTarget) setVisible(false);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('pointerout', onOut);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerout', onOut);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  const label = CURSOR_LABELS[mode];
  const ringScale = { default: 1, link: 1.6, view: 2.3, add: 1.9, map: 2.3, text: 0.4 }[mode] ?? 1;
  const fire = mode === 'add' || mode === 'view' || mode === 'map';

  return (
    <div className="pointer-events-none fixed inset-0 z-[200]" aria-hidden="true" style={{ opacity: visible ? 1 : 0, transition: 'opacity .3s' }}>
      <motion.div
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-[#F5F2EB] mix-blend-difference"
        style={{ x, y, translateX: '-50%', translateY: '-50%' }}
        animate={{ scale: mode === 'text' ? 0 : down ? 0.5 : 1 }}
      />
      <motion.div
        className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full border"
        style={{ x: rx, y: ry, translateX: '-50%', translateY: '-50%' }}
        animate={{
          scale: down ? ringScale * 0.85 : ringScale,
          borderColor: fire ? 'rgba(229,91,43,0)' : 'rgba(245,242,235,0.55)',
          backgroundColor: fire ? 'rgba(229,91,43,0.92)' : 'rgba(212,175,55,0)',
          boxShadow: fire ? '0 0 40px 6px rgba(229,91,43,.45)' : '0 0 0 0 rgba(0,0,0,0)',
          mixBlendMode: fire ? 'normal' : 'difference',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <AnimatePresence>
          {label && (
            <motion.span
              key={mode}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="font-sans text-[7px] font-bold uppercase tracking-[0.18em] text-white"
              style={{ fontSize: mode === 'add' ? 12 : 6 }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   10. PIEZAS DE INTERFAZ REUTILIZABLES
   --------------------------------------------------------------------- */
function Magnetic({ as = 'button', strength = 0.25, className = '', children, onClick, ...rest }) {
  const ref = useRef(null);
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 16 });
  const sy = useSpring(my, { stiffness: 220, damping: 16 });
  const { play } = useSound();
  const Comp = as === 'a' ? motion.a : motion.button;
  return (
    <Comp
      ref={ref}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (!fine || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left - r.width / 2) * strength);
        my.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      onClick={(e) => {
        play('clay');
        onClick?.(e);
      }}
      whileTap={{ scale: 0.96 }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  );
}

function Eyebrow({ children, className = '' }) {
  return (
    <p className={`flex items-center gap-3 font-sans text-[10px] font-semibold uppercase tracking-[0.38em] text-oro sm:text-[11px] ${className}`}>
      <span className="h-px w-8 bg-gradient-to-r from-transparent to-oro" aria-hidden="true" />
      {children}
    </p>
  );
}

const revealUp = {
  hidden: { opacity: 0, y: 36 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 1, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

function Reveal({ children, i = 0, className = '', as = 'div' }) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={revealUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} custom={i}>
      {children}
    </Comp>
  );
}

function SectionTitle({ eyebrow, title, accent, children, align = 'left' }) {
  return (
    <div className={`max-w-3xl ${align === 'center' ? 'mx-auto text-center [&>p:first-child]:justify-center' : ''}`}>
      <Reveal>
        <Eyebrow className={align === 'center' ? 'justify-center' : ''}>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal i={1} as="h2" className="mt-5 font-display text-[2rem] font-semibold leading-[1.05] tracking-tight text-marfil xs:text-[2.4rem] sm:text-5xl lg:text-6xl">
        {title} {accent && <em className="font-serif font-medium italic text-oro-grad">{accent}</em>}
      </Reveal>
      {children && (
        <Reveal i={2} as="p" className="mt-5 text-[15px] leading-relaxed text-ceniza sm:text-base">
          {children}
        </Reveal>
      )}
    </div>
  );
}

function Toast({ toast }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex justify-center px-4 sm:bottom-8" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="glass gold-edge flex items-center gap-3 rounded-full px-5 py-3 text-sm text-marfil shadow-2xl"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-oro" />
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------------------------------------------
   11. PRELOADER
   --------------------------------------------------------------------- */
function Preloader({ onDone }) {
  const [pct, setPct] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    let loaded = 0;
    const assets = Object.values(PHOTOS);
    const total = assets.length + 1;
    const bump = () => {
      loaded += 1;
    };
    assets.forEach((src) => {
      const img = new Image();
      img.onload = bump;
      img.onerror = bump;
      img.src = src;
    });
    (document.fonts?.ready || Promise.resolve()).then(bump, bump);

    const start = performance.now();
    const minTime = reduce ? 300 : 1500;
    const maxTime = 4500;
    let shown = 0;
    let raf = 0;
    const tick = (now) => {
      const elapsed = now - start;
      const real = loaded / total;
      const timeCap = Math.min(1, elapsed / minTime);
      const target = elapsed > maxTime ? 1 : Math.min(real, timeCap) * 0.98 + (real >= 1 && timeCap >= 1 ? 0.02 : 0);
      shown += (target - shown) * 0.12;
      if (target >= 1 && shown > 0.995) shown = 1;
      setPct(Math.round(shown * 100));
      if (shown >= 1) {
        setTimeout(onDone, reduce ? 0 : 280);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone, reduce]);

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-obsidiana"
      exit={{ clipPath: 'inset(0 0 100% 0)' }}
      initial={{ clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
      role="status"
      aria-live="polite"
    >
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(500px 300px at 50% 55%, rgba(212,175,55,.10), transparent 70%)' }} />
      <Greca className="absolute inset-x-0 top-8 h-4 w-full" opacity={0.25} />
      <Greca className="absolute inset-x-0 bottom-8 h-4 w-full rotate-180" opacity={0.25} />
      <motion.p
        className="relative px-6 text-center font-display text-xl tracking-[0.2em] text-oro-grad sm:text-2xl"
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        Cargando los sabores ancestrales…
      </motion.p>
      <div className="relative mt-8 h-px w-56 overflow-hidden bg-white/10 sm:w-72">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-terracota via-maiz to-oro" style={{ width: `${pct}%` }} />
      </div>
      <p className="relative mt-5 font-display text-5xl tabular-nums text-marfil/90 sm:text-6xl">
        {pct}
        <span className="text-2xl text-oro">%</span>
      </p>
      <p className="relative mt-10 text-[10px] uppercase tracking-[0.5em] text-ceniza">Oaxakita · Aguascalientes</p>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------
   12. ENCABEZADO
   --------------------------------------------------------------------- */
const NAV = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'pilares', label: 'La casa' },
  { id: 'menu', label: 'Menú' },
  { id: 'visitanos', label: 'Visítanos' },
];

function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="10" fill="#110F0E" stroke="#D4AF37" strokeOpacity=".5" />
        <path d="M7 29 L15 15 L20 23 L25 13 L33 29" fill="none" stroke="#E5A93B" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M7 32H33" stroke="#2D483A" strokeWidth="2" />
        <circle cx="25" cy="10" r="2" fill="#E55B2B" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-[0.12em] text-marfil">
        OAXAKITA
      </span>
    </span>
  );
}

function Header({ cartCount, onCart, onReserve }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('inicio');
  const { enabled, toggle, play } = useSound();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  useScrollLock(open);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  const go = (id) => {
    setOpen(false);
    play('swoosh');
    setTimeout(() => scrollToId(id), open ? 250 : 0);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-500 ${
          scrolled ? 'border-[rgba(212,175,55,.14)] bg-obsidiana/70 py-2.5 backdrop-blur-2xl' : 'border-transparent py-4'
        }`}
      >
        <div className="mx-auto flex max-w-[1600px] 3xl:max-w-[2200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <a href="#inicio" onClick={(e) => (e.preventDefault(), go('inicio'))} aria-label="Oaxakita, ir al inicio">
            <Logo />
          </a>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={(e) => (e.preventDefault(), go(n.id))}
                className={`relative rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition-colors ${active === n.id ? 'text-marfil' : 'text-ceniza hover:text-marfil'}`}
                aria-current={active === n.id ? 'true' : undefined}
              >
                {active === n.id && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full border border-[rgba(212,175,55,.25)] bg-white/[.04]" />}
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-ceniza transition-colors hover:border-oro/60 hover:text-oro"
              aria-pressed={enabled}
              aria-label={enabled ? 'Silenciar ambiente sonoro' : 'Activar ambiente sonoro'}
              title={enabled ? 'Silenciar' : 'Activar sonido'}
            >
              {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <Magnetic
              onClick={onReserve}
              className="btn-ghost hidden h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold sm:inline-flex"
            >
              <CalendarDays className="h-4 w-4" /> Reservar
            </Magnetic>
            <button
              type="button"
              onClick={onCart}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 text-marfil transition-colors hover:border-oro/60"
              aria-label={`Abrir mi pedido (${cartCount} artículos)`}
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4 }}
                    animate={{ scale: [1.4, 1] }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-teotitlan px-1 text-[10px] font-bold text-white shadow-[0_0_20px_rgba(229,91,43,.7)]"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                play('swoosh');
              }}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-marfil lg:hidden"
              aria-label="Abrir navegación"
              aria-expanded={open}
            >
              <MenuIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <motion.div className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-terracota via-maiz to-oro" style={{ scaleX: progress }} />
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex flex-col bg-obsidiana/95 px-6 pb-10 pt-5 backdrop-blur-2xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Navegación"
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10" aria-label="Cerrar navegación" data-autofocus>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-14 flex flex-col gap-2" aria-label="Móvil">
              {NAV.map((n, i) => (
                <motion.a
                  key={n.id}
                  href={`#${n.id}`}
                  onClick={(e) => (e.preventDefault(), go(n.id))}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: 0.08 * i + 0.1, ease: [0.22, 1, 0.36, 1], duration: 0.7 } }}
                  className="flex items-baseline gap-4 border-b border-white/5 py-4 font-display text-4xl text-marfil"
                >
                  <span className="font-sans text-xs text-oro">0{i + 1}</span>
                  {n.label}
                </motion.a>
              ))}
            </nav>
            <div className="mt-auto grid gap-3">
              <button type="button" onClick={() => (setOpen(false), onReserve())} className="btn-liquid inline-flex h-14 items-center justify-center gap-2 rounded-full font-semibold">
                <CalendarDays className="h-4 w-4" /> <span>Reservar mesa</span>
              </button>
              <a href={`tel:${BIZ.phoneTel}`} className="btn-ghost inline-flex h-14 items-center justify-center gap-2 rounded-full font-semibold">
                <Phone className="h-4 w-4" /> {BIZ.phoneDisplay}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------------------------------------------------------------------
   13. HERO
   --------------------------------------------------------------------- */
const HERO_LINES = [
  { words: ['El', 'Latido', 'de', 'Oaxaca'], tone: 'marfil' },
  { words: ['en', 'Aguascalientes'], tone: 'fuego' },
];
const FIRE = ['#E5A93B', '#D4AF37', '#E55B2B', '#C85A32'];
const lerpHex = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};
const fireAt = (t) => {
  const seg = Math.min(FIRE.length - 2, Math.floor(t * (FIRE.length - 1)));
  return lerpHex(FIRE[seg], FIRE[seg + 1], t * (FIRE.length - 1) - seg);
};

function HeroTitle({ ready }) {
  let n = 0;
  return (
    <h1 className="font-display font-semibold leading-[0.95] tracking-[-0.01em]" aria-label="El Latido de Oaxaca en Aguascalientes">
      {HERO_LINES.map((line, li) => {
        const letters = line.words.join('').length;
        let k = 0;
        return (
          <span key={li} className={`block ${li === 0 ? 'text-[clamp(2.2rem,7.1vw,8rem)]' : 'text-[clamp(1.6rem,8vw,9rem)]'}`} aria-hidden="true">
            {line.words.map((word, wi) => (
              <span key={wi} className={`mr-[0.22em] inline-block whitespace-nowrap ${word === 'en' ? 'font-serif text-[0.62em] font-medium italic' : ''}`}>
                {word.split('').map((ch, ci) => {
                  const idx = n++;
                  const t = k++ / Math.max(1, letters - 1);
                  return (
                    <span key={ci} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                      <motion.span
                        className="inline-block"
                        style={{
                          color: line.tone === 'fuego' ? fireAt(t) : '#F5F2EB',
                          textShadow: line.tone === 'fuego' ? '0 0 40px rgba(229,91,43,.35)' : '0 0 50px rgba(245,242,235,.08)',
                        }}
                        initial={{ y: '110%', rotate: 8, opacity: 0 }}
                        animate={ready ? { y: '0%', rotate: 0, opacity: 1 } : {}}
                        transition={{ duration: 1.1, delay: 0.15 + idx * 0.035, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {ch}
                      </motion.span>
                    </span>
                  );
                })}
              </span>
            ))}
          </span>
        );
      })}
    </h1>
  );
}

function SealBadge() {
  const text = 'COCINA DE HUMO · MEZCAL · MAÍZ · BARRO · OAXAKITA · ';
  return (
    <div className="relative h-36 w-36 xl:h-44 xl:w-44" aria-hidden="true">
      <svg viewBox="0 0 200 200" className="spin-slow absolute inset-0 h-full w-full">
        <defs>
          <path id="seal-path" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text fill="#D4AF37" fontSize="12" fontFamily="Cinzel, Georgia, serif">
          <textPath href="#seal-path" textLength="486" lengthAdjust="spacing">{text}</textPath>
        </text>
      </svg>
      <div className="absolute inset-[30%] grid place-items-center rounded-full border border-oro/30 bg-gradient-to-br from-terracota/30 to-transparent">
        <Flame className="h-7 w-7 text-teotitlan" strokeWidth={1.4} />
      </div>
    </div>
  );
}

function Hero({ ready, onMenu, onReserve }) {
  const { scrollY } = useScroll();
  const yText = useTransform(scrollY, [0, 800], [0, 140]);
  const fade = useTransform(scrollY, [0, 600], [1, 0]);
  const appear = (d) => ({
    initial: { opacity: 0, y: 24 },
    animate: ready ? { opacity: 1, y: 0 } : {},
    transition: { duration: 1.1, delay: d, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <section id="inicio" className="relative flex min-h-[100svh] flex-col overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-40 top-1/3 h-[38rem] w-[38rem] rounded-full bg-terracota/20 blur-[140px]" />
        <div className="absolute -right-32 -top-20 h-[30rem] w-[30rem] rounded-full bg-agave/40 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-[100%] bg-teotitlan/20 blur-[120px]" />
      </div>
      <EmberCanvas className="absolute inset-0 h-full w-full" density={1.1} />
      <Greca className="pointer-events-none absolute inset-x-0 bottom-0 h-5 w-full" opacity={0.18} />

      <motion.div style={{ y: yText, opacity: fade }} className="relative mx-auto flex w-full max-w-[1600px] 3xl:max-w-[2200px] flex-1 flex-col justify-center px-4 pb-16 sm:px-6 lg:px-10">
        <motion.a
          {...appear(0)}
          href="https://www.google.com/maps/search/?api=1&query=Restaurante+Oaxakita+Aguascalientes"
          target="_blank"
          rel="noopener"
          className="glass gold-edge inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold tracking-wide text-marfil sm:text-xs"
        >
          <span className="flex text-maiz" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
            <Star className="h-3 w-3 fill-current opacity-50" />
          </span>
          {BIZ.rating} ★ · +{BIZ.reviews} reseñas en Google
        </motion.a>

        <div className="mt-7 sm:mt-9">
          <HeroTitle ready={ready} />
        </div>

        <div className="mt-8 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <motion.p {...appear(0.9)} className="text-[15px] leading-relaxed text-ceniza sm:text-lg">
              Cocina de humo, mezcales silvestres, maíces criollos y la magia del barro en un espacio inmersivo.
            </motion.p>
            <motion.div {...appear(1.05)} className="mt-8 flex flex-col gap-3 xs:flex-row">
              <Magnetic onClick={onMenu} className="btn-liquid inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold" data-cursor="view">
                <span>Explorar el Menú</span>
                <ArrowRight className="h-4 w-4" />
              </Magnetic>
              <Magnetic onClick={onReserve} className="btn-ghost inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold text-marfil">
                <MapPin className="h-4 w-4 text-oro" /> Reservar Mesa / Ubicación
              </Magnetic>
            </motion.div>
          </div>
          <motion.div {...appear(1.2)} className="hidden lg:block">
            <SealBadge />
          </motion.div>
        </div>
      </motion.div>

      <motion.div {...appear(1.35)} className="relative border-t border-white/5 bg-obsidiana/40 backdrop-blur-md">
        <dl className="mx-auto grid max-w-[1600px] 3xl:max-w-[2200px] grid-cols-1 gap-y-3 px-4 py-4 text-sm xs:grid-cols-3 sm:px-6 lg:px-10">
          {[
            { icon: Clock, k: 'Abre', v: 'Diario · 8:00 a.m.' },
            { icon: UtensilsCrossed, k: 'Promedio', v: '$200–300 p/p' },
            { icon: MapPin, k: 'Dónde', v: 'Valle Dorado, Ags.' },
          ].map(({ icon: I, k, v }) => (
            <div key={k} className="flex items-center gap-3">
              <I className="h-4 w-4 shrink-0 text-oro" />
              <dt className="sr-only">{k}</dt>
              <dd className="text-[13px] text-marfil/80">{v}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  );
}

function Marquee() {
  const words = [...BIZ.tags, 'Mole negro en cazuela de barro', 'Tlayudas al carbón', 'Mezcales silvestres', 'Pan de yema', 'Chocolate de molino de piedra', 'Tejate'];
  const row = [...words, ...words];
  return (
    <div className="relative overflow-hidden border-y border-[rgba(212,175,55,.12)] bg-barro/60 py-5" aria-hidden="true">
      <div className="marquee flex w-max gap-10">
        {row.map((w, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-xl text-marfil/70 sm:text-2xl">
            {w}
            <span className="text-teotitlan">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   14. BENTO: LOS CUATRO PILARES DEL SABOR
   --------------------------------------------------------------------- */
function TiltCard({ className = '', children, glow = '#E55B2B' }) {
  const ref = useRef(null);
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const px = useMotionValue(50);
  const py = useMotionValue(50);
  const srx = useSpring(rx, { stiffness: 160, damping: 18 });
  const sry = useSpring(ry, { stiffness: 160, damping: 18 });
  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${px}% ${py}%, ${glow}26, transparent 45%)`;
  const active = fine && !reduce;

  return (
    <motion.article
      ref={ref}
      variants={revealUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      onPointerMove={(e) => {
        if (!active || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        ry.set((x - 0.5) * 9);
        rx.set((0.5 - y) * 9);
        px.set(x * 100);
        py.set(y * 100);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1100 }}
      className={`gold-edge neo group relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#16110e] to-[#0c0a09] ${className}`}
    >
      <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: spotlight }} />
      {children}
    </motion.article>
  );
}

function PillarHead({ n, icon: Icon, title, color }) {
  return (
    <div className="flex items-center justify-between">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03]" style={{ boxShadow: `0 0 40px -8px ${color}` }}>
        <Icon className="h-5 w-5" style={{ color }} strokeWidth={1.6} />
      </span>
      <span className="font-display text-sm tracking-[0.3em] text-ceniza">{n}</span>
      <span className="sr-only">{title}</span>
    </div>
  );
}

const AGAVES = [
  { name: 'Madre Cuishe', deg: 42, note: 'Notas herbales' },
  { name: 'Tobalá', deg: 42, note: 'Amaderado y ahumado' },
  { name: 'Tepeztate', deg: 42, note: 'Agave silvestre de 25 años' },
  { name: 'Espadín Pechuga', deg: 40, note: 'Fruta de temporada' },
];

function Pillars({ onFilter }) {
  return (
    <section id="pilares" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-[1600px] 3xl:max-w-[2200px] px-4 sm:px-6 lg:px-10">
        <SectionTitle eyebrow="La casa" title="Los cuatro pilares" accent="del sabor">
          Fuego, agave, maíz y tierra: lo que sostiene cada plato que sale de nuestra cocina en Valle Dorado.
        </SectionTitle>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5" style={{ perspective: 1400 }}>
          {/* 01 · Fuego y barro */}
          <TiltCard className="p-6 sm:p-8 md:col-span-2 lg:col-span-7" glow="#E55B2B">
            <div className="flex h-full flex-col">
              <PillarHead n="01" icon={Flame} title="El Fuego y el Barro" color="#E55B2B" />
              <div className="mt-8 grid flex-1 items-center gap-8 sm:grid-cols-[1fr_minmax(0,300px)]">
                <div>
                  <h3 className="font-display text-3xl font-semibold leading-tight text-marfil sm:text-4xl xl:text-5xl">
                    El Fuego <span className="font-serif italic text-teotitlan">y</span> el Barro
                  </h3>
                  <p className="mt-4 max-w-md leading-relaxed text-ceniza">
                    Tasajo, cecina enchilada y chorizo asados al carbón. Moles elaborados artesanalmente en cazuela de barro y pan de yema
                    de horno de leña.
                  </p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {['Al carbón', 'Cazuela de barro', 'Horno de leña'].map((t) => (
                      <li key={t} className="rounded-full border border-teotitlan/30 bg-teotitlan/10 px-3 py-1.5 text-xs text-[#ffb895]">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <figure className="relative mx-auto w-full max-w-[300px] rotate-[3deg] transition-transform duration-700 group-hover:rotate-0" data-cursor="view">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black p-2 shadow-[0_30px_80px_-20px_rgba(229,91,43,.5)]">
                    <img src={PHOTOS.carnes} alt="Carnes asadas de Oaxakita: tasajo, cecina, chorizo, aguacate y col morada" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
                    <figcaption className="px-1 pb-1 pt-3 text-[11px] uppercase tracking-[0.25em] text-ceniza">Carnes asadas · $178</figcaption>
                  </div>
                </figure>
              </div>
              <button type="button" onClick={() => onFilter('carnes')} className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-oro hover:text-maiz">
                Ver carnes y botanas <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </TiltCard>

          {/* 02 · Mezcalería */}
          <TiltCard className="p-6 sm:p-8 lg:col-span-5" glow="#D4AF37">
            <PillarHead n="02" icon={Wine} title="El Elíxir Sagrado" color="#D4AF37" />
            <h3 className="mt-6 font-display text-2xl font-semibold text-marfil sm:text-3xl">
              El Elíxir <span className="font-serif italic text-oro-grad">Sagrado</span>
            </h3>
            <p className="mt-2 text-sm text-ceniza">Mezcalería de agaves silvestres, por botella de 750 ml o en coctelería de autor.</p>
            <ul className="mt-6 space-y-3.5">
              {AGAVES.map((a, i) => (
                <li key={a.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-marfil">{a.name}</span>
                    <span className="tabular-nums text-oro">{a.deg}°</span>
                  </div>
                  <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-agave via-oro to-maiz"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(a.deg / 50) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, delay: 0.2 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-ceniza">{a.note}</p>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => onFilter('mezcal')} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-oro hover:text-maiz">
              Mezcales y cocteles <ArrowUpRight className="h-4 w-4" />
            </button>
          </TiltCard>

          {/* 03 · Maíz y tlayuda */}
          <TiltCard className="flex flex-col p-6 sm:p-8 lg:col-span-5" glow="#E5A93B">
            <PillarHead n="03" icon={Wheat} title="El Maíz y la Tlayuda" color="#E5A93B" />
            <div className="mt-6 flex items-center gap-6">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl font-semibold text-marfil sm:text-3xl">
                  El Maíz <span className="font-serif italic text-maiz">y la</span> Tlayuda
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ceniza">Tlayuda tradicional de 32 cm, doblada al carbón con tasajo, cecina y chorizo.</p>
              </div>
              <svg viewBox="0 0 120 120" className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" aria-hidden="true">
                <motion.circle cx="60" cy="60" r="50" fill="none" stroke="#E5A93B" strokeWidth="1.5" strokeDasharray="2 4" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8 }} />
                <circle cx="60" cy="60" r="42" fill="rgba(229,169,59,.08)" stroke="rgba(229,169,59,.3)" />
                <motion.path d="M14 60 H106" stroke="#E55B2B" strokeWidth="1.5" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.6 }} />
                <path d="M14 55 V65 M106 55 V65" stroke="#E55B2B" strokeWidth="1.5" />
                <text x="60" y="52" textAnchor="middle" fill="#F5F2EB" fontSize="13" fontFamily="Cinzel, Georgia, serif">32 cm</text>
              </svg>
            </div>
            <ul className="mt-6 divide-y divide-white/5 border-y border-white/5 text-sm">
              {['tlayuda-tradicional', 'tlayuda-oaxakita', 'tlayuda-chapulines', 'tostada-huerto'].map((id) => (
                <li key={id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-marfil/90">{MENU_BY_ID[id].name}</span>
                  <span className="tabular-nums text-maiz">{mxn(MENU_BY_ID[id].price)}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => onFilter('tlayudas')} className="mt-auto inline-flex w-fit items-center gap-2 pt-6 text-sm font-semibold text-oro hover:text-maiz">
              Ver tlayudas <ArrowUpRight className="h-4 w-4" />
            </button>
          </TiltCard>

          {/* 04 · Tienda y panadería */}
          <TiltCard className="p-6 sm:p-8 md:col-span-2 lg:col-span-7" glow="#2D483A">
            <div className="grid gap-8">
              <div>
                <PillarHead n="04" icon={Store} title="La Tienda y Panadería" color="#7fb393" />
                <h3 className="mt-6 font-display text-2xl font-semibold text-marfil sm:text-3xl xl:text-4xl">
                  La Tienda <span className="font-serif italic text-[#7fb393]">&amp;</span> Panadería
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-ceniza sm:text-base">
                  Llévate Oaxaca a casa: chocolate de cacao molido en piedra, quesillo, moles en pasta, sales de gusano y chapulín, y pan
                  de yema de horno de leña.
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <button type="button" onClick={() => onFilter('tienda')} className="inline-flex items-center gap-2 text-sm font-semibold text-oro hover:text-maiz">
                    Ver tienda <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onFilter('dulce')} className="inline-flex items-center gap-2 text-sm font-semibold text-oro hover:text-maiz">
                    Panadería y postres <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ul className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 xl:grid-cols-3">
                {['choco-semiamargo', 'quesillo', 'mole-negro-pasta', 'sal-gusano', 'pan-yema', 'pan-cazuela'].map((id) => {
                  const d = MENU_BY_ID[id];
                  return (
                    <li key={id} className="rounded-2xl border border-white/[.06] bg-white/[.02] p-4">
                      <p className="text-sm font-medium text-marfil">{d.name}</p>
                      <p className="mt-1 flex items-center justify-between text-xs text-ceniza">
                        <span>{d.badges[0] || 'Pieza'}</span>
                        <span className="font-semibold tabular-nums text-maiz">{mxn(d.price)}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------
   15. MENÚ INTERACTIVO
   --------------------------------------------------------------------- */
function DishCard({ dish, onOpen, onQuickAdd }) {
  const meta = CAT_META[dish.cat];
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <div className="gold-edge relative flex h-full flex-row overflow-hidden rounded-[22px] sm:flex-col bg-[#100d0b] transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_70px_-30px_rgba(229,91,43,.45)]">
        <button type="button" onClick={() => onOpen(dish)} className="relative block w-28 shrink-0 overflow-hidden text-left xs:w-32 sm:aspect-[16/11] sm:w-auto" data-cursor="view" aria-label={`Ver detalle de ${dish.name}`}>
          <div className="h-full w-full transition-transform duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.06]">
            <DishArt dish={dish} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#100d0b] via-transparent to-transparent opacity-90" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-teotitlan/0 to-oro/0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:from-teotitlan/30 group-hover:to-oro/20 group-hover:opacity-100" />
          {dish.badges.length > 0 && (
            <span className="absolute left-3 top-3 hidden flex-wrap gap-1.5 sm:flex">
              {dish.badges.slice(0, 2).map((b) => (
                <span key={b} className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-marfil backdrop-blur-md">
                  {b}
                </span>
              ))}
            </span>
          )}
          {dish.img && <span className="absolute bottom-2 right-2 hidden rounded sm:inline-full bg-black/55 px-2 py-0.5 text-[9px] uppercase tracking-widest text-ceniza backdrop-blur">Foto real</span>}
        </button>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: meta.colors[0] }}>
            {meta.label.split(' · ')[0]}
            {dish.badges[0] && <span className="text-ceniza sm:hidden"> · {dish.badges[0]}</span>}
          </p>
          <h4 className="mt-1.5 font-display text-base sm:mt-2 sm:text-lg font-semibold leading-snug text-marfil">{dish.name}</h4>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ceniza">{dish.desc}</p>
          <div className="mt-auto flex items-center justify-between pt-3 sm:pt-5">
            <span className="font-display text-xl tabular-nums text-maiz">{mxn(dish.price)}</span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85, rotate: 90 }}
              onClick={() => onQuickAdd(dish)}
              className="grid h-11 w-11 place-items-center rounded-full border border-oro/40 bg-oro/10 text-oro transition-colors hover:border-teotitlan hover:bg-teotitlan hover:text-white"
              aria-label={`Agregar ${dish.name} a mi pedido`}
              data-cursor="add"
            >
              <Plus className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

function MenuSection({ filter, setFilter, onOpen, onQuickAdd }) {
  const [query, setQuery] = useState('');
  const { play } = useSound();
  const chipsRef = useRef(null);

  const groups = useMemo(() => {
    // Con búsqueda activa se busca en toda la carta, sin importar el filtro
    const q = normalize(query.trim());
    const f = q ? FILTERS[0] : FILTERS.find((x) => x.id === filter) || FILTERS[0];
    const list = MENU.filter((m) => !q || normalize(`${m.name} ${m.desc} ${m.badges.join(' ')}`).includes(q)).filter((m) => f.cats.includes(m.cat));
    return f.cats.map((cat) => ({ cat, items: list.filter((m) => m.cat === cat) })).filter((g) => g.items.length);
  }, [filter, query]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);

  // Centra el filtro activo dentro de la barra (sin mover la página)
  useEffect(() => {
    const bar = chipsRef.current;
    const el = bar?.querySelector('[aria-pressed="true"]');
    if (!bar || !el) return;
    bar.scrollTo({ left: el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }, [filter]);

  return (
    <section id="menu" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px divider-oro" aria-hidden="true" />
      <div className="mx-auto max-w-[1600px] 3xl:max-w-[2200px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle eyebrow="La carta" title="Menú" accent="Oaxakita">
            {MENU.length} platillos, bebidas y productos de nuestra carta. Toca un platillo para ver el detalle o agrégalo directo a tu pedido.
          </SectionTitle>
          <Reveal i={2} className="w-full lg:max-w-sm">
            <label className="relative block">
              <span className="sr-only">Buscar en el menú</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ceniza" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca mole, tlayuda, tobalá…"
                className="field glass !rounded-full !py-3.5 !pl-11 !pr-10"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-ceniza hover:text-marfil" aria-label="Limpiar búsqueda">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </Reveal>
        </div>

        <div className="sticky top-[60px] z-30 -mx-4 mt-10 border-y border-white/[.04] bg-obsidiana/80 px-4 py-3 backdrop-blur-2xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div ref={chipsRef} className="no-scrollbar flex gap-2 overflow-x-auto" role="toolbar" aria-label="Filtrar el menú por categoría">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={!query.trim() && filter === f.id}
                onClick={() => {
                  setFilter(f.id);
                  setQuery('');
                  play('clay');
                }}
                className="chip rounded-full px-4 py-2 text-[13px] font-medium"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-ceniza" aria-live="polite">
          {total} {total === 1 ? 'resultado' : 'resultados'}
          {query.trim() && ` para “${query.trim()}” en toda la carta`}
        </p>

        {total === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-white/10 p-10 text-center">
            <p className="font-display text-2xl text-marfil">Nada por aquí…</p>
            <p className="mt-2 text-sm text-ceniza">Prueba con otra palabra o revisa todas las categorías.</p>
            <button type="button" onClick={() => (setQuery(''), setFilter('todos'))} className="btn-ghost mt-6 inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold">
              Ver todo el menú
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-14">
            {groups.map((g) => {
              const meta = CAT_META[g.cat];
              const Icon = meta.icon;
              return (
                <div key={g.cat}>
                  <div className="mb-5 flex items-center gap-3">
                    <Icon className="h-5 w-5" style={{ color: meta.colors[0] }} strokeWidth={1.6} />
                    <h3 className="font-display text-xl text-marfil sm:text-2xl">{meta.label}</h3>
                    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    <span className="text-xs tabular-nums text-ceniza">{g.items.length}</span>
                  </div>
                  <motion.ul layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5">
                    <AnimatePresence mode="popLayout">
                      {g.items.map((d) => (
                        <DishCard key={d.id} dish={d} onOpen={onOpen} onQuickAdd={onQuickAdd} />
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function QtyStepper({ value, onChange, label, small = false }) {
  const size = small ? 'h-8 w-8' : 'h-11 w-11';
  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[.03]" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} className={`grid ${size} place-items-center rounded-full text-marfil transition-colors hover:text-oro disabled:opacity-30`} aria-label="Quitar uno">
        <Minus className="h-4 w-4" />
      </button>
      <span className={`min-w-8 text-center font-semibold tabular-nums ${small ? 'text-sm' : ''}`} aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= 99} className={`grid ${size} place-items-center rounded-full text-marfil transition-colors hover:text-oro disabled:opacity-30`} aria-label="Agregar uno">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function NoteChips({ value, onChange }) {
  const has = (n) => value.split(',').map((s) => s.trim()).includes(n);
  const toggle = (n) => {
    const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
    onChange((has(n) ? parts.filter((p) => p !== n) : [...parts, n]).join(', '));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_NOTES.map((n) => (
        <button key={n} type="button" aria-pressed={has(n)} onClick={() => toggle(n)} className="chip rounded-full px-3 py-1.5 text-xs">
          {n}
        </button>
      ))}
    </div>
  );
}

function DishModal({ dish, onClose, onAdd }) {
  const panel = useRef(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  useDialog(!!dish, onClose, panel);

  useEffect(() => {
    setQty(1);
    setNote('');
  }, [dish]);

  return (
    <AnimatePresence>
      {dish && (
        <motion.div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dish-title"
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="gold-edge relative max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] bg-barro sm:rounded-[28px]"
          >
            <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/50 text-marfil backdrop-blur" aria-label="Cerrar detalle" data-autofocus>
              <X className="h-5 w-5" />
            </button>
            <div className="grid sm:grid-cols-2">
              <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[420px]">
                <DishArt dish={dish} sizes="modal" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-barro to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-barro/60" />
              </div>
              <div className="flex flex-col p-6 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: CAT_META[dish.cat].colors[0] }}>
                  {CAT_META[dish.cat].label}
                </p>
                <h3 id="dish-title" className="mt-3 font-display text-3xl font-semibold leading-tight text-marfil">
                  {dish.name}
                </h3>
                <p className="mt-3 leading-relaxed text-ceniza">{dish.desc}</p>
                {dish.badges.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {dish.badges.map((b) => (
                      <li key={b} className="rounded-full border border-oro/30 bg-oro/10 px-3 py-1 text-[11px] font-semibold text-[#f6e3a6]">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-6 font-display text-3xl tabular-nums text-maiz">{mxn(dish.price)}</p>
                <div className="mt-6 space-y-3">
                  <label htmlFor="dish-note" className="text-xs font-semibold uppercase tracking-[0.2em] text-ceniza">
                    Indicaciones
                  </label>
                  <NoteChips value={note} onChange={setNote} />
                  <input id="dish-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. salsa aparte" maxLength={120} className="field" />
                </div>
                <div className="mt-8 flex flex-col gap-3 xs:flex-row xs:items-center">
                  <QtyStepper value={qty} onChange={(v) => setQty(Math.max(1, Math.min(99, v)))} label="Cantidad" />
                  <button
                    type="button"
                    onClick={() => onAdd(dish, qty, note)}
                    className="btn-liquid inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 font-semibold"
                    data-cursor="add"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Agregar · {mxn(dish.price * qty)}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------
   16. UBICACIÓN, HORARIOS Y FACHADA
   --------------------------------------------------------------------- */
function Visit({ onReserve, onOrder }) {
  const rows = [
    { icon: MapPin, k: 'Dirección', v: <>{BIZ.street}<br />{BIZ.area}</> },
    { icon: Phone, k: 'Teléfono', v: <a href={`tel:${BIZ.phoneTel}`} className="underline decoration-oro/40 underline-offset-4 hover:text-oro">{BIZ.phoneDisplay}</a> },
    { icon: Clock, k: 'Horario', v: BIZ.hours },
    { icon: Users, k: 'Precio promedio', v: BIZ.priceRange },
  ];
  return (
    <section id="visitanos" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px divider-oro" aria-hidden="true" />
      <div className="mx-auto max-w-[1600px] 3xl:max-w-[2200px] px-4 sm:px-6 lg:px-10">
        <SectionTitle eyebrow="Visítanos" title="Bajo los arcos" accent="amarillos">
          Muros amarillos oaxaqueños, arcos de cantera, cactus y un salón con luz natural sobre Av. Las Américas.
        </SectionTitle>

        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="gold-edge neo relative overflow-hidden rounded-[28px] bg-[#100d0b] p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr]">
                <figure className="relative overflow-hidden rounded-[20px]">
                  <img src={PHOTOS.fachada} alt="Fachada del Restaurante Oaxakita: muros amarillos, arcos coloniales, cactus y letrero de la casa" loading="lazy" className="aspect-[4/3] h-full w-full object-cover" />
                  <figcaption className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-marfil backdrop-blur">
                    La fachada
                  </figcaption>
                </figure>
                <figure className="relative hidden overflow-hidden rounded-[20px] sm:block">
                  <img src={PHOTOS.salon} alt="Salón interior del Restaurante Oaxakita con mesas de madera, sillas tejidas y lámpara de mimbre" loading="lazy" className="h-full w-full object-cover" />
                  <figcaption className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-marfil backdrop-blur">
                    El salón
                  </figcaption>
                </figure>
              </div>
            </div>
          </Reveal>

          <Reveal i={1} className="lg:col-span-5">
            <div className="glass gold-edge flex h-full flex-col rounded-[28px] p-6 sm:p-8">
              <dl className="space-y-5">
                {rows.map(({ icon: I, k, v }) => (
                  <div key={k} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.03]">
                      <I className="h-[18px] w-[18px] text-oro" strokeWidth={1.6} />
                    </span>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">{k}</dt>
                      <dd className="mt-1 leading-relaxed text-marfil">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <ul className="mt-6 flex flex-wrap gap-2">
                {BIZ.tags.map((t) => (
                  <li key={t} className="rounded-full border border-agave bg-agave/30 px-3 py-1 text-[11px] text-[#b9dcc6]">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 grid gap-3 xs:grid-cols-2">
                <Magnetic as="a" href={BIZ.mapsUrl} target="_blank" rel="noopener" className="btn-liquid inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold" data-cursor="map">
                  <Navigation className="h-4 w-4" /> <span>Abrir en Google Maps</span>
                </Magnetic>
                <Magnetic onClick={onOrder} className="btn-ghost inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-marfil">
                  <ShoppingBag className="h-4 w-4 text-oro" /> Pedir en línea
                </Magnetic>
                <a href={`tel:${BIZ.phoneTel}`} className="btn-ghost inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-marfil">
                  <Phone className="h-4 w-4 text-oro" /> Llamar
                </a>
                <button type="button" onClick={onReserve} className="btn-ghost inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-marfil">
                  <CalendarDays className="h-4 w-4 text-oro" /> Reservar mesa
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal i={2} className="lg:col-span-12">
            <div className="gold-edge relative overflow-hidden rounded-[28px] bg-barro">
              <iframe
                title="Mapa: Restaurante Oaxakita en Av. Las Américas 1738, Valle Dorado, Aguascalientes"
                src={BIZ.mapsEmbed}
                className="map-dark block h-[320px] w-full border-0 sm:h-[420px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_80px_rgba(8,7,7,.9)]" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------
   17. DRAWER DE PEDIDO
   --------------------------------------------------------------------- */
function CartDrawer({ open, onClose, lines, dispatch, onBrowse }) {
  const panel = useRef(null);
  useDialog(open, onClose, panel);
  const { play } = useSound();
  const [mode, setMode] = useState('recoger');
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const detailed = lines.map((l) => ({ ...l, dish: MENU_BY_ID[l.id] })).filter((l) => l.dish);
  const total = detailed.reduce((s, l) => s + l.dish.price * l.qty, 0);
  const count = detailed.reduce((s, l) => s + l.qty, 0);

  const message = () => {
    const out = ['Hola Oaxakita, quiero hacer un pedido:', ''];
    detailed.forEach((l) => {
      out.push(`• ${l.qty} × ${l.dish.name} — ${mxn(l.dish.price * l.qty)}`);
      if (l.note) out.push(`   ↳ ${l.note}`);
    });
    out.push('', `Total estimado: ${mxn(total)} MXN`);
    out.push(`Modalidad: ${mode === 'recoger' ? 'Para recoger en sucursal' : 'Para comer en el restaurante'}`);
    out.push(`Nombre: ${name.trim()}`);
    out.push(`Hora: ${time || 'Lo antes posible'}`);
    if (notes.trim()) out.push(`Notas: ${notes.trim()}`);
    out.push('', '¿Me confirman disponibilidad y total? ¡Gracias!');
    return out.join('\n');
  };

  const send = () => {
    if (!name.trim()) {
      setError('Escribe tu nombre para el pedido.');
      return;
    }
    setError('');
    play('chime');
    window.open(waLink(message()), '_blank', 'noopener');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.aside
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-[rgba(212,175,55,.15)] bg-barro/95 backdrop-blur-2xl"
          >
            <Greca className="absolute inset-x-0 top-0 h-3 w-full" opacity={0.3} />
            <div className="flex items-center justify-between border-b border-white/5 px-5 pb-4 pt-6 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-oro">Cotizador</p>
                <h2 id="cart-title" className="mt-1 font-display text-2xl text-marfil">
                  Mi pedido
                </h2>
              </div>
              <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/10" aria-label="Cerrar pedido" data-autofocus>
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailed.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-full border border-oro/30 bg-oro/5">
                  <ShoppingBag className="h-8 w-8 text-oro" strokeWidth={1.3} />
                </div>
                <p className="mt-6 font-display text-2xl text-marfil">Tu cazuela está vacía</p>
                <p className="mt-2 text-sm text-ceniza">Agrega platillos del menú y te armamos el mensaje para WhatsApp.</p>
                <button type="button" onClick={onBrowse} className="btn-liquid mt-8 inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold">
                  <span>Explorar el menú</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                  <ul className="space-y-3">
                    <AnimatePresence initial={false}>
                      {detailed.map((l) => (
                        <motion.li
                          key={l.key}
                          layout
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 30, height: 0, marginTop: 0 }}
                          className="flex gap-3 overflow-hidden rounded-2xl border border-white/[.06] bg-white/[.02] p-3"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                            <DishArt dish={l.dish} sizes="thumb" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium leading-snug text-marfil">{l.dish.name}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  dispatch({ type: 'remove', key: l.key });
                                  play('clay');
                                }}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ceniza hover:text-teotitlan"
                                aria-label={`Quitar ${l.dish.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            {l.note && <p className="text-xs italic text-ceniza">↳ {l.note}</p>}
                            <div className="mt-2 flex items-center justify-between">
                              <QtyStepper small value={l.qty} onChange={(v) => dispatch({ type: 'qty', key: l.key, qty: v })} label={`Cantidad de ${l.dish.name}`} />
                              <span className="font-semibold tabular-nums text-maiz">{mxn(l.dish.price * l.qty)}</span>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>

                  <div className="mt-6 space-y-5">
                    <fieldset>
                      <legend className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Modalidad</legend>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          ['recoger', 'Para recoger'],
                          ['mesa', 'Comer aquí'],
                        ].map(([v, t]) => (
                          <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)} className="chip rounded-2xl px-3 py-3 text-sm font-medium">
                            {t}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <div className="grid gap-3 xs:grid-cols-2">
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Nombre *</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-2" placeholder="¿A nombre de quién?" autoComplete="name" aria-invalid={!!error} />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Hora</span>
                        <input type="time" value={time} min="08:00" onChange={(e) => setTime(e.target.value)} className="field mt-2" />
                      </label>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Notas especiales</span>
                      <div className="mt-2">
                        <NoteChips value={notes} onChange={setNotes} />
                      </div>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="field mt-2 resize-none" placeholder="Alergias, sin picante, extra quesillo…" aria-label="Notas especiales" />
                    </div>
                    {error && (
                      <p className="text-sm text-[#fca5a5]" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/5 bg-obsidiana/60 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ceniza">
                      {count} {count === 1 ? 'artículo' : 'artículos'} · Total estimado
                    </span>
                    <span className="font-display text-3xl tabular-nums text-marfil">{mxn(total)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-ceniza">Precios de carta en MXN. El restaurante confirma disponibilidad y total por WhatsApp.</p>
                  <button type="button" onClick={send} className="btn-liquid mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full font-semibold">
                    <MessageCircle className="h-5 w-5" /> <span>Enviar pedido por WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'clear' });
                      play('swoosh');
                    }}
                    className="mt-2 w-full py-2 text-xs text-ceniza underline-offset-4 hover:text-marfil hover:underline"
                  >
                    Vaciar pedido
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------
   18. MODAL DE RESERVA
   --------------------------------------------------------------------- */
function ReserveModal({ open, onClose, onSeeMap }) {
  const panel = useRef(null);
  useDialog(open, onClose, panel);
  const { play } = useSound();
  const [form, setForm] = useState({ name: '', people: 2, date: '', time: '14:00', notes: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Tu nombre, por favor.';
    if (!form.date) errs.date = 'Elige una fecha.';
    else if (form.date < todayISO()) errs.date = 'La fecha ya pasó.';
    if (!form.time) errs.time = 'Elige una hora.';
    else if (form.time < '08:00') errs.time = 'Abrimos a las 8:00 a.m.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const [y, m, d] = form.date.split('-').map(Number);
    const fecha = new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const text = [
      'Hola Oaxakita, quiero reservar una mesa:',
      '',
      `Nombre: ${form.name.trim()}`,
      `Personas: ${form.people}`,
      `Fecha: ${fecha}`,
      `Hora: ${form.time}`,
      form.notes.trim() ? `Notas: ${form.notes.trim()}` : null,
      '',
      '¿Me confirman disponibilidad? ¡Gracias!',
    ]
      .filter((l) => l !== null)
      .join('\n');
    play('chime');
    window.open(waLink(text), '_blank', 'noopener');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reserve-title"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="gold-edge relative max-h-[94svh] w-full max-w-4xl overflow-y-auto rounded-t-[28px] bg-barro sm:rounded-[28px]"
          >
            <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/50 backdrop-blur" aria-label="Cerrar reserva" data-autofocus>
              <X className="h-5 w-5" />
            </button>
            <div className="grid md:grid-cols-[1fr_1.2fr]">
              <div className="relative hidden overflow-hidden md:block">
                <img src={PHOTOS.fachada} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-barro via-barro/60 to-barro/10" />
                <div className="relative flex h-full flex-col justify-end p-8">
                  <p className="font-display text-2xl text-marfil">{BIZ.name}</p>
                  <p className="mt-2 text-sm text-ceniza">{BIZ.street}, {BIZ.area}</p>
                  <p className="mt-1 text-sm text-ceniza">{BIZ.hours}</p>
                  <button type="button" onClick={onSeeMap} className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-oro hover:text-maiz">
                    Ver ubicación <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <form onSubmit={submit} noValidate className="p-6 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-oro">Reservaciones</p>
                <h2 id="reserve-title" className="mt-2 font-display text-3xl text-marfil">
                  Aparta tu mesa
                </h2>
                <p className="mt-2 text-sm text-ceniza">Te enviamos la solicitud por WhatsApp y el restaurante confirma la disponibilidad.</p>
                <div className="mt-6 grid gap-4">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Nombre *</span>
                    <input value={form.name} onChange={set('name')} className="field mt-2" autoComplete="name" aria-invalid={!!errors.name} placeholder="Nombre completo" />
                    {errors.name && <span className="mt-1 block text-xs text-[#fca5a5]">{errors.name}</span>}
                  </label>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Personas</span>
                    <div className="mt-2 flex items-center gap-3">
                      <QtyStepper value={form.people} onChange={(v) => setForm((f) => ({ ...f, people: Math.max(1, Math.min(30, v)) }))} label="Número de personas" />
                      <Users className="h-4 w-4 text-oro" />
                      <span className="text-sm text-ceniza">{form.people === 1 ? 'persona' : 'personas'}</span>
                    </div>
                  </div>
                  <div className="grid gap-4 xs:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Fecha *</span>
                      <input type="date" value={form.date} min={todayISO()} onChange={set('date')} className="field mt-2" aria-invalid={!!errors.date} />
                      {errors.date && <span className="mt-1 block text-xs text-[#fca5a5]">{errors.date}</span>}
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Hora *</span>
                      <input type="time" value={form.time} min="08:00" onChange={set('time')} className="field mt-2" aria-invalid={!!errors.time} />
                      {errors.time && <span className="mt-1 block text-xs text-[#fca5a5]">{errors.time}</span>}
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ceniza">Ocasión o notas</span>
                    <textarea value={form.notes} onChange={set('notes')} rows={2} className="field mt-2 resize-none" placeholder="Cumpleaños, silla para bebé, terraza…" />
                  </label>
                </div>
                <button type="submit" className="btn-liquid mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full font-semibold">
                  <MessageCircle className="h-5 w-5" /> <span>Enviar reserva por WhatsApp</span>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={`tel:${BIZ.phoneTel}`} className="btn-ghost inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold">
                    <Phone className="h-4 w-4 text-oro" /> Llamar
                  </a>
                  <a href={BIZ.mapsUrl} target="_blank" rel="noopener" className="btn-ghost inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold">
                    <Navigation className="h-4 w-4 text-oro" /> Cómo llegar
                  </a>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------
   19. PIE DE PÁGINA Y BOTÓN FLOTANTE
   --------------------------------------------------------------------- */
function Footer() {
  return (
    <footer className="relative border-t border-[rgba(212,175,55,.12)] bg-obsidiana pb-28 pt-16 sm:pb-12">
      <Greca className="absolute inset-x-0 top-0 h-4 w-full" opacity={0.2} />
      <div className="mx-auto grid max-w-[1600px] 3xl:max-w-[2200px] gap-10 px-4 sm:px-6 md:grid-cols-3 lg:px-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ceniza">Cocina oaxaqueña, panadería artesanal y productos de la región en Aguascalientes.</p>
        </div>
        <div className="text-sm leading-relaxed text-ceniza">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-oro">Dónde</p>
          <p className="mt-3 text-marfil">{BIZ.street}</p>
          <p>{BIZ.area}</p>
          <p className="mt-2">{BIZ.hours}</p>
        </div>
        <div className="text-sm text-ceniza">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-oro">Contacto</p>
          <a href={`tel:${BIZ.phoneTel}`} className="mt-3 block text-marfil hover:text-oro">
            {BIZ.phoneDisplay}
          </a>
          <a href={BIZ.mapsUrl} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 hover:text-oro">
            Google Maps <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1600px] 3xl:max-w-[2200px] flex-col gap-2 border-t border-white/5 px-4 pt-6 text-xs text-ceniza sm:flex-row sm:justify-between sm:px-6 lg:px-10">
        <p>© {new Date().getFullYear()} {BIZ.name}</p>
        <p>
          Sitio diseñado y desarrollado por <strong className="text-marfil">LKM’r</strong>
        </p>
      </div>
    </footer>
  );
}

function FloatingCart({ count, total, onOpen }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          type="button"
          onClick={onOpen}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="btn-liquid fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-14 items-center justify-between rounded-full px-5 font-semibold sm:inset-x-auto sm:right-6 sm:min-w-[300px]"
          aria-label={`Ver mi pedido: ${count} artículos, ${mxn(total)}`}
        >
          <span className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/20 text-sm tabular-nums">{count}</span>
            <span>Ver mi pedido</span>
          </span>
          <span className="tabular-nums">{mxn(total)}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------
   20. APLICACIÓN
   --------------------------------------------------------------------- */
function Experience() {
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState('todos');
  const [dish, setDish] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [lines, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const { play } = useSound();
  const toastTimer = useRef(0);

  useEffect(() => storage.set('oaxakita-cart-v1', lines), [lines]);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + (MENU_BY_ID[l.id]?.price || 0) * l.qty, 0);

  const notify = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const add = useCallback(
    (d, qty = 1, note = '') => {
      dispatch({ type: 'add', id: d.id, qty, note });
      play('chime');
      notify(`${qty} × ${d.name} agregado a tu pedido`);
    },
    [play, notify],
  );

  const goMenu = useCallback(
    (f) => {
      if (typeof f === 'string') setFilter(f);
      play('swoosh');
      scrollToId('menu');
    },
    [play],
  );

  const closeDish = useCallback(() => setDish(null), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const closeReserve = useCallback(() => setReserveOpen(false), []);
  const openReserve = useCallback(() => {
    setReserveOpen(true);
    play('swoosh');
  }, [play]);
  const openCart = useCallback(() => {
    setToast(null);
    setCartOpen(true);
    play('swoosh');
  }, [play]);

  useScrollLock(!ready);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <AnimatePresence>{!ready && <Preloader key="pre" onDone={() => setReady(true)} />}</AnimatePresence>
      <div className="grain pointer-events-none fixed inset-0 z-[150] opacity-[0.035]" aria-hidden="true" />
      <Cursor />
      <a href="#menu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:rounded-full focus:bg-oro focus:px-4 focus:py-2 focus:text-obsidiana">
        Saltar al menú
      </a>
      <Header cartCount={count} onCart={openCart} onReserve={openReserve} />
      <main className="font-sans">
        <Hero ready={ready} onMenu={() => goMenu()} onReserve={openReserve} />
        <Marquee />
        <Pillars onFilter={goMenu} />
        <MenuSection filter={filter} setFilter={setFilter} onOpen={setDish} onQuickAdd={(d) => add(d)} />
        <Visit onReserve={openReserve} onOrder={count ? openCart : () => goMenu()} />
      </main>
      <Footer />
      <FloatingCart count={count} total={total} onOpen={openCart} />
      <DishModal
        dish={dish}
        onClose={closeDish}
        onAdd={(d, q, n) => {
          add(d, q, n);
          setDish(null);
        }}
      />
      <CartDrawer
        open={cartOpen}
        onClose={closeCart}
        lines={lines}
        dispatch={dispatch}
        onBrowse={() => {
          setCartOpen(false);
          goMenu();
        }}
      />
      <ReserveModal
        open={reserveOpen}
        onClose={closeReserve}
        onSeeMap={() => {
          setReserveOpen(false);
          setTimeout(() => scrollToId('visitanos'), 300);
        }}
      />
      <Toast toast={toast} />
    </>
  );
}

export default function Oaxakita() {
  return (
    <MotionConfig reducedMotion="user">
      <SoundProvider>
        <Experience />
      </SoundProvider>
    </MotionConfig>
  );
}
