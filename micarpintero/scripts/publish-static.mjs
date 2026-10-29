// Copies the static export (out/) next to the sources so GitHub Pages serves
// the app at /micarpintero/, like the other sites in this repository.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'out');
if (!existsSync(join(out, 'index.html'))) {
  console.error('out/index.html not found: run `npm run build` first.');
  process.exit(1);
}

const published = ['index.html', '_next', 'icon.svg', 'pdf.worker.min.mjs', 'og.png'];
for (const entry of published) rmSync(join(root, entry), { recursive: true, force: true });
for (const entry of published) {
  if (existsSync(join(out, entry))) cpSync(join(out, entry), join(root, entry), { recursive: true });
}
console.log(`Published ${published.filter((e) => existsSync(join(root, e))).join(', ')}`);
