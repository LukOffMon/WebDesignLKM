/* Arte propio de Cantina Real (SVG de línea dorada). Lo usan el sitio y el estudio. */
window.CRART = (() => {
  const S = (inner, vb = "0 0 200 200") =>
    `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICONS = {
    michelada: S(`<path d="M52 46h96l-12 128q-36 10-72 0z"/><path d="M52 46l6 14 6-14 6 14 6-14 6 14 6-14 6 14 6-14 6 14 6-14 6 14 6-14 6 14 6-14 6 14"/><path d="M60 92h80"/><circle cx="150" cy="44" r="22"/><path d="M150 22v44M128 44h44M135 29l30 30M135 59l30-30" stroke-width="3"/><path d="M112 46l18-34" /><circle cx="84" cy="122" r="5"/><circle cx="108" cy="140" r="4"/><circle cx="96" cy="108" r="3"/>`),
    taco: S(`<path d="M24 136a76 76 0 0 1 152 0z"/><path d="M38 104q10-14 20-4t20-6 20 4 22-6 20 6 18 4"/><path d="M60 92q6-16 16-6M98 84q8-14 18-2M134 92q6-12 14-2" stroke-width="5"/><path d="M24 136h152"/><circle cx="72" cy="120" r="4"/><circle cx="104" cy="114" r="4"/><circle cx="136" cy="122" r="4"/>`),
    coctel: S(`<path d="M36 48h128l-64 72z"/><path d="M100 120v52M66 174h68"/><path d="M58 64h84" stroke-width="4"/><circle cx="148" cy="44" r="18"/><path d="M148 26v36" stroke-width="3"/><path d="M88 40l-22-28M66 12l-8 10 18 2"/>`),
    botella: S(`<path d="M86 20h28v30q22 14 22 44v84q0 8-8 8H72q-8 0-8-8V94q0-30 22-44z"/><path d="M86 34h28"/><rect x="70" y="104" width="60" height="46" rx="4"/><path d="M84 118h32M84 132h20" stroke-width="4"/>`),
    canasta: S(`<path d="M40 98h120l-14 82H54z"/><path d="M34 98h132"/><path d="M66 98V54q0-8 6-12V28h10v14q6 4 6 12v44"/><path d="M96 98V44q0-8 6-12V18h10v14q6 4 6 12v54"/><path d="M126 98V58q0-8 6-12V34h10v12q6 4 6 12v40"/><path d="M58 126h84M62 154h76" stroke-width="4"/>`),
    mezcal: S(`<path d="M60 70h60l-8 104H68z"/><path d="M64 110h52" stroke-width="4"/><path d="M128 120a34 34 0 0 1 56 0z"/><path d="M156 120v-24M136 104l20 16 20-16" stroke-width="3"/><path d="M70 52q20-30 40 0" stroke-width="4"/><circle cx="90" cy="38" r="5"/>`),
    arrachera: S(`<path d="M34 104q0-40 52-46 40-6 72 14 20 14 10 42-12 30-64 30-70 0-70-40z"/><path d="M60 92l60 50M84 80l64 52M108 72l46 38" stroke-width="5"/><circle cx="64" cy="124" r="10"/>`),
    cerveza: S(`<path d="M50 62h84v108q0 8-8 8H58q-8 0-8-8z"/><path d="M134 82h18q14 0 14 14v34q0 14-14 14h-18"/><path d="M46 62q-6-24 18-26 6-18 28-12 16-14 34 0 24-2 22 22 12 6 6 16"/><path d="M72 88v70M92 88v70M112 88v70" stroke-width="4"/>`),
    pastel: S(`<rect x="40" y="110" width="120" height="66" rx="6"/><rect x="58" y="72" width="84" height="38" rx="6"/><path d="M40 138q20 14 40 0t40 0 40 0"/><path d="M80 72V52M100 72V48M120 72V52"/><path d="M80 44q-6-8 0-14 6 6 0 14M100 40q-6-8 0-14 6 6 0 14M120 44q-6-8 0-14 6 6 0 14" stroke-width="4"/>`),
    caballito: S(`<path d="M40 70h50l-7 100H47z"/><path d="M110 70h50l-7 100h-36z"/><path d="M46 104h38M116 104h38" stroke-width="4"/><path d="M58 46l7 12M100 30v16M142 46l-7 12" stroke-width="5"/>`),
    reloj: S(`<circle cx="100" cy="100" r="70"/><path d="M100 56v44l30 20"/><path d="M100 30v8M100 162v8M30 100h8M162 100h8" stroke-width="5"/>`),
    pin: S(`<path d="M100 178s-56-56-56-98a56 56 0 0 1 112 0c0 42-56 98-56 98z"/><circle cx="100" cy="80" r="20"/>`),
    tv: S(`<rect x="26" y="44" width="148" height="100" rx="8"/><path d="M76 170h48M100 144v26"/><circle cx="100" cy="94" r="28"/><path d="M100 66l10 18-10 12-10-12zM80 106l10-10M120 106l-10-10M100 96v26" stroke-width="4"/>`),
    esfera: S(`<circle cx="100" cy="112" r="58"/><rect x="86" y="40" width="28" height="16" rx="3"/><path d="M100 40q-14-22 4-26"/><path d="M46 100q54 22 108 0M50 134q50 18 100 0" stroke-width="4"/><path d="M86 82l6 6-6 6-6-6zM122 120l6 6-6 6-6-6z" stroke-width="3"/>`),
    whatsapp: S(`<path d="M100 28a72 72 0 0 0-62 108l-10 38 40-10a72 72 0 1 0 32-136z"/><path d="M76 70q-6 6-2 20 10 26 36 36 14 4 20-2l4-10-16-8-8 8q-16-6-24-24l8-8-8-16z" stroke-width="5"/>`),
    estrella: S(`<path d="M100 22l14 50 50 14-50 14-14 50-14-50-50-14 50-14z"/><path d="M160 136l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" stroke-width="4"/>`),
    calendario: S(`<rect x="32" y="44" width="136" height="128" rx="10"/><path d="M32 80h136M70 28v30M130 28v30"/><path d="M60 108h16M92 108h16M124 108h16M60 140h16M92 140h16" stroke-width="5"/>`),
    uvas: S(`<circle cx="70" cy="70" r="14"/><circle cx="100" cy="70" r="14"/><circle cx="130" cy="70" r="14"/><circle cx="85" cy="96" r="14"/><circle cx="115" cy="96" r="14"/><circle cx="100" cy="122" r="14"/><path d="M100 56V30q12-8 22-2"/>`),
  };

  // Papel picado: banderitas con recortes (máscara), colgadas de un hilo
  const papel = (n = 9, w = 1080, h = 150, colors = ["#D3AD6E", "#F6EFE2"]) => {
    const fw = w / n, id = "pp" + Math.random().toString(36).slice(2, 7);
    let flags = "", masks = "";
    for (let i = 0; i < n; i++) {
      const x = i * fw + 6, fwi = fw - 12, mid = x + fwi / 2, c = colors[i % colors.length];
      const zig = Array.from({ length: 9 }, (_, k) => `${x + (fwi * k) / 8},${h - (k % 2 ? 14 : 0)}`).join(" ");
      masks += `<mask id="${id}${i}"><rect x="${x}" y="16" width="${fwi}" height="${h}" fill="#fff"/>
        <circle cx="${mid}" cy="${h * 0.5}" r="${fwi * 0.16}" fill="#000"/>
        <path d="M${mid} ${h * 0.24}l${fwi * 0.08} ${fwi * 0.08} -${fwi * 0.08} ${fwi * 0.08} -${fwi * 0.08} -${fwi * 0.08}z" fill="#000"/>
        <path d="M${mid} ${h * 0.62}l${fwi * 0.1} ${fwi * 0.12} -${fwi * 0.1} ${fwi * 0.12} -${fwi * 0.1} -${fwi * 0.12}z" fill="#000"/>
        <circle cx="${x + fwi * 0.2}" cy="${h * 0.38}" r="${fwi * 0.05}" fill="#000"/><circle cx="${x + fwi * 0.8}" cy="${h * 0.38}" r="${fwi * 0.05}" fill="#000"/>
        <circle cx="${x + fwi * 0.2}" cy="${h * 0.7}" r="${fwi * 0.05}" fill="#000"/><circle cx="${x + fwi * 0.8}" cy="${h * 0.7}" r="${fwi * 0.05}" fill="#000"/>
      </mask>`;
      flags += `<polygon class="pp-flag" style="--i:${i}" points="${x},16 ${x + fwi},16 ${zig.split(" ").reverse().join(" ")}" fill="${c}" mask="url(#${id}${i})"/>`;
    }
    return `<svg class="papel" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs>${masks}</defs><path d="M0 14 Q${w / 2} 26 ${w} 14" stroke="#D3AD6E" stroke-width="3" fill="none"/>${flags}</svg>`;
  };

  const cross = `<svg viewBox="0 0 40 60" fill="currentColor" aria-hidden="true"><path d="M17 0h6v12h9v6h-9v42h-6V18H8v-6h9z"/><circle cx="20" cy="3" r="3"/><circle cx="34" cy="15" r="3"/><circle cx="6" cy="15" r="3"/><circle cx="20" cy="58" r="3"/></svg>`;

  return { ICONS, papel, cross };
})();
