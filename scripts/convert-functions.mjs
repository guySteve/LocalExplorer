// One-time migration: convert netlify/functions/*.js (CommonJS handler style)
// into ES modules under src/lib/server/legacy/ for use by SvelteKit API routes.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'netlify', 'functions');
const outDir = path.join(__dirname, '..', 'src', 'lib', 'server', 'legacy');

fs.mkdirSync(outDir, { recursive: true });

for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.js'))) {
  let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  content = content.replace(/exports\.handler\s*=/, 'export const handler =');
  fs.writeFileSync(path.join(outDir, file), content);
  console.log('converted', file);
}
