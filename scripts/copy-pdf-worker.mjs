// Copia o worker do pdfjs-dist pra public/ como asset estático simples (servido same-origin,
// exigido pela nossa CSP script-src 'self'). Não podemos deixar o Next/webpack empacotar esse
// arquivo via import.meta.url — o Terser (etapa de minificação do build) quebra com
// "import.meta cannot be used outside of module code" ao tentar processar o .mjs do worker.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const destDir = join(__dirname, '..', 'public');
const dest = join(destDir, 'pdf.worker.min.mjs');

mkdirSync(destDir, { recursive: true });
copyFileSync(source, dest);
console.log(`pdf.worker.min.mjs copiado para ${dest}`);
