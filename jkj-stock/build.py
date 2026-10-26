"""Genera las páginas de JkJ Stock a partir de _plantilla.html.

Cada sección tiene su propia carpeta (perfumes es la página principal, jkj-stock/index.html).
Los productos viven en assets/catalog.js; una sección sin productos muestra "Próximamente".

Uso:  python3 build.py
"""
import html
import json
import re
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent

SECTIONS = [
    dict(slug='perfumes', path='', name='Perfumes', icon='sparkles', noun='fragancia', nouns='fragancias',
         genders=True, hero='le-labo-santal-33,lattafa-khamrah-100ml,xerjoff-erba-gold',
         title='JkJ Stock · Perfumes de diseñador y árabes',
         description='JkJ Stock: catálogo de perfumes de diseñador y árabes. Elige tus fragancias y haz tu pedido directo por WhatsApp.',
         h1='Tu firma,<br /><em class="text-bronze">en una fragancia.</em>',
         lead='Perfumes de diseñador y árabes en un solo catálogo. Arma tu pedido en segundos y confírmalo directo por WhatsApp.',
         search='Buscar perfume o marca', stat='Fragancias'),
    dict(slug='apple', name='Apple', icon='smartphone', noun='producto', nouns='productos',
         title='JkJ Stock · Apple',
         description='Productos Apple originales en JkJ Stock. Muy pronto; pregunta por WhatsApp.',
         h1='Apple original,<br /><em class="text-bronze">muy pronto.</em>',
         lead='Estamos preparando una sección de productos Apple originales. Escríbenos por WhatsApp para enterarte primero.',
         search='Buscar producto Apple', stat='Productos'),
]


def load_catalog():
    src = (HERE / 'assets' / 'catalog.js').read_text(encoding='utf-8')
    return json.loads(src[src.index('['):src.rindex(']') + 1])


def href(target, current):
    """Ruta relativa de la sección `current` a la sección `target`."""
    up = '../' if current.get('path', current['slug']) else ''
    path = target.get('path', target['slug'])
    return f'{up}{path}/' if path else (up or './')


def nav(current, counts):
    desktop, mobile, footer = [], [], []
    for s in SECTIONS:
        link = href(s, current)
        here = ' aria-current="page"' if s is current else ''
        soon = '' if counts.get(s['slug']) else ' <span class="ml-1 rounded-full bg-black/5 px-1.5 py-0.5 align-middle text-[0.55rem] font-extrabold uppercase tracking-wider text-ink-mute">Pronto</span>'
        active = ' text-ink' if s is current else ''
        desktop.append(f'          <li><a class="nav-link hover:text-ink{active}" href="{link}"{here}>{s["name"]}</a></li>')
        mobile.append(f'          <li><a class="flex items-center justify-between py-4" href="{link}"{here}>{s["name"]}{soon.replace("ml-1", "ml-2 font-sans")} <i data-lucide="arrow-up-right" class="ml-auto h-5 w-5 text-bronze"></i></a></li>')
        footer.append(f'              <li><a href="{link}" class="hover:text-ink">{s["name"]}</a></li>')
    return '\n'.join(desktop), '\n'.join(mobile), '\n'.join(footer)


def main():
    template = (HERE / '_plantilla.html').read_text(encoding='utf-8')
    counts = {}
    for p in load_catalog():
        counts[p['section']] = counts.get(p['section'], 0) + 1
    for s in SECTIONS:
        path = s.get('path', s['slug'])
        root = '../' if path else ''
        nav_desktop, nav_mobile, nav_footer = nav(s, counts)
        values = {
            'slug': s['slug'], 'root': root, 'home': href(SECTIONS[0], s),
            'title': html.escape(s['title']), 'description': html.escape(s['description']),
            'name': s['name'], 'name_lower': s['name'].lower(), 'icon': s['icon'],
            'noun': s['noun'], 'nouns': s['nouns'], 'hero': s.get('hero', ''),
            'h1': s['h1'], 'lead': s['lead'], 'search_ph': s['search'], 'stat_label': s['stat'],
            'gender_hidden': '' if s.get('genders') else 'hidden ',
            'wa_text': quote(f'Hola JkJ Stock, quiero información de la sección {s["name"]}'),
            'nav_desktop': nav_desktop, 'nav_mobile': nav_mobile, 'nav_footer': nav_footer,
        }
        page = re.sub(r'\{\{(\w+)\}\}', lambda m: values[m.group(1)], template)
        out = HERE / path / 'index.html'
        out.parent.mkdir(exist_ok=True)
        out.write_text(page, encoding='utf-8')
        print(f'{out.relative_to(HERE)}: {counts.get(s["slug"], 0)} productos')


if __name__ == '__main__':
    main()
