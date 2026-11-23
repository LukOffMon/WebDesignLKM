// Carta de El Temorense · precios de salón de la carta oficial "Junio 2026".
// n = nombre, d = descripción, p = precio, v = variantes [[etiqueta, precio]],
// i = foto (img/), t = "nuevo" | "casa" (sombrero en la carta).
window.TEMO = {
  tel: "6146096023",
  wa: "526146096023",
  horario: { abre: 8, cierra: 20 }, // por confirmar con el negocio (dato de Rappi)
  facebook: "https://www.facebook.com/search/top?q=El%20Temorense%20Chihuahua",
  instagram: "https://www.instagram.com/eltemorense/",
  mapa: "https://www.google.com/maps/search/?api=1&query=El+Temorense+Chihuahua"
};

window.CARTA = [
  { id: "desayunos", nombre: "Desayunos", nota: "Todos los huevos van con chilaquiles en salsa de consomé, excepto los montados. Pídelos estrellados, revueltos u omelette.", items: [
    { n: "Huevos Temorenses", d: "2 huevos con tocino, jamón y pico de gallo en una costra de queso + guarnición.", p: 180, t: "casa" },
    { n: "Huevos con Chilorio", d: "2 huevos con nuestro chilorio de la sierra + guarnición.", p: 155, t: "nuevo" },
    { n: "Huevos con Birria", d: "2 huevos con birria, estrellados, revueltos o en omelette + guarnición.", p: 155, i: "huevos-birria" },
    { n: "Huevos con Machaca", d: "2 huevos con machaca de la sierra, guisada a la mexicana + guarnición.", p: 155, i: "machaca" },
    { n: "Huevos Rancheros", d: "2 huevos sobre tortilla de maíz y jamón bañados con salsa ranchera + guarnición.", p: 155, i: "rancheros" },
    { n: "Huevos al Gusto", d: "Con jamón, chorizo hecho en casa, a la mexicana o con espinacas + guarnición.", p: 125, i: "huevos-gusto" },
    { n: "Huevos Divorciados", d: "2 huevos estrellados bañados con salsa verde y roja + guarnición.", p: 125, i: "divorciados" },
    { n: "Huevos Montados", d: "Sobre pan con mantequilla, con jamón, espinacas, tocino y costra de queso. Bañados en salsa a elegir.", p: 115, i: "montados" },
    { n: "Chilaquiles con Birria", d: "Totopos salteados en la salsa que elijas, 80 g de birria, queso, crema y cilantro.", v: [["Con birria", 169], ["Sin birria", 109]], t: "casa", i: "chilaquiles" },
    { n: "Enfrijoladas", d: "3 piezas rellenas, queso gratinado, crema ácida, pico de gallo y cebolla morada curtida.", v: [["Huevo", 120], ["Pollo", 135], ["Queso", 145], ["Choriqueso", 155]], i: "enfrijoladas" },
    { n: "Mollete de Birria", d: "Pan tostado con mantequilla, frijoles puercos o refritos, birria, crema y pico de gallo.", p: 99, i: "mollete" },
    { n: "Mollete de Frijoles", d: "Dos panes con mantequilla, frijoles puercos o refritos, queso y pico de gallo.", p: 120 },
    { n: "Tamal de Elote", d: "", p: 35 },
    { n: "Hot Cakes Temorense", d: "3 piezas con fruta de temporada y cheesecake de tu elección, bañados con crema de cajeta.", p: 149, i: "hotcakes" },
    { n: "Clásicos Hot Cakes", d: "3 piezas con miel maple y mantequilla.", p: 90 }
  ]},
  { id: "birria", nombre: "Birria", nota: "Nuestra birria: chiles que le dan su color rojizo, sazonada para que no necesite nada más.", items: [
    { n: "Plato de Birria", d: "La de siempre, en su consomé, con tortillas, cebolla y cilantro.", p: 135, t: "casa", i: "birria" },
    { n: "Quesibirri Revolcada®", d: "Birria y queso en tortilla, revolcada en el consomé.", v: [["Maíz", 42], ["Harina", 45], ["Orden maíz", 168], ["Orden harina", 180], ["Orden mixta", 174]], t: "casa", i: "quesibirri" },
    { n: "Costribirri", d: "Jugosa birria sobre una costra de queso y tortilla doradilla. Pídela keto.", p: 95, t: "casa", i: "costribirri" },
    { n: "Rambirri", d: "Sopa ramen cocida en el consomé de la birria, con carne.", v: [["Con camarón", 189], ["Sin camarón", 125]], i: "rambirri" },
    { n: "Wera Revolcada", d: "Dos tortillas de harina bañadas y doradas en el consomé, queso gratinado y birria. La especial es de dos pisos.", v: [["Sencilla", 99], ["Especial", 185]], i: "wera" },
    { n: "Revolcadón", d: "Tortilla de maíz hecha a mano, queso y birria. Está mamalona.", p: 75, i: "revolcadon" },
    { n: "Montabirri", d: "Dorado o natural, con asientos, frijoles puercos o refritos. Además lleva queso y birria, claro que sí.", p: 194, i: "montabirri" },
    { n: "Mula", d: "Burrito chihuahuense con crema, birria, lechuga, tomate y un toreado.", p: 160 },
    { n: "Birriaquiles", d: "Totopos, birria, queso, crema, cilantro y cebolla. Tú los bañas con el consomé.", p: 125, i: "birriaquiles" },
    { n: "Pizzabirri", d: "Base de pizza con asientos, frijoles puercos o refritos, birria, queso, cilantro y cebolla curtida.", p: 145, i: "pizzabirri" },
    { n: "Taco Dorado", d: "", p: 30 },
    { n: "Consomé", d: "Un cuartito de caldo especial para remojar lo que quieras.", p: 39, i: "consome-cuarto" }
  ]},
  { id: "tacos", nombre: "Tacos y lonches", nota: "Tortillas hechas a mano.", items: [
    { n: "Tatemo", d: "Taco de nuestra famosa birria tatemada en la plancha, con un consomé.", p: 78, t: "nuevo" },
    { n: "Mar y Sierra", d: "Camarón y bistec marinado en costra de queso con embarrada de asientos, en tortilla de harina.", p: 105, t: "nuevo", i: "mar-y-sierra" },
    { n: "Lencha", d: "Arrachera marinada sobre tortilla hecha a mano, tostada con asientos y queso gratinado.", p: 124, t: "nuevo" },
    { n: "Lonjudo", d: "Sabor serrano: birria con chicharrón de lonja. Una delicia.", p: 92, t: "nuevo", i: "lonjudo" },
    { n: "Chilorio", d: "Taco de chilorio “Sabor de la Sierra”.", p: 68, t: "nuevo", i: "chilorio" },
    { n: "Vaquero", d: "Bistec encebollado con queso. Pídelo en harina o maíz.", p: 67, t: "nuevo" },
    { n: "Taco de Chicharrón de Lonja", d: "Muy temorense: chicharrón de puerco con pico de gallo.", p: 39, i: "chicharron" },
    { n: "Taco de Birria", d: "En tortilla de maíz o de harina.", v: [["Maíz", 30], ["Harina", 35]], i: "taco-birria" },
    { n: "Orden de Tacos", d: "Tacos de birria con cebolla, cilantro y limón.", v: [["Maíz", 120], ["Harina", 140]], i: "taco-harina" },
    { n: "Lonche de Birria", d: "Pan con mantequilla y birria.", v: [["Sencillo", 145], ["Con costra de queso", 155]], i: "lonche" }
  ]},
  { id: "gorditas", nombre: "Gorditas", nota: "De maíz, recién hechas a mano.", items: [
    { n: "Gordita Toño", d: "Asientos, queso y birria.", p: 75, i: "gordita-tono" },
    { n: "Gordita con Asientos", d: "Rellena de asientos de cerdo.", p: 35, i: "gordita-asientos" },
    { n: "Asientos + Queso", d: "", p: 40 },
    { n: "Frijoles + Asientos + Queso", d: "", p: 65, i: "gordita-fac" },
    { n: "Gordita de Frijoles con Queso", d: "", p: 36, i: "gordita-frijol" },
    { n: "Quesadilla de Harina", d: "", p: 63 }
  ]},
  { id: "caldos", nombre: "Menudo y pozole", nota: "Con pan tostado con mantequilla.", items: [
    { n: "Menudo", d: "Nuestro tradicional menudo temorense. Elige blanco o rojo.", v: [["Plato", 105], ["Especial", 170], ["Litro", 210]], i: "menudo-especial" },
    { n: "Pozole", d: "Rojo, puede llevar pata de puerco. Con lechuga, rábanos y totopos. Pica poco.", v: [["Plato", 115], ["Litro", 230]], i: "pozole" }
  ]},
  { id: "fuertes", nombre: "Flautas y enchiladas", nota: "", items: [
    { n: "Flautas", d: "4 piezas con lechuga, crema y pico de gallo. Elige la salsa y si las quieres ya bañadas.", v: [["Pollo", 135], ["Birria", 155]], i: "flautas" },
    { n: "Enchiladas", d: "3 piezas bañadas en la salsa que elijas, queso, crema y pico de gallo. Como en el rancho o más citadinas.", v: [["Pollo", 145], ["Choriqueso", 155], ["Birria", 175]], i: "enchiladas-birria" }
  ]},
  { id: "entradas", nombre: "Entradas", nota: "", items: [
    { n: "Camarones Fiesta", d: "5 camarones con queso crema envueltos en tocino, con papas y ensalada.", p: 206, t: "nuevo" },
    { n: "Queso Fundido", d: "Asientos de puerco, chorizo de la casa y birria sobre una cama de queso fundido.", p: 190, i: "fundido" },
    { n: "Elote Embirriado", d: "Un elote entero envuelto en costra de queso con birria.", p: 180, i: "elote-embirriado" },
    { n: "Nachas", d: "Totopos con queso amarillo, queso blanco, birria, crema y pico de gallo.", p: 160, i: "nachas" },
    { n: "Ignacios", d: "Totopos con queso amarillo, queso blanco, crema y pico de gallo.", p: 130, i: "ignacios" },
    { n: "Elotirri", d: "Elote graneado, queso amarillo, queso blanco, crema y chile en polvo.", v: [["Con birria", 105], ["Sin birria", 59]], i: "elotirri" },
    { n: "Costillas de Elote", d: "Trozos de elote frito con mantequilla picosa o natural, queso blanco, crema y cilantro.", p: 99, i: "costillas" },
    { n: "Cuerazo", d: "Cuero de chilindrina con birria, lechuga, queso blanco, crema y pico de gallo.", p: 95 },
    { n: "Papas con Birria y Queso", d: "Papas francesas.", p: 125 },
    { n: "Papas con Sazonador", d: "Papas francesas.", p: 55 },
    { n: "Queso Frito", d: "130 g de queso panela bañado y dorado con el consomé de birria.", p: 60 },
    { n: "Guacamole 150 g", d: "Fresco, con un toque de chiltepín para acompañar cualquier taco.", p: 59, t: "nuevo" },
    { n: "Gallina Pinta", d: "Frijol graneado en su caldo con maíz pozolero y costilla de res.", p: 49, i: "gallina-pinta" },
    { n: "Frijoles Puercos o Refritos", d: "Tropiezos de tocino, chorizo hecho en casa y más.", p: 45 },
    { n: "Frijoles Charros", d: "Como en la sierra: con chorizo, chicharrón de pella y todos los poderes.", p: 39, t: "nuevo" }
  ]},
  { id: "boxes", nombre: "Family Box y para llevar", nota: "Para la reunión, la oficina o el domingo en casa.", items: [
    { n: "Family Taco", d: "20 tacos, 1 litro de consomé, salsas, limones, cebolla y cilantro.", p: 650, i: "family-taco" },
    { n: "Mix-Box", d: "8 tacos, 8 revolcadas, 4 quesis, 1 litro de consomé, salsas, limones, cebolla y cilantro.", p: 765, i: "mix-box" },
    { n: "Revol-Box", d: "20 revolcadas, 1 litro de consomé, salsas, limones, cebolla y cilantro.", p: 890, i: "revol-box" },
    { n: "Individual-Box", d: "4 revolcadas, ¼ de consomé, salsas, limones, cebolla y cilantro.", p: 220, i: "orden-revolcadas" },
    { n: "Birria Pa' Taquear", d: "Litro con verduras, salsas y 1 kg de tortilla taquera. ½ litro con 1 kg de tortilla. ¼ con ½ kg.", v: [["1 litro", 700], ["½ litro", 350], ["¼ litro", 175]], i: "family" },
    { n: "Frijoles Puercos para llevar", d: "", v: [["Medio", 85], ["Litro", 169]] },
    { n: "Frijoles Refritos para llevar", d: "", v: [["Medio", 45], ["Litro", 90]] },
    { n: "Gallina Pinta para llevar", d: "", v: [["Medio", 44], ["Litro", 88]] }
  ]},
  { id: "bukitos", nombre: "Pa' los bukitos", nota: "", items: [
    { n: "Buki Box", d: "Nuggets, papas, vitrolero, juguito, papas o galleta y juguete sorpresa.", p: 180, i: "buki-box" },
    { n: "Plato de Birria Kids", d: "", p: 130 },
    { n: "Pozole Kids", d: "", p: 95 },
    { n: "Hotcakes con Huevo", d: "", p: 85 },
    { n: "Menudo Blanco Kids", d: "", p: 80 },
    { n: "Rambirri Kids", d: "", p: 75 },
    { n: "Chokito", d: "", p: 49 },
    { n: "Agua Fresca Kids", d: "", v: [["Vaso", 29], ["En termito", 64]] }
  ]},
  { id: "postres", nombre: "Postres", nota: "", items: [
    { n: "Pan de Elote con Nieve", d: "Con crema de cajeta.", p: 91, i: "postres" },
    { n: "Brownie con Nieve", d: "Con crema de cajeta.", p: 91, i: "postres" },
    { n: "Buñuelo Relleno", d: "", p: 80, i: "postres" },
    { n: "Pan de Elote con Cajeta", d: "", p: 75 },
    { n: "Brownie", d: "", p: 51 },
    { n: "Semita", d: "", p: 35 }
  ]},
  { id: "bebidas", nombre: "Bebidas", nota: "", items: [
    { n: "Bebida de los Dioses Temorenses", d: "La favorita de la casa: clamato, chiltepín, aritepi y un toque especial temorense.", v: [["Medio", 49], ["Litro", 79]], t: "casa", i: "clamato" },
    { n: "Clamato Temorense", d: "Con la frescura del clamato y el alma de nuestra cocina: el consomé de birria. Litro con cantarito.", p: 79, t: "nuevo", i: "cucuy" },
    { n: "Clamato Preparado", d: "", v: [["Medio", 40], ["Litro", 79]] },
    { n: "Agua Fresca Natural", d: "Cebada, jamaica, tamarindo o limón.", v: [["Medio", 29], ["Litro", 50]] },
    { n: "Limonada Mineral", d: "", v: [["Medio", 35], ["Litro", 51]] },
    { n: "Naranjada", d: "", v: [["Medio", 45], ["Litro", 89]] },
    { n: "Jugo de Naranja 475 ml", d: "", p: 75 },
    { n: "Jugo Verde con Miel 475 ml", d: "", p: 75 },
    { n: "Agua Mineral Preparada", d: "", p: 45 },
    { n: "Agua Mineral", d: "", p: 35 },
    { n: "Agua Natural", d: "", p: 20 },
    { n: "Refresco", d: "", v: [["Vidrio", 39], ["Lata", 45]] },
    { n: "Café de Olla o Americano", d: "Con refill.", p: 55, i: "cafe" },
    { n: "Capuchino", d: "", v: [["Caliente", 85], ["Frappé", 85]] },
    { n: "Chocolate Calientito", d: "", p: 49 },
    { n: "Vaso de Leche 473 ml", d: "", p: 49 }
  ]},
  { id: "cervezas", nombre: "Cervezas y más", nota: "Solo para mayores de edad.", items: [
    { n: "Cerveza Nacional", d: "Carta Blanca, TKT Light, XX Lager o Indio.", p: 40 },
    { n: "Cerveza Premium", d: "Amstel Ultra, Heineken, Miller High Life o XX Ultra.", p: 50 },
    { n: "Cucuy", d: "Tu cerveza o caguamón escarchado al estilo Temorense.", v: [["Media +", 20], ["Caguamón +", 35]], t: "nuevo", i: "cucuy" },
    { n: "Caguama", d: "Indio, Carta Blanca, XX Lager, TKT Light o Miller High Life.", p: 95 },
    { n: "Cubeta de Medias", d: "6 medias.", v: [["Nacional", 200], ["Premium", 250]] },
    { n: "Cubeta de Caguamones", d: "3 caguamones.", p: 240 },
    { n: "Mimosa", d: "", p: 99 },
    { n: "Botella de Vino Tinto", d: "", p: 250 }
  ]},
  { id: "extras", nombre: "Extras", nota: "Guarniciones: frijoles puercos, frijoles refritos y gallina pinta.", items: [
    { n: "Birria 40 g", d: "", p: 40 },
    { n: "Chilorio 40 g", d: "", p: 40 },
    { n: "Pollo 120 g", d: "", p: 35 },
    { n: "Tocino 3 tiras", d: "", p: 45 },
    { n: "Carne Seca 25 g", d: "", p: 45 },
    { n: "Huevo 2 pz", d: "", p: 20 },
    { n: "Pan con Mantequilla", d: "", p: 25 },
    { n: "Tortillas Hechas a Mano", d: "", p: 15 },
    { n: "Ramiki de Salsa", d: "", p: 35 },
    { n: "Ramiki de Frijol", d: "", p: 25 },
    { n: "Ramiki de Crema", d: "", p: 15 }
  ]}
];

window.SALSAS = [
  { nivel: 3, nombre: "Pica machín", lista: ["Roja chiltepín", "Machos"] },
  { nivel: 2, nombre: "Pica poco", lista: ["Tomatillo", "Roja", "Chipotle", "Rajados", "Verde suiza"] },
  { nivel: 0, nombre: "No pica", lista: ["Crema de frijol", "Ranchera", "Salsa de consomé"] }
];
