/* Cantina Real · datos compartidos por el sitio, los posters y los videos.
   Precios = carta oficial 2025 (PDF "CANTINA REAL" + carta de bebidas).
   Las promociones son la propuesta de LKM'r: se activan/editan aquí. */
window.CR = (() => {
  const CONTACT = {
    name: "Cantina Real",
    tagline: "Mexican Quality · Est. 2021",
    phone: "524494159466",
    phoneLabel: "449 415 94 66",
    instagram: "cantinareal_mk",
    address: "Emiliano Zapata 822, El Calvario",
    city: "Jesús María, Aguascalientes",
    cp: "20923",
    maps: "https://www.google.com/maps/search/?api=1&query=Cantina+Real+Emiliano+Zapata+822+El+Calvario+Jes%C3%BAs+Mar%C3%ADa+Aguascalientes",
    hours: "Todos los días · 9:00 a.m. a 2:00 a.m.",
    open: 9, close: 26, // 26 = 2:00 a.m. del día siguiente
    legal: "Evita el exceso. Promociones solo para mayores de 18 años. *Aplican restricciones.",
  };

  // Cada sección: tipo "single" (precio único) o "dual" (copa / botella)
  const MENU = [
    { id: "casa", name: "De la Casa", kind: "single", note: "Las firmas de Cantina Real. Solo aquí.", star: true, items: [
      ["El Real", 70, "La firma de la casa"], ["La Mamada", 60], ["Fachero", 60], ["Fabuloso", 70], ["Beto Báez", 100],
      ["Cubanote", 220, "Para compartir"], ["Papá Mojito", 220, "Para compartir"], ["Mamá Tamarindo", 220, "Para compartir"], ["Ronchata", 220, "Para compartir"],
    ]},
    { id: "cerveza", name: "Cerveza", kind: "single", note: "Bien fría, siempre.", items: [
      ["Corona", 45], ["Victoria", 45], ["Pacífico", 45], ["Tecate Roja", 45], ["Tecate Azul", 45], ["Tecate Ámbar", 45],
      ["XX Lager", 45], ["XX Ámbar", 45], ["Carta Blanca", 45], ["Ultra Amstel", 45],
      ["Modelo Cristal", 50], ["Negra Modelo", 50], ["Heineken", 50], ["Heineken 0.0", 50, "Sin alcohol"], ["Heineken 0.0 de lata", 50, "Sin alcohol"],
      ["Bohemia Clara", 50], ["Bohemia Obscura", 50], ["Bote Modelo Especial", 50], ["Bote Bohemia", 50],
      ["Canasta 8 piezas · Corona o Victoria", 320, "Sale en $40 c/u", true], ["Canasta 8 piezas · Tecate Roja o Ámbar", 290, "Sale en $36 c/u", true],
    ]},
    { id: "micheladas", name: "Micheladas & Cerveceros", kind: "single", note: "El remedio oficial de la mañana.", items: [
      ["Michelada preparada", 70, "La consentida de la cruda", true], ["Gringa preparada", 65], ["Rusa preparada", 40], ["Rusa", 40], ["Clamato", 40],
    ]},
    { id: "cocteles", name: "Cócteles & Preparados", kind: "single", note: "Preparados al momento en barra.", items: [
      ["Carajillo MR", 150, "Para cerrar la noche", true], ["Sangría preparada", 150], ["Piña colada preparada", 100], ["Perla Negra", 100],
      ["Cantarito preparado", 100], ["Agua de fruta Real", 100], ["Baileys preparado", 100], ["Tamarindo preparado", 100], ["Campari preparado", 100],
      ["Piedra preparada", 100], ["Bull preparado", 100], ["Preparado Madero Blanco", 100], ["Fresca · Lunazul", 100],
      ["Cubano", 90], ["Tamarindo", 80], ["Mojito", 70], ["Sangría", 60],
    ]},
    { id: "tequila", name: "Tequila", kind: "dual", note: "Más de 25 etiquetas. Copa o botella.", items: [
      ["Tradicional Reposado", 100, 1100], ["Tradicional Plata", 100, 1100], ["Tradicional Cristalino", 100, 1200],
      ["Campo Azul Blanco", 100, 1100], ["Campo Azul Reposado", 100, 1100], ["Centenario Reposado", 100, 1100], ["Centenario Plata", 100, 1100],
      ["Centenario Cristalino", 120, 1250], ["Centenario Azul", 100, null], ["Hacienda de Tepa", 120, 1100], ["Hornitos Reposado", 100, 1100],
      ["Herradura Reposado", 100, 1200], ["Herradura Plata", 100, 1199], ["Herradura Ultra", 150, 1650], ["Blanco Madero", 100, 800],
      ["7 Leguas Reposado", 140, 1500], ["7 Leguas Plata", 140, 1500], ["Maestro Reposado", 120, 1290], ["Maestro Plata", 120, 1290],
      ["Maestro Dobel", 170, 1750], ["Don Julio Blanco", 120, 1300], ["Don Julio Reposado", 120, 1300], ["Don Julio 70", 170, 1900],
      ["1800 Añejo", 120, 1400], ["1800 Cristalino", 150, 1750], ["30-30", 140, 1900],
    ]},
    { id: "mezcal", name: "Mezcal", kind: "dual", note: "Para ir despacito.", items: [
      ["Mezcal de la Casa", 50, 400], ["Alacán Blanco", 95, 1100], ["Amores", 95, 1100], ["400 Conejos", 110, 1290],
    ]},
    { id: "whisky", name: "Whisky", kind: "dual", items: [
      ["Etiqueta Roja", 100, 1150], ["Jack Daniel's", 100, 1150], ["Chivas 12", 110, 1300], ["Buchanan's 12", 160, 1900], ["Etiqueta Negra", 160, 1900], ["Buchanan's 18", 220, 2800],
    ]},
    { id: "brandy", name: "Brandy", kind: "dual", items: [
      ["Presidente", 70, 800], ["Fundador", 80, 800], ["Don Pedro", 80, 800], ["Torres 5", 90, 800], ["Torres 10", 95, 950], ["Azteca de Oro", 95, 950],
    ]},
    { id: "ron", name: "Ron", kind: "dual", items: [
      ["Flor de Caña", 70, 850], ["Captain Morgan", 75, 800], ["Matusalem Clásico", 75, 800], ["Bacardí Blanco", 80, 800], ["Matusalem Platino", 80, null], ["Malibu", 80, 900], ["Kraken", 90, 800],
    ]},
    { id: "vodka", name: "Vodka", kind: "dual", items: [
      ["Smirnoff", 80, 850], ["Smirnoff Tamarindo", 80, 950], ["Absolut Azul", 90, 950], ["Absolut Mandarín", 90, 950], ["Absolut Mango", 90, 950],
    ]},
    { id: "ginebra", name: "Ginebra", kind: "dual", items: [["Oso Negro", 65, 750], ["Bombay", 95, 1000]] },
    { id: "cognac", name: "Cognac", kind: "dual", items: [["Martell VS", 150, 1650], ["Martell VSOP", 195, 2000], ["Hennessy VSOP", 210, 2000], ["Rémy Martin", 210, 2500]] },
    { id: "champagne", name: "Champagne", kind: "single", note: "Precio por botella.", items: [["Blue Nun Gold 24K", 720], ["Moët", 2400]] },
    { id: "licores", name: "Licores & Digestivos", kind: "single", items: [
      ["Baileys", 100], ["Digestivo", 100], ["Licor 43", 80], ["Rompope", 50], ["Anís", 40], ["Sangrita (caballito)", 40],
    ]},
    { id: "sin", name: "Sin alcohol", kind: "single", note: "Para el conductor designado (y el que se cuida).", items: [
      ["Piña colada sin licor", 60], ["Flamingo sin alcohol preparado", 60], ["Sueros electrolíticos", 50], ["Boost", 50], ["Limonada", 45],
      ["Refresco", 40], ["Naranjada", 40], ["Volt", 35], ["Agua mineral", 100],
    ]},
    { id: "cocina", name: "Cocina Real", kind: "single", note: "Para acompañar la ronda.", star: true, items: [
      ["Desayuno Real", 90, "Huevos al gusto", true], ["Tacos Real", 60, "Filete 100 % · orden de 3 piezas", true], ["Boneless Real", 90, "Orden"],
      ["Papas Real", 60, "Orden"], ["Arrachera", 190, "Orden", true], ["Guacamole extra", 25],
    ]},
  ];

  // Promo de cada día: 0 = domingo … 6 = sábado (getDay)
  const TAG = "📍 Emiliano Zapata 822, El Calvario, Jesús María, Ags.\n🕘 Todos los días de 9 AM a 2 AM\n📲 Reservas por WhatsApp: 449 415 94 66\n\nEvita el exceso · +18";
  const HASH = "#CantinaReal #JesúsMaría #Aguascalientes #AgsMx #CantinaAgs #PlanAgs";
  const PROMOS = [
    { day: 1, short: "LUN", dayName: "Lunes", title: "Lunes sin Cruda", hook: "La semana empieza mejor aquí",
      deal: "Desayuno Real + Michelada preparada", price: 139, was: 160, when: "9:00 a 14:00 h", icon: "michelada",
      why: "Saca ventas a la franja más floja (lunes en la mañana) y engancha al cliente del fin de semana.",
      caption: "Lunes sin cruda 🌶️🍺\nDesayuno Real (huevos al gusto) + Michelada preparada por $139.\nDe 9 a 14 h. Tú nada más llega, de lo demás nos encargamos." },
    { day: 2, short: "MAR", dayName: "Martes", title: "Martes de Tacos Real", hook: "Tacos de filete con tu chela",
      deal: "Tacos Real (3 pzas) + cerveza nacional", price: 89, was: 105, when: "Todo el día", icon: "taco",
      why: "Combo de ticket bajo que convierte la visita rápida (comida o salida del trabajo) en hábito semanal.",
      caption: "Martes de Tacos Real 🌮🍻\nOrden de 3 tacos de filete 100 % + cerveza nacional por $89.\nTodo el día. ¿A quién vas a invitar?" },
    { day: 3, short: "MIÉ", dayName: "Miércoles", title: "Miércoles de Comadres", hook: "2×1 en coctelería de la casa",
      deal: "2×1 en El Real, La Mamada, Fachero, Fabuloso y Sangría", price: null, was: null, badge: "2×1", when: "19:00 a 23:00 h", icon: "coctel",
      why: "Atrae grupos de amigas a mitad de semana; los cócteles de la casa tienen el mejor margen de la carta.",
      caption: "Miércoles de Comadres 🍹✨\n2×1 en los cócteles de la casa: El Real, La Mamada, Fachero, Fabuloso y Sangría.\nDe 7 a 11 pm. Etiqueta a tus comadres 👇" },
    { day: 4, short: "JUE", dayName: "Jueves", title: "Jueves de Botella", hook: "Arranca el fin antes que nadie",
      deal: "En botella de tequila o whisky: 4 refrescos + Papas Real de cortesía", price: null, was: null, badge: "+ cortesía", when: "Todo el día", icon: "botella",
      why: "Sube el ticket promedio sin bajar el precio de la botella; la cortesía cuesta poco y se percibe alta.",
      caption: "Jueves de Botella 🥃\nPide tu botella de tequila o whisky y te regalamos 4 refrescos + Papas Real.\nMás de 25 tequilas en la vitrina. El fin de semana empieza hoy." },
    { day: 5, short: "VIE", dayName: "Viernes", title: "Viernes de Canasta", hook: "8 bien frías + botana",
      deal: "Canasta 8 Corona o Victoria + Boneless Real", price: 369, was: 410, when: "Todo el día", icon: "canasta",
      why: "El viernes ya se llena: la promo no regala, empaqueta. Mesa que pide canasta se queda más tiempo.",
      caption: "Viernes de Canasta 🍻🔥\n8 Coronas o Victorias bien frías + Boneless Real por $369.\nArma la mesa, nosotros ponemos el ambiente." },
    { day: 6, short: "SÁB", dayName: "Sábado", title: "Sábado de Mesa Real", hook: "Reserva y brindamos contigo",
      deal: "Reserva mesa de 6+ por WhatsApp: ronda de bienvenida de Mezcal de la Casa", price: null, was: null, badge: "Ronda gratis", when: "Con reservación", icon: "mezcal",
      why: "Convierte el día más lleno en reservaciones medibles (cada WhatsApp es un cliente contado).",
      caption: "Sábado de Mesa Real 🥂\nReserva para 6 o más por WhatsApp y la primera ronda de Mezcal de la Casa va por nuestra cuenta.\nCupo limitado: aparta tu mesa ya." },
    { day: 0, short: "DOM", dayName: "Domingo", title: "Domingo de Arrachera", hook: "El domingo se come rico",
      deal: "Arrachera + Michelada preparada", price: 229, was: 260, when: "12:00 a 20:00 h", icon: "arrachera",
      why: "Lleva a la cantina el plan familiar/de compadres del domingo y aprovecha la cocina en horario de comida.",
      caption: "Domingo de Arrachera 🥩🍺\nOrden de arrachera + Michelada preparada por $229.\nDe 12 a 8 pm. Trae a los compadres." },
  ];

  const EXTRAS = [
    { id: "hora-real", title: "Hora Real", hook: "Lunes a jueves · 17:00 a 20:00 h", deal: "Cerveza nacional", price: 35, was: 45, icon: "cerveza",
      caption: "Hora Real 🕔🍺\nDe lunes a jueves, de 5 a 8 pm, tu cerveza nacional a $35.\nSal del trabajo y cae a Cantina Real." },
    { id: "cumple", title: "Cumpleañero Real", hook: "Festeja aquí", deal: "Reserva para 8+ y la Canasta de Tecate va de regalo", price: null, badge: "Regalo", icon: "pastel",
      caption: "¿Cumpleaños? 🎂🍻\nReserva tu mesa para 8 o más y te regalamos una Canasta de Tecate (8 piezas).\nEscríbenos por WhatsApp para apartar." },
    { id: "comparte", title: "Comparte y gana", hook: "Sube este póster y etiquétanos", deal: "Muéstralo en barra: Sangrita o Mezcal de la Casa de cortesía", price: null, badge: "Cortesía", icon: "caballito",
      caption: "Comparte y gana 📸\nSube este póster a tu historia, etiqueta a @cantinareal_mk y enséñalo en barra: tu Sangrita o Mezcal de la Casa va por nuestra cuenta." },
  ];

  // Posters (post 4:5 y story 9:16). type: promo | extra | brand
  const POSTERS = [
    ...PROMOS.map(p => ({ id: "promo-" + p.short.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), type: "promo", ref: p.day,
      title: `${p.dayName}: ${p.title}`, caption: `${p.caption}\n\n${TAG}\n\n${HASH} #${p.title.replace(/\s+/g, "")}` })),
    ...EXTRAS.map(e => ({ id: e.id, type: "extra", ref: e.id, title: e.title, caption: `${e.caption}\n\n${TAG}\n\n${HASH}` })),
    { id: "horario", type: "brand", layout: "horario", title: "Abrimos de 9 AM a 2 AM",
      caption: `Desayuno, comida, after y noche: abrimos de 9 AM a 2 AM, los 7 días ☀️🌙\nLa cantina de Jesús María que no te deja con las ganas.\n\n${TAG}\n\n${HASH}` },
    { id: "tequilas", type: "brand", layout: "tequilas", photo: "assets/tequilas.jpg", title: "Más de 25 tequilas",
      caption: `Más de 25 tequilas en la vitrina 🥃\nDe Tradicional a Don Julio 70, por copa o por botella.\n¿Cuál es el tuyo? Te leemos 👇\n\n${TAG}\n\n${HASH} #Tequila` },
    { id: "cocina", type: "brand", layout: "cocina", title: "Cocina Real",
      caption: `Cocina Real 🍳🌮🥩\nDesayuno Real $90 · Tacos Real (filete) $60 · Boneless $90 · Arrachera $190 · Papas $60.\nPorque la ronda sabe mejor con botana.\n\n${TAG}\n\n${HASH}` },
    { id: "de-la-casa", type: "brand", layout: "casa", title: "Cócteles de la casa",
      caption: `De la casa, solo aquí 🍹\nEl Real · La Mamada · Fachero · Fabuloso · Beto Báez.\nY para compartir: Cubanote, Papá Mojito, Mamá Tamarindo y Ronchata.\n\n${TAG}\n\n${HASH}` },
    { id: "michelada", type: "brand", layout: "michelada", photo: "assets/gringa.jpg", title: "La michelada de la casa",
      caption: `Esa michelada que te salva el día 🌶️🍺\nMichelada preparada $70 · Gringa preparada $65.\nAbrimos desde las 9 AM.\n\n${TAG}\n\n${HASH} #Michelada` },
    { id: "barra", type: "brand", layout: "barra", photo: "assets/barra.jpg", title: "Tu lugar en la barra",
      caption: `Tu lugar en la barra ya te está esperando 🍻\nBuena música, buen trago y gente como tú.\n\n${TAG}\n\n${HASH}` },
    { id: "partido", type: "brand", layout: "partido", photo: "assets/contrabarra.jpg", title: "Ven a ver el partido",
      caption: `¿Dónde ves el partido? Aquí ⚽🏈📺\nPantallas, canasta bien fría y la mejor porra de Jesús María.\n\n${TAG}\n\n${HASH} #Futbol` },
    { id: "posadas", type: "brand", layout: "posadas", title: "Posadas y fin de año",
      caption: `Posadas y reuniones de fin de año en Cantina Real 🎄🥂\nGrupos de 10 a 40 personas: mesa, botellas, canastas y botana.\nCotiza por WhatsApp y aparta tu fecha (diciembre se llena).\n\n${TAG}\n\n${HASH} #Posadas2026` },
    { id: "reserva", type: "brand", layout: "reserva", title: "Reserva tu mesa",
      caption: `Reserva tu mesa en 10 segundos 📲\nMándanos WhatsApp al 449 415 94 66 con día, hora y número de personas.\n\n${TAG}\n\n${HASH}` },
    { id: "ubicacion", type: "brand", layout: "ubicacion", title: "Aquí estamos",
      caption: `Aquí estamos 📍\nEmiliano Zapata 822, El Calvario, Jesús María.\nGuárdalo para el próximo plan.\n\n${TAG}\n\n${HASH}` },
  ];

  const VIDEOS = [
    { id: "reel-semana", title: "La Semana Real", secs: 15, caption: `Una promo para cada día de la semana 📅🍻\n¿Cuál es tu día?\n\n${TAG}\n\n${HASH} #Promos` },
    { id: "reel-cantina", title: "Esto es Cantina Real", secs: 15, caption: `Esto es Cantina Real ✨\nMás de 25 tequilas, micheladas, cocina y la barra más chida de Jesús María.\n\n${TAG}\n\n${HASH}` },
    { id: "reel-plan", title: "¿Plan para hoy?", secs: 15, caption: `¿Plan para hoy? Ya lo tienes 😎\nCanasta desde $290, tacos de filete $60 y michelada $70.\n\n${TAG}\n\n${HASH}` },
  ];
  const GIFS = [
    { id: "gif-logo", title: "Logo Real", secs: 5 },
    { id: "gif-salud", title: "¡Salud!", secs: 5 },
    { id: "gif-promo", title: "Promo de hoy", secs: 5 },
  ];

  return { CONTACT, MENU, PROMOS, EXTRAS, POSTERS, VIDEOS, GIFS, TAG, HASH };
})();
