import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
if (!index.name || !Array.isArray(index.sources)) throw new Error('Invalid repository index');
const ids = new Set();
for (const source of index.sources) {
  if (!source.id || ids.has(source.id)) throw new Error('Missing or duplicate source id: ' + source.id);
  ids.add(source.id);
  for (const field of ['name', 'version', 'type', 'lang', 'file']) {
    if (!source[field]) throw new Error('Missing ' + field + ' in ' + source.id);
  }
  const file = path.resolve(root, source.file);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) throw new Error('Missing/unsafe provider path: ' + source.file);
  const code = fs.readFileSync(file, 'utf8');
  for (const fn of ['getInfo', 'getHome', 'search', 'getDetail', 'getEpisodes']) {
    if (!new RegExp('function\\s+' + fn + '\\s*\\(').test(code)) {
      throw new Error(source.id + ' does not implement ' + fn);
    }
  }
}
console.log('PASS: index JSON valid; ' + index.sources.length + ' unique providers; all provider files and required entry points exist.');
