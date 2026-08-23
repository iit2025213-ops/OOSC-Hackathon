import fs from 'fs';
const central = JSON.parse(fs.readFileSync(new URL('./centralscheme.json', import.meta.url)));
const scheme = central[0];

console.log('--- RAW JSON SNAPSHOT (First 1000 chars) ---');
console.log(JSON.stringify(scheme, null, 2).substring(0, 1000));
console.log('...\n[Output truncated]');
